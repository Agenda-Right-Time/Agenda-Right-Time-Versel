import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Iniciando process-card-payment...');
    console.log('📋 Method:', req.method);
    console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));
    
    // Use service role key for database operations (como no Stripe)
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Get user authentication (como no Stripe)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create a client with anon key to verify user (como no Stripe)
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token)
    if (userError) {
      console.error('❌ Authentication error:', userError.message);
      return new Response(
        JSON.stringify({ error: `Authentication error: ${userError.message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const user = userData.user
    if (!user?.email) {
      console.error('❌ User not authenticated or email not available');
      return new Response(
        JSON.stringify({ error: 'User not authenticated or email not available' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('✅ User authenticated:', user.id, user.email);

    // Extrair dados do corpo da requisição
    console.log('📋 Extraindo dados da requisição...');
    let requestBody;
    try {
      requestBody = await req.json()
    } catch (jsonError) {
      console.error('❌ Erro ao fazer parse do JSON:', jsonError);
      return new Response(
        JSON.stringify({ error: 'JSON inválido na requisição' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      agendamento_id, 
      owner_id, 
      payment_amount, 
      card_token,
      payer_email,
      holder_name,
      identification_type,
      identification_number,
      installments = 1
    } = requestBody

    console.log('📊 Dados recebidos:', {
      agendamento_id,
      owner_id,
      payment_amount,
      card_token: card_token ? '[PRESENTE]' : '[AUSENTE]',
      payer_email,
      holder_name,
      identification_type,
      identification_number,
      installments
    });

    if (!agendamento_id || !owner_id || !payment_amount || !card_token) {
      console.error('❌ Parâmetros obrigatórios faltando');
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: agendamento_id, owner_id, payment_amount, card_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar configuração do Mercado Pago do profissional
    console.log('🔍 Buscando configuração do Mercado Pago para owner_id:', owner_id);
    const { data: config, error: configError } = await supabaseService
      .from('configuracoes')
      .select('mercado_pago_access_token')
      .eq('user_id', owner_id)
      .single()

    console.log('📋 Config encontrada:', {
      hasConfig: !!config,
      hasAccessToken: !!config?.mercado_pago_access_token,
      configError: configError?.message
    });

    if (configError || !config?.mercado_pago_access_token) {
      console.error('❌ Erro ao buscar configuração do Mercado Pago:', configError)
      return new Response(
        JSON.stringify({ error: 'Configuração do Mercado Pago não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar dados do agendamento
    const { data: agendamento, error: agendamentoError } = await supabaseService
      .from('agendamentos')
      .select('*')
      .eq('id', agendamento_id)
      .single()

    if (agendamentoError || !agendamento) {
      return new Response(
        JSON.stringify({ error: 'Agendamento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se já existe um pagamento para este agendamento
    const { data: pagamentoExistente } = await supabaseService
      .from('pagamentos')
      .select('id, status')
      .eq('agendamento_id', agendamento_id)
      .eq('status', 'pendente')
      .single()

    let pagamentoId: string

    if (pagamentoExistente) {
      // Usar pagamento existente
      pagamentoId = pagamentoExistente.id
    } else {
      // Criar novo registro de pagamento
      const isPacoteMensal = agendamento.observacoes?.includes('PACOTE MENSAL') || false
      const percentual = isPacoteMensal ? 100 : 50

      const { data: novoPagamento, error: pagamentoError } = await supabaseService
        .from('pagamentos')
        .insert({
          agendamento_id: agendamento_id,
          valor: payment_amount,
          percentual: percentual,
          status: 'pendente',
          user_id: owner_id,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
        })
        .select('id')
        .single()

      if (pagamentoError) {
        console.error('Erro ao criar pagamento:', pagamentoError)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar registro de pagamento' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      pagamentoId = novoPagamento.id
    }

    // Converter valor para decimal e garantir valor mínimo para parcelamento
    const transactionAmount = Number(payment_amount)
    const minValueForInstallments = 5.00 // Valor mínimo do MP para parcelamento
    
    // Para parcelamento, garantir valor mínimo
    if (installments > 1 && transactionAmount < minValueForInstallments) {
      console.error(`❌ Valor muito baixo para parcelamento: R$ ${transactionAmount}. Mínimo: R$ ${minValueForInstallments}`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Valor mínimo para parcelamento não atingido',
          message: `Valor mínimo para parcelamento é R$ ${minValueForInstallments.toFixed(2)}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar pagamento no Mercado Pago - formato correto para cartão
    const paymentData = {
      transaction_amount: Number(transactionAmount.toFixed(2)), // Garantir 2 casas decimais
      token: card_token,
      description: `Agendamento ${agendamento_id}`,
      external_reference: agendamento_id,
      installments: Number(installments), // Garantir que é número
      payer: {
        email: payer_email,
        identification: {
          type: identification_type,
          number: identification_number
        }
      },
      metadata: {
        agendamento_id: agendamento_id,
        pagamento_id: pagamentoId,
        owner_id: owner_id
      }
    }

    console.log('📤 Enviando dados para Mercado Pago:', JSON.stringify({
      ...paymentData,
      token: '[HIDDEN]'
    }, null, 2))

    // Fazer requisição para a API do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.mercado_pago_access_token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${agendamento_id}-${Date.now()}` // Evitar pagamentos duplicados
      },
      body: JSON.stringify(paymentData)
    })

    const mpResult = await mpResponse.json()

    console.log('📥 Status da resposta:', mpResponse.status)
    console.log('📥 Resposta do Mercado Pago:', JSON.stringify(mpResult, null, 2))

    if (!mpResponse.ok) {
      console.error('Erro na API do Mercado Pago:', mpResult)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao processar pagamento',
          message: mpResult.message || 'Pagamento rejeitado'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar status do pagamento
    if (mpResult.status === 'approved') {
      // Pagamento aprovado - atualizar status
      await supabaseService
        .from('pagamentos')
        .update({ 
          status: 'pago',
          preference_id: mpResult.id.toString()
        })
        .eq('id', pagamentoId)

      // Verificar se é um pacote mensal - verificar observações mais rigorosamente
      const observacoes = agendamento.observacoes || '';
      const isPacoteMensal = observacoes.includes('PACOTE MENSAL');
      const pacoteIdMatch = observacoes.match(/(PMT\d+)/i);

      console.log(`🔍 Observações: ${observacoes}`);
      console.log(`📦 É pacote mensal? ${isPacoteMensal}`);
      console.log(`🆔 Pacote ID: ${pacoteIdMatch ? pacoteIdMatch[1] : 'não encontrado'}`);

      if (isPacoteMensal && pacoteIdMatch) {
        const pacoteId = pacoteIdMatch[1];
        console.log(`📦 Processando PACOTE MENSAL ${pacoteId} - atualizando todos os 4 agendamentos...`);
        
        // Buscar TODOS os agendamentos do pacote usando o MESMO padrão do PIX
        const { data: pacoteAgendamentos, error: fetchPacoteError } = await supabaseService
          .from('agendamentos')
          .select('*')
          .eq('user_id', agendamento.user_id)
          .ilike('observacoes', `%PACOTE MENSAL ${pacoteId}%`)
          .order('data_hora', { ascending: true })
          
        if (fetchPacoteError) {
          console.error('❌ Erro ao buscar agendamentos do pacote:', fetchPacoteError);
        } else if (pacoteAgendamentos && pacoteAgendamentos.length > 0) {
          console.log(`📦 Encontrados ${pacoteAgendamentos.length} agendamentos no pacote`);
          
          // Calcular valor por agendamento - IGUAL ao PIX (sempre dividir por 4)
          const valorPorAgendamento = Number(payment_amount) / 4;
          
          // Atualizar TODOS os agendamentos do pacote
          for (const agendamentoPacote of pacoteAgendamentos) {
            const { error: updateError } = await supabaseService
              .from('agendamentos')
              .update({
                status: 'confirmado',
                valor_pago: valorPorAgendamento,
                updated_at: new Date().toISOString()
              })
              .eq('id', agendamentoPacote.id);
              
            if (updateError) {
              console.error(`❌ Erro ao atualizar agendamento ${agendamentoPacote.id}:`, updateError);
            } else {
              console.log(`✅ Agendamento ${agendamentoPacote.id} CONFIRMADO - valor pago: R$ ${valorPorAgendamento}`);
            }
          }
        } else {
          console.log('⚠️ Nenhum agendamento encontrado para o pacote');
        }
      } else {
        // Atualizar agendamento individual (incluir valor_pago como no PIX)
        console.log('📋 Processando agendamento individual...');
        await supabaseService
          .from('agendamentos')
          .update({ 
            status: 'confirmado',
            valor_pago: Number(payment_amount),
            updated_at: new Date().toISOString()
          })
          .eq('id', agendamento_id)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          payment_id: mpResult.id,
          status: mpResult.status,
          message: 'Pagamento aprovado com sucesso!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (mpResult.status === 'pending') {
      // Pagamento pendente
      await supabaseService
        .from('pagamentos')
        .update({ 
          status: 'pendente',
          preference_id: mpResult.id.toString()
        })
        .eq('id', pagamentoId)

      return new Response(
        JSON.stringify({ 
          success: false, 
          payment_id: mpResult.id,
          status: mpResult.status,
          message: 'Pagamento pendente. Aguarde a confirmação.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Pagamento rejeitado - atualizar status do pagamento E do agendamento
      await supabaseService
        .from('pagamentos')
        .update({ 
          status: 'rejeitado',
          preference_id: mpResult.id.toString()
        })
        .eq('id', pagamentoId)

      // Voltar agendamento para status pendente quando pagamento for rejeitado
      await supabaseService
        .from('agendamentos')
        .update({ status: 'pendente' })
        .eq('id', agendamento_id)

      return new Response(
        JSON.stringify({ 
          success: false, 
          payment_id: mpResult.id,
          status: mpResult.status,
          message: mpResult.status_detail || 'Pagamento rejeitado'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Erro na função process-card-payment:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})