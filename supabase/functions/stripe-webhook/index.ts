import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Create Supabase client with service role for database updates
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get Stripe configuration
    const { data: stripeConfig, error: configError } = await supabaseService
      .from("admin_stripe_config")
      .select("secret_key, is_test_mode")
      .single();

    if (configError || !stripeConfig) {
      throw new Error("Stripe configuration not found");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeConfig.secret_key, {
      apiVersion: "2023-10-16",
    });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      throw new Error("No signature provided");
    }

    let event: Stripe.Event;

    try {
      // Parse the event from Stripe - Em produção você deve verificar a assinatura
      event = JSON.parse(body) as Stripe.Event;
      logStep("Event parsed", { type: event.type, id: event.id });
      
      // Verificar se o evento é válido
      if (!event.id || !event.type) {
        throw new Error("Invalid event structure");
      }
    } catch (err) {
      logStep("Invalid payload", { error: err });
      return new Response("Invalid payload", { status: 400, headers: corsHeaders });
    }

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "invoice.payment_succeeded": {
        logStep("Processing subscription/payment event", { type: event.type });
        
        let customerId: string;
        let subscriptionId: string | null = null;
        let nextPaymentDate: Date | null = null;

        if (event.type === "invoice.payment_succeeded") {
          const invoice = event.data.object as Stripe.Invoice;
          customerId = invoice.customer as string;
          subscriptionId = invoice.subscription as string;

          if (subscriptionId) {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            nextPaymentDate = new Date(subscription.current_period_end * 1000);
            logStep("Invoice payment succeeded", { 
              customerId, 
              subscriptionId, 
              nextPayment: nextPaymentDate.toISOString() 
            });
          }
        } else {
          const subscription = event.data.object as Stripe.Subscription;
          customerId = subscription.customer as string;
          subscriptionId = subscription.id;
          nextPaymentDate = new Date(subscription.current_period_end * 1000);
          logStep("Subscription event", { 
            customerId, 
            subscriptionId, 
            status: subscription.status,
            nextPayment: nextPaymentDate.toISOString() 
          });
        }

        // Get customer details
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted) {
          throw new Error("Customer not found");
        }

        const customerEmail = (customer as Stripe.Customer).email;
        if (!customerEmail) {
          throw new Error("Customer email not found");
        }

        logStep("Customer found", { email: customerEmail });

        // Find user by email in profissional_profiles table
        const { data: profile, error: profileError } = await supabaseService
          .from("profissional_profiles")
          .select("id")
          .eq("email", customerEmail)
          .single();

        if (profileError || !profile) {
          logStep("Profile not found in profissional_profiles", { email: customerEmail });
          
          // Tentar na tabela profiles como fallback
          const { data: fallbackProfile, error: fallbackError } = await supabaseService
            .from("profiles")
            .select("id")
            .eq("email", customerEmail)
            .single();
            
          if (fallbackError || !fallbackProfile) {
            logStep("Profile not found in any table", { email: customerEmail });
            break;
          }
          
          // Usar o profile encontrado na tabela profiles
          profile = fallbackProfile;
        }

        logStep("Profile found", { userId: profile.id });

        // Update or create assinatura
        const { data: assinaturaData, error: updateError } = await supabaseService
          .from("assinaturas")
          .upsert({
            user_id: profile.id,
            status: "ativa",
            stripe_subscription_id: subscriptionId,
            data_vencimento: nextPaymentDate?.toISOString(),
            payment_id: subscriptionId,
            preco: 35.99,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
          .select();

        if (updateError) {
          logStep("Error updating assinatura", { error: updateError });
          throw updateError;
        }

        logStep("Assinatura updated successfully", { assinaturaData });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get customer details
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted) {
          break;
        }

        const customerEmail = (customer as Stripe.Customer).email;
        if (!customerEmail) {
          break;
        }

        // Find user and update subscription to cancelled
        let profile = null;
        
        // Tentar primeiro na tabela profissional_profiles
        const { data: profProfile } = await supabaseService
          .from("profissional_profiles")
          .select("id")
          .eq("email", customerEmail)
          .single();
          
        if (profProfile) {
          profile = profProfile;
        } else {
          // Fallback para tabela profiles
          const { data: fallbackProfile } = await supabaseService
            .from("profiles")
            .select("id")
            .eq("email", customerEmail)
            .single();
          profile = fallbackProfile;
        }

        if (profile) {
          await supabaseService
            .from("assinaturas")
            .update({
              status: "cancelada",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", profile.id);

          logStep("Subscription cancelled", { userId: profile.id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});