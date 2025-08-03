import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-STRIPE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase client with service role for database updates
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create client for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get Stripe configuration
    const { data: stripeConfig, error: configError } = await supabaseService
      .from("admin_stripe_config")
      .select("secret_key, is_test_mode")
      .single();

    if (configError || !stripeConfig) {
      throw new Error("Stripe configuration not found");
    }
    logStep("Stripe config found", { isTestMode: stripeConfig.is_test_mode });

    // Initialize Stripe
    const stripe = new Stripe(stripeConfig.secret_key, {
      apiVersion: "2023-10-16",
    });

    // Find Stripe customer
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Nenhum cliente encontrado no Stripe" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId });

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Nenhuma assinatura ativa encontrada no Stripe" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const subscription = subscriptions.data[0];
    const nextPaymentDate = new Date(subscription.current_period_end * 1000);
    logStep("Active subscription found", { 
      subscriptionId: subscription.id, 
      nextPayment: nextPaymentDate.toISOString() 
    });

    // Update or create assinatura in Supabase
    const { data: assinaturaData, error: updateError } = await supabaseService
      .from("assinaturas")
      .upsert({
        user_id: user.id,
        status: "ativa",
        data_vencimento: nextPaymentDate.toISOString(),
        payment_id: subscription.id,
        updated_at: new Date().toISOString(),
        preco: 35.99
      })
      .eq("user_id", user.id)
      .select();

    if (updateError) {
      logStep("Error updating assinatura", { error: updateError });
      throw new Error(`Erro ao atualizar assinatura: ${updateError.message}`);
    }

    logStep("Assinatura updated successfully", { assinaturaData });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Assinatura sincronizada com sucesso!",
      subscription: {
        status: "ativa",
        nextPayment: nextPaymentDate.toISOString(),
        stripeSubscriptionId: subscription.id
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});