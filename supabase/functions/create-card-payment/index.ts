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
    console.log('🚀 create-card-payment function started')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('✅ Supabase client created')

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    console.log('🔍 User authentication check:', { userId: user?.id, error: authError?.message })

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      throw new Error('Não autorizado')
    }

    const { agendamento_id, owner_id, payment_amount } = await req.json()
    console.log('📝 Request data:', { agendamento_id, owner_id, payment_amount })

    if (!agendamento_id || !owner_id || !payment_amount) {
      throw new Error('Parâmetros obrigatórios: agendamento_id, owner_id, payment_amount')
    }

    console.log('🔍 Criando preference para pagamento com cartão...')
    console.log('Agendamento ID:', agendamento_id)
    console.log('Owner ID:', owner_id)
    console.log('Valor:', payment_amount)

    // Buscar configuração do Mercado Pago do admin
    const { data: mpConfig, error: mpError } = await supabase
      .from('admin_mercado_pago_config')
      .select('access_token, public_key, is_test_mode')
      .single()

    if (mpError || !mpConfig) {
      console.error('❌ Configuração do Mercado Pago não encontrada:', mpError)
      throw new Error('Configuração do Mercado Pago não encontrada')
    }

    console.log('✅ Configuração MP encontrada, modo teste:', mpConfig.is_test_mode)

    // Buscar dados do agendamento
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select(`
        *,
        servicos:servico_id(nome),
        profissionais:profissional_id(nome),
        clientes:cliente_id(nome, email)
      `)
      .eq('id', agendamento_id)
      .single()

    if (agendamentoError || !agendamento) {
      console.error('❌ Agendamento não encontrado:', agendamentoError)
      throw new Error('Agendamento não encontrado')
    }

    console.log('✅ Agendamento encontrado:', agendamento.id)

    // Verificar se é pacote mensal
    const isPacoteMensal = agendamento.observacoes?.includes('PACOTE MENSAL')
    
    // Montar descrição
    let title = isPacoteMensal 
      ? `Pacote Mensal - ${agendamento.servicos?.nome || 'Serviço'}`
      : agendamento.servicos?.nome || 'Serviço'
    
    let description = isPacoteMensal
      ? `Pagamento do pacote mensal - ${agendamento.profissionais?.nome || 'Profissional'}`
      : `Agendamento - ${agendamento.profissionais?.nome || 'Profissional'}`

    console.log('📋 Dados do produto:', { title, description, isPacoteMensal })

    // Verificar se já existe um pagamento pendente para este agendamento
    console.log('🔍 Verificando pagamentos existentes...')
    const { data: existingPayments } = await supabase
      .from('pagamentos')
      .select('id, status')
      .eq('agendamento_id', agendamento_id)
      .eq('status', 'pendente')
    
    let pagamento;
    
    if (existingPayments && existingPayments.length > 0) {
      console.log('✅ Usando pagamento existente:', existingPayments[0].id)
      pagamento = existingPayments[0];
    } else {
      // Criar novo registro de pagamento
      console.log('💾 Criando novo registro de pagamento...')
      const { data: newPayment, error: pagamentoError } = await supabase
        .from('pagamentos')
        .insert({
          agendamento_id: agendamento_id,
          valor: payment_amount,
          percentual: isPacoteMensal ? 100 : 50,
          status: 'pendente',
          user_id: owner_id,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
        })
        .select('id')
        .single()

      if (pagamentoError) {
        console.error('❌ Erro ao criar pagamento:', pagamentoError)
        throw new Error('Erro ao criar registro de pagamento')
      }
      
      pagamento = newPayment;
      console.log('✅ Novo registro de pagamento criado:', pagamento.id)
    }

    // Criar preference no Mercado Pago
    const origin = req.headers.get('origin') || 'https://vncehdqqbasjdcszktna.lovableproject.com'
    
    const preference = {
      items: [
        {
          title: title,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(payment_amount)
        }
      ],
      payment_methods: {
        excluded_payment_methods: [
          { id: 'pix' }
        ],
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'bank_transfer' }
        ]
      },
      back_urls: {
        success: `${origin}/agendamento?owner=${owner_id}&payment=success`,
        failure: `${origin}/agendamento?owner=${owner_id}&payment=failure`,
        pending: `${origin}/agendamento?owner=${owner_id}&payment=pending`
      },
      auto_return: 'approved',
      external_reference: agendamento_id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercado-pago-webhook`
    }

    console.log('📝 Preference que será enviada:', JSON.stringify(preference, null, 2))

    // Fazer requisição para API do Mercado Pago
    const mpApiUrl = 'https://api.mercadopago.com/checkout/preferences'

    console.log('🌐 Chamando API do Mercado Pago...')
    console.log('🔑 Access Token prefix:', mpConfig.access_token.substring(0, 20) + '...')
    console.log('🔄 Is Test Mode:', mpConfig.is_test_mode)
    
    const mpResponse = await fetch(mpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpConfig.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    })

    console.log('📊 MP Response Status:', mpResponse.status)
    console.log('📊 MP Response Headers:', Object.fromEntries(mpResponse.headers.entries()))
    
    if (!mpResponse.ok) {
      const errorText = await mpResponse.text()
      console.error('❌ Erro na API do Mercado Pago:', {
        status: mpResponse.status,
        statusText: mpResponse.statusText,
        errorText: errorText,
        headers: Object.fromEntries(mpResponse.headers.entries())
      })
      throw new Error(`Erro na API do Mercado Pago: ${mpResponse.status} - ${errorText}`)
    }

    const mpData = await mpResponse.json()
    console.log('✅ Preference criada com sucesso:', mpData.id)

    // Atualizar pagamento com preference_id
    const { error: updateError } = await supabase
      .from('pagamentos')
      .update({ 
        preference_id: mpData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', pagamento.id)

    if (updateError) {
      console.error('❌ Erro ao atualizar pagamento:', updateError)
    } else {
      console.log('✅ Pagamento atualizado com preference_id')
    }

    return new Response(JSON.stringify({
      preference_id: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      public_key: mpConfig.public_key,
      is_test_mode: mpConfig.is_test_mode
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erro:', error.message)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})