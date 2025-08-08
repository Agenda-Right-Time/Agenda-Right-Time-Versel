import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { amount, description, userId, agendamentoId } = await req.json()
    console.log('🎯 Criando preferência PIX com external_reference:', { amount, description, userId, agendamentoId })

    if (!amount || !userId || !agendamentoId) {
      return new Response(JSON.stringify({ error: 'amount, userId e agendamentoId são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Buscar configuração do Mercado Pago do usuário
    const { data: config, error: configError } = await supabaseClient
      .from('configuracoes')
      .select('mercado_pago_access_token, mercado_pago_public_key')
      .eq('user_id', userId)
      .single()

    if (configError || !config?.mercado_pago_access_token) {
      console.log('❌ Configuração do Mercado Pago não encontrada para o usuário')
      return new Response(JSON.stringify({ 
        error: 'Configuração do Mercado Pago não encontrada',
        details: 'Configure suas credenciais do Mercado Pago para receber pagamentos PIX'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const accessToken = config.mercado_pago_access_token

    // Buscar dados do estabelecimento
    const { data: profile } = await supabaseClient
      .from('profissional_profiles')
      .select('nome, empresa, email')
      .eq('id', userId)
      .single()

    const merchantName = profile?.empresa || profile?.nome || 'PRESTADOR SERVICOS'

    console.log('🏪 Dados do comerciante:', { merchantName, email: profile?.email })

    // Criar preferência no Mercado Pago com external_reference
    const preferenceData = {
      items: [
        {
          title: description,
          quantity: 1,
          unit_price: Number(amount),
          currency_id: 'BRL'
        }
      ],
      external_reference: agendamentoId, // ⚡ CRÍTICO: Garantir referência ao agendamento
      payment_methods: {
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' }
        ],
        excluded_payment_methods: [],
        installments: 1
      },
      metadata: {
        agendamento_id: agendamentoId,
        user_id: userId,
        created_via: 'simple_pix_generator'
      },
      payer: {
        email: profile?.email || 'cliente@example.com'
      },
      notification_url: 'https://vncehdqqbasjdcszktna.supabase.co/functions/v1/mercado-pago-webhook',
      binary_mode: true
    }

    console.log('📋 Dados da preferência:', preferenceData)

    const createPreferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    })

    if (!createPreferenceResponse.ok) {
      const errorText = await createPreferenceResponse.text()
      console.error('❌ Erro ao criar preferência MP:', errorText)
      
      return new Response(JSON.stringify({ 
        error: 'Erro ao criar preferência no Mercado Pago',
        details: errorText
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const preferenceResult = await createPreferenceResponse.json()
    console.log('✅ Preferência criada:', preferenceResult.id)

    // Gerar QR Code PIX usando a preferência
    const qrResponse = await fetch(`https://api.mercadopago.com/checkout/preferences/${preferenceResult.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text()
      console.error('❌ Erro ao buscar dados da preferência:', errorText)
      
      return new Response(JSON.stringify({ 
        error: 'Erro ao gerar código PIX',
        details: errorText
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const qrData = await qrResponse.json()
    
    // O PIX code está no campo de pagamento via PIX
    let pixCode = null
    
    // Tentar extrair o código PIX da resposta
    if (qrData.payment_methods?.pix) {
      // Se tem campo PIX direto
      pixCode = qrData.payment_methods.pix.qr_code
    } else {
      // Buscar via endpoint específico do PIX
      const pixResponse = await fetch(`https://api.mercadopago.com/checkout/preferences/${preferenceResult.id}/payment_methods/pix`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (pixResponse.ok) {
        const pixResponseData = await pixResponse.json()
        pixCode = pixResponseData.qr_code || pixResponseData.qr_code_base64
      }
    }

    // Se não conseguiu extrair o PIX válido, gerar via payment direto
    if (!pixCode) {
      console.log('🔄 Tentando gerar PIX via pagamento direto...')
      
      const directPaymentData = {
        transaction_amount: Number(amount),
        description: description,
        payment_method_id: 'pix',
        external_reference: agendamentoId,
        metadata: {
          agendamento_id: agendamentoId,
          user_id: userId
        },
        payer: {
          email: profile?.email || 'cliente@example.com'
        }
      }

      const directPaymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `pix-${agendamentoId}-${Date.now()}`
        },
        body: JSON.stringify(directPaymentData)
      })

      if (directPaymentResponse.ok) {
        const directPaymentResult = await directPaymentResponse.json()
        console.log('✅ Pagamento PIX direto criado:', directPaymentResult.id)
        console.log('📱 Dados do PIX:', directPaymentResult.point_of_interaction?.transaction_data)
        
        // Extrair código PIX válido do resultado
        pixCode = directPaymentResult.point_of_interaction?.transaction_data?.qr_code
        
        if (!pixCode) {
          // Tentar qr_code_base64 como fallback
          pixCode = directPaymentResult.point_of_interaction?.transaction_data?.qr_code_base64
        }
        
        console.log('🎯 Código PIX extraído:', pixCode ? 'PIX válido encontrado' : 'PIX não encontrado')
      }
    }

    if (!pixCode) {
      console.error('❌ Não foi possível gerar código PIX')
      return new Response(JSON.stringify({ 
        error: 'Não foi possível gerar código PIX',
        details: 'Mercado Pago não retornou código PIX válido'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Código PIX gerado com external_reference!')
    console.log('🎯 Preference ID:', preferenceResult.id)
    console.log('🎯 External Reference:', agendamentoId)

    // 🔥 CRÍTICO: Salvar preference_id na tabela pagamentos para busca posterior
    const { error: updateError } = await supabaseClient
      .from('pagamentos')
      .update({ 
        preference_id: preferenceResult.id,
        pix_code: pixCode
      })
      .eq('agendamento_id', agendamentoId)
      .eq('status', 'pendente')

    if (updateError) {
      console.error('⚠️ Erro ao salvar preference_id no banco:', updateError)
    } else {
      console.log('✅ Preference ID salvo no banco para busca no MP API')
    }

    return new Response(JSON.stringify({ 
      pixCode: pixCode,
      preferenceId: preferenceResult.id,
      externalReference: agendamentoId,
      message: 'PIX gerado com sucesso via Mercado Pago'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erro ao criar preferência PIX:', error)
    return new Response(JSON.stringify({ 
      error: 'Erro interno ao criar preferência PIX',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})