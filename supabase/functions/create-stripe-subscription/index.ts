import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 create-stripe-subscription function started");

    // Criar cliente Supabase com service role para acessar configuração admin
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar configuração admin do Stripe
    console.log("🔍 Buscando configuração Stripe admin...");
    const { data: stripeConfig, error: configError } = await supabaseService
      .from('admin_stripe_config')
      .select('secret_key, publishable_key, is_test_mode')
      .single();

    if (configError || !stripeConfig) {
      console.error("❌ Configuração Stripe não encontrada:", configError);
      throw new Error("Configuração Stripe não encontrada no sistema");
    }

    console.log("✅ Configuração Stripe encontrada, modo teste:", stripeConfig.is_test_mode);

    // Inicializar Stripe com a chave da configuração admin
    const stripe = new Stripe(stripeConfig.secret_key, {
      apiVersion: "2023-10-16",
    });

    // Obter dados da requisição
    const { email, subscriptionId, isSignup } = await req.json();
    
    if (!email) {
      throw new Error("Email é obrigatório");
    }

    console.log("📧 Email do profissional:", email);
    console.log("🆔 ID da assinatura:", subscriptionId);

    // Verificar se já existe um customer Stripe para este email
    console.log("🔍 Verificando customer existente...");
    const customers = await stripe.customers.list({ 
      email: email.trim(), 
      limit: 1 
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("✅ Customer existente encontrado:", customerId);
    } else {
      console.log("➕ Criando novo customer...");
      const customer = await stripe.customers.create({
        email: email.trim(),
        metadata: {
          subscription_id: subscriptionId || '',
          created_by: 'agenda_right_time'
        }
      });
      customerId = customer.id;
      console.log("✅ Novo customer criado:", customerId);
    }

    // Criar sessão de checkout para subscription recorrente
    console.log("🛒 Criando sessão de checkout...");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Agenda Right Time - Assinatura Mensal',
              description: 'Plano completo com agendamentos ilimitados',
            },
            unit_amount: 3599, // R$ 35,99 em centavos
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get("origin")}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/dashboard?payment=cancelled`,
      metadata: {
        subscription_id: subscriptionId || '',
        professional_email: email,
        created_by: 'agenda_right_time'
      },
      subscription_data: {
        metadata: {
          subscription_id: subscriptionId || '',
          professional_email: email
        }
      }
    });

    console.log("✅ Sessão de checkout criada:", session.id);
    console.log("🔗 URL do checkout:", session.url);

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Erro na função create-stripe-subscription:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno do servidor"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});