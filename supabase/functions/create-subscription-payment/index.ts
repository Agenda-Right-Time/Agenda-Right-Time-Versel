
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verificar autenticação do profissional
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      throw new Error('Unauthorized')
    }

    const { subscription_id } = await req.json()
    console.log('🎯 Creating payment for subscription ID:', subscription_id)

    if (!subscription_id) {
      throw new Error('Subscription ID is required')
    }

    // Buscar assinatura do profissional
    const { data: subscription, error: subError } = await supabaseClient
      .from('assinaturas')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      console.error('❌ Subscription not found:', subError)
      throw new Error('Subscription not found')
    }

    console.log('✅ Subscription found:', subscription.id)

    // IMPORTANTE: Buscar configuração ADMIN do Mercado Pago (não do profissional individual)
    console.log('🔍 Buscando configuração ADMIN do Mercado Pago para receber mensalidades...')
    const { data: adminMpConfig, error: configError } = await supabaseClient
      .from('admin_mercado_pago_config')
      .select('access_token, webhook_url')
      .single()

    if (configError || !adminMpConfig?.access_token) {
      console.error('❌ Admin Mercado Pago config not found:', configError)
      throw new Error('Configuração ADMIN do Mercado Pago não encontrada. Configure na dashboard admin primeiro.')
    }

    console.log('✅ Admin config found - Esta conta receberá as mensalidades dos profissionais')

    // Criar preferência no Mercado Pago usando a CONTA ADMIN (não a do profissional)
    const preference = {
      items: [
        {
          title: "Right Time - Mensalidade Profissional",
          description: `Mensalidade do plano premium - Profissional: ${user.email}`,
          quantity: 1,
          unit_price: Number(subscription.preco),
          currency_id: "BRL"
        }
      ],
      payment_methods: {
        excluded_payment_types: [
          { id: "bank_transfer" }
        ],
        excluded_payment_methods: [
          { id: "bolbradesco" }
        ],
        installments: 12
      },
      back_urls: {
        success: `https://vncehdqqbasjdcszktna.supabase.co/dashboard?payment=success`,
        failure: `https://vncehdqqbasjdcszktna.supabase.co/dashboard?payment=failure`,
        pending: `https://vncehdqqbasjdcszktna.supabase.co/dashboard?payment=pending`
      },
      auto_return: "approved",
      external_reference: `subscription_${subscription.id}`,
      notification_url: adminMpConfig.webhook_url || `https://vncehdqqbasjdcszktna.supabase.co/functions/v1/mercado-pago-webhook`,
      metadata: {
        subscription_id: subscription.id,
        professional_user_id: user.id,
        professional_email: user.email,
        type: 'subscription',
        plan: 'premium',
        payment_destination: 'admin_account'
      }
    }

    console.log('📋 Creating preference with ADMIN account (not professional account):', {
      external_reference: preference.external_reference,
      amount: preference.items[0].unit_price,
      notification_url: preference.notification_url,
      professional_email: user.email
    })

    // Usar ACCESS TOKEN da conta ADMIN para criar a preferência
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminMpConfig.access_token}`, // CONTA ADMIN
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    })

    const responseText = await mpResponse.text()
    console.log('🔄 Mercado Pago response status:', mpResponse.status)
    console.log('📄 Mercado Pago response:', responseText)

    if (!mpResponse.ok) {
      console.error('❌ Mercado Pago error:', responseText)
      throw new Error(`Failed to create payment preference: ${responseText}`)
    }

    const mpData = JSON.parse(responseText)
    console.log('✅ Mercado Pago preference created with ADMIN account:', mpData.id)
    console.log('💰 Payment will be received by ADMIN account, not professional account')

    // Atualizar assinatura com preference_id
    const { error: updateError } = await supabaseClient
      .from('assinaturas')
      .update({ 
        preference_id: mpData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError)
    } else {
      console.log('✅ Subscription updated with preference_id:', mpData.id)
    }

    return new Response(JSON.stringify({
      preference_id: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      message: 'Pagamento será processado pela conta ADMIN'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
