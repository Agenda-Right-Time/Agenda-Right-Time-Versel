import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role key for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create a client with anon key to verify user
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) {
      logStep("Authentication error", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const requestBody = await req.json();
    const { email, subscriptionId } = requestBody;
    const customerEmail = email || user.email;

    logStep("Request data", { customerEmail, subscriptionId });

    // Get Stripe configuration from admin table
    const { data: stripeConfig, error: configError } = await supabaseService
      .from('admin_stripe_config')
      .select('secret_key, publishable_key, is_test_mode')
      .single();

    if (configError) {
      logStep("Error fetching Stripe config", { error: configError.message });
      throw new Error(`Erro ao buscar configuração Stripe: ${configError.message}`);
    }

    if (!stripeConfig?.secret_key) {
      throw new Error("Chave secreta do Stripe não configurada");
    }

    logStep("Stripe config found", { 
      hasSecretKey: !!stripeConfig.secret_key,
      isTestMode: stripeConfig.is_test_mode 
    });

    // Initialize Stripe
    const stripe = new Stripe(stripeConfig.secret_key, {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists in Stripe
    logStep("Checking for existing Stripe customer", { email: customerEmail });
    const customers = await stripe.customers.list({ 
      email: customerEmail, 
      limit: 1 
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new customer
      logStep("Creating new Stripe customer", { email: customerEmail });
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: user.user_metadata?.nome || customerEmail.split('@')[0],
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // First create a product for the subscription
    logStep("Creating Stripe product");
    const product = await stripe.products.create({
      name: "Plano Right Time",
    });

    // Then create a price for the product
    logStep("Creating Stripe price");
    const price = await stripe.prices.create({
      currency: "brl",
      unit_amount: 3599, // R$ 35,99
      recurring: {
        interval: "month",
      },
      product: product.id,
    });

    // Now create subscription using the price ID
    logStep("Creating Stripe subscription");
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: price.id,
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        user_id: user.id,
        subscription_id: subscriptionId || "",
        user_email: user.email,
      },
    });

    logStep("Stripe subscription created", { subscriptionId: subscription.id });

    // Extract payment intent from subscription
    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent;

    if (!paymentIntent?.client_secret) {
      logStep("ERROR: No payment intent client secret found");
      throw new Error("Falha ao criar payment intent - client_secret não encontrado");
    }

    logStep("Payment intent extracted", { 
      paymentIntentId: paymentIntent.id,
      hasClientSecret: !!paymentIntent.client_secret 
    });

    // Update or create subscription in database using service role
    try {
      const { error: dbError } = await supabaseService
        .from('assinaturas')
        .upsert({
          user_id: user.id,
          status: 'pendente',
          payment_id: paymentIntent.id,
          stripe_subscription_id: subscription.id,
          preco: 35.99,
          data_inicio: new Date().toISOString(),
          data_vencimento: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (dbError) {
        logStep("Database update error (non-critical)", { error: dbError.message });
        // Não falhar por erro de database, só logar - o webhook do Stripe vai atualizar depois
      } else {
        logStep("Database updated successfully");
      }
    } catch (dbUpdateError) {
      logStep("Database update failed (non-critical)", { error: dbUpdateError });
      // Continue anyway - webhook will handle it
    }

    logStep("Returning success response");

    return new Response(JSON.stringify({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      customerId: customerId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logStep("ERROR in create-payment-intent", { 
      message: errorMessage,
      stack: errorStack 
    });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: errorStack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});