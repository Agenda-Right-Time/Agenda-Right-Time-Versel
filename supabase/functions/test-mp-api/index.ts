import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🧪 Testando API do Mercado Pago...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar configuração do Mercado Pago
    const { data: mpConfig, error: mpError } = await supabase
      .from('admin_mercado_pago_config')
      .select('access_token, public_key, is_test_mode')
      .single()

    if (mpError || !mpConfig) {
      throw new Error('Configuração do Mercado Pago não encontrada')
    }

    console.log('✅ Token MP encontrado, teste mode:', mpConfig.is_test_mode)

    // Criar uma preference simples para teste
    const testPreference = {
      items: [
        {
          title: "Teste de Pagamento",
          description: "Teste da API do Mercado Pago",
          quantity: 1,
          currency_id: "BRL",
          unit_price: 10.00
        }
      ],
      payment_methods: {
        excluded_payment_methods: [
          { id: "pix" }
        ],
        excluded_payment_types: [
          { id: "ticket" },
          { id: "bank_transfer" }
        ]
      },
      back_urls: {
        success: "https://example.com/success",
        failure: "https://example.com/failure",
        pending: "https://example.com/pending"
      },
      auto_return: "approved",
      external_reference: "test-12345"
    }

    console.log('📝 Testando preference:', JSON.stringify(testPreference, null, 2))

    // Testar API do Mercado Pago
    const mpApiUrl = 'https://api.mercadopago.com/checkout/preferences'
    
    const mpResponse = await fetch(mpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpConfig.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPreference)
    })

    console.log('📊 MP Response Status:', mpResponse.status)
    const responseText = await mpResponse.text()
    console.log('📊 MP Response Body:', responseText)

    if (!mpResponse.ok) {
      return new Response(JSON.stringify({ 
        error: 'Erro na API do Mercado Pago',
        status: mpResponse.status,
        response: responseText,
        config: {
          is_test_mode: mpConfig.is_test_mode,
          token_prefix: mpConfig.access_token.substring(0, 20) + '...'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const mpData = JSON.parse(responseText)
    
    return new Response(JSON.stringify({
      success: true,
      preference_id: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      is_test_mode: mpConfig.is_test_mode
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})