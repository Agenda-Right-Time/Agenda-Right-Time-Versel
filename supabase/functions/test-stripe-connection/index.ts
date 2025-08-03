import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 test-stripe-connection function started");

    const { secret_key } = await req.json();
    
    if (!secret_key) {
      throw new Error("Secret key é obrigatória");
    }

    console.log("🔑 Testando conexão com Stripe...");

    // Inicializar Stripe
    const stripe = new Stripe(secret_key, {
      apiVersion: "2023-10-16",
    });

    // Testar a conexão recuperando informações da conta
    const account = await stripe.accounts.retrieve();
    
    console.log("✅ Conexão Stripe bem-sucedida");
    console.log("📊 Conta:", account.display_name || account.business_profile?.name || account.id);

    return new Response(JSON.stringify({ 
      success: true,
      account_name: account.display_name || account.business_profile?.name || account.id,
      account_id: account.id,
      is_test_mode: secret_key.startsWith('sk_test_')
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Erro ao testar conexão Stripe:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Erro interno do servidor"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});