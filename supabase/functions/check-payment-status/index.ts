
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

    const { agendamentoId, userId } = await req.json()
    console.log('🔍 Verificando status do pagamento para agendamento:', agendamentoId)

    if (!agendamentoId || !userId) {
      return new Response(JSON.stringify({ error: 'agendamentoId e userId são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Buscar pagamento pendente MAIS RECENTE deste agendamento ESPECÍFICO
    const { data: pagamentos, error: pagamentoError } = await supabaseClient
      .from('pagamentos')
      .select('*')
      .eq('agendamento_id', agendamentoId)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(1)

    if (pagamentoError || !pagamentos || pagamentos.length === 0) {
      console.log('❌ Nenhum pagamento pendente encontrado para este agendamento:', pagamentoError)
      return new Response(JSON.stringify({ 
        status: 'not_found',
        message: 'Nenhum pagamento pendente encontrado para este agendamento' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const pagamento = pagamentos[0]

    // Verificar se o pagamento já não está expirado
    const agora = new Date()
    const expiraEm = new Date(pagamento.expires_at)
    
    if (agora > expiraEm) {
      console.log('⏰ Pagamento expirado')
      return new Response(JSON.stringify({ 
        status: 'expired',
        message: 'Pagamento expirado' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Buscar configuração do Mercado Pago do usuário
    const { data: config, error: configError } = await supabaseClient
      .from('configuracoes')
      .select('mercado_pago_access_token')
      .eq('user_id', userId)
      .single()

    if (configError || !config?.mercado_pago_access_token) {
      console.log('❌ Configuração do Mercado Pago não encontrada para o usuário')
      return new Response(JSON.stringify({ 
        status: 'config_error',
        message: 'Configuração do Mercado Pago não encontrada' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const accessToken = config.mercado_pago_access_token

    console.log('🔍 Buscando pagamentos na API do Mercado Pago...')
    console.log('💰 Valor esperado:', pagamento.valor)
    console.log('🆔 Agendamento ID:', agendamentoId)

    // Buscar nos últimos 10 MINUTOS (aumentado de 5 minutos)
    const agora10MinAtras = new Date(agora.getTime() - 600000) // 10 minutos atrás
    const agoraFuturo = new Date(agora.getTime() + 10000) // 10 segundos no futuro para compensar delay

    console.log('🕐 Janela de busca: últimos 10 minutos')
    console.log('📅 De:', agora10MinAtras.toISOString())
    console.log('📅 Até:', agoraFuturo.toISOString())

    // Buscar pagamentos na API do Mercado Pago dos últimos 10 MINUTOS
    const searchUrl = new URL('https://api.mercadopago.com/v1/payments/search')
    searchUrl.searchParams.append('sort', 'date_created')
    searchUrl.searchParams.append('criteria', 'desc')
    searchUrl.searchParams.append('limit', '100')
    searchUrl.searchParams.append('begin_date', agora10MinAtras.toISOString())
    searchUrl.searchParams.append('end_date', agoraFuturo.toISOString())
    searchUrl.searchParams.append('status', 'approved') // Buscar apenas pagamentos aprovados
    
    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('❌ Erro na busca de pagamentos MP:', errorText)
      
      return new Response(JSON.stringify({ 
        status: 'mp_search_error',
        message: 'Erro ao buscar pagamentos no Mercado Pago',
        details: errorText
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const searchData = await searchResponse.json()
    console.log('📊 Total pagamentos encontrados nos últimos 5 minutos:', searchData.results?.length || 0)

    // NOVA ESTRATÉGIA SUPER SEGURA: APENAS confirmar pagamentos com external_reference correto
    let pagamentoEncontrado = null
    const valorEsperado = Number(pagamento.valor)
    
    console.log('📝 Detalhes da busca (MODO SUPER SEGURO):')
    console.log(`   - Agendamento ID: ${agendamentoId}`)
    console.log(`   - Valor buscado: R$ ${valorEsperado}`)
    console.log(`   - User ID: ${userId}`)
    console.log(`   - Pagamento ID no DB: ${pagamento.id}`)

    if (searchData.results && searchData.results.length > 0) {
      // BUSCAR APENAS PAGAMENTOS COM REFERÊNCIA CORRETA
      for (const p of searchData.results) {
        const valorPagamento = Number(p.transaction_amount)
        const isApproved = p.status === 'approved'
        const isPix = p.payment_method_id === 'pix'
        const isCard = p.payment_type_id === 'credit_card' || p.payment_type_id === 'debit_card'
        const valorExato = Math.abs(valorPagamento - valorEsperado) < 0.01
        
        console.log(`🔍 Analisando pagamento MP:`)
        console.log(`   - ID: ${p.id}`)
        console.log(`   - Valor: R$ ${valorPagamento} (esperado: R$ ${valorEsperado})`)
        console.log(`   - Status: ${p.status}`)
        console.log(`   - Método: ${p.payment_method_id}`)
        console.log(`   - Tipo: ${p.payment_type_id}`)
        console.log(`   - External Reference: "${p.external_reference}"`)
        console.log(`   - Metadata: ${JSON.stringify(p.metadata)}`)
        console.log(`   - Data: ${p.date_created}`)
        
        // CRITÉRIOS OBRIGATÓRIOS
        if (!isApproved) {
          console.log(`❌ REJEITADO: Status não é 'approved' (${p.status})`);
          continue;
        }
        
        if (!isPix && !isCard) {
          console.log(`❌ REJEITADO: Método de pagamento não é PIX nem cartão (${p.payment_method_id})`);
          continue;
        }
        
        if (!valorExato) {
          console.log(`❌ REJEITADO: Valor não confere (${valorPagamento} !== ${valorEsperado})`);
          continue;
        }
        
        // VERIFICAÇÃO DE REFERÊNCIA OBRIGATÓRIA
        const hasCorrectReference = p.external_reference === agendamentoId;
        const hasCorrectMetadata = p.metadata && p.metadata.agendamento_id === agendamentoId;
        
        console.log(`🎯 Verificação de referência:`);
        console.log(`   - External Reference: "${p.external_reference}" === "${agendamentoId}" = ${hasCorrectReference}`);
        console.log(`   - Metadata agendamento_id: "${p.metadata?.agendamento_id}" === "${agendamentoId}" = ${hasCorrectMetadata}`);
        
        if (hasCorrectReference || hasCorrectMetadata) {
          pagamentoEncontrado = p;
          console.log(`✅ PAGAMENTO CONFIRMADO COM REFERÊNCIA CORRETA!`);
          console.log(`   - ID do pagamento MP: ${p.id}`);
          console.log(`   - Método: ${isPix ? 'PIX' : 'CARTÃO'}`);
          console.log(`   - Valor: R$ ${valorPagamento}`);
          console.log(`   - Referência: ${p.external_reference || 'metadata'}`);
          break; // Encontrou o pagamento correto, parar busca
        } else {
          console.log(`❌ REJEITADO: Referência não confere`);
          console.log(`   - Esperado external_reference: "${agendamentoId}"`);
          console.log(`   - Recebido external_reference: "${p.external_reference}"`);
          console.log(`   - Esperado metadata.agendamento_id: "${agendamentoId}"`);
          console.log(`   - Recebido metadata.agendamento_id: "${p.metadata?.agendamento_id}"`);
        }
      }
      
      if (!pagamentoEncontrado) {
        console.log(`❌ NENHUM PAGAMENTO VÁLIDO ENCONTRADO`);
        console.log(`🔒 MODO SUPER SEGURO: Só aceita pagamentos com external_reference correto`);
        console.log(`📋 Critérios necessários:`);
        console.log(`   - Status: approved`);
        console.log(`   - Método: PIX ou cartão`);
        console.log(`   - Valor: R$ ${valorEsperado}`);
        console.log(`   - External Reference: "${agendamentoId}"`);
        console.log(`   - OU Metadata agendamento_id: "${agendamentoId}"`);
      }

      if (pagamentoEncontrado) {
        console.log('✅ Processando confirmação do pagamento...')
        
        // Atualizar APENAS o pagamento ESPECÍFICO deste agendamento
        const { error: updatePaymentError } = await supabaseClient
          .from('pagamentos')
          .update({
            status: 'pago',
            updated_at: new Date().toISOString()
          })
          .eq('id', pagamento.id)
          .eq('agendamento_id', agendamentoId) // GARANTIR que é o pagamento correto

        if (updatePaymentError) {
          console.error('❌ Erro ao atualizar pagamento:', updatePaymentError)
        } else {
          console.log('✅ Pagamento atualizado para PAGO')
        }

        // Verificar se é um pacote mensal (buscar outros agendamentos relacionados)
        const { data: agendamentoAtual } = await supabaseClient
          .from('agendamentos')
          .select('*')
          .eq('id', agendamentoId)
          .single();

        // Verificar se é um pacote mensal através das observações do agendamento
        const isPacoteMensal = agendamentoAtual && agendamentoAtual.observacoes && 
          (agendamentoAtual.observacoes.includes('PACOTE MENSAL') || agendamentoAtual.observacoes.includes('Pacote Mensal'));

        if (isPacoteMensal) {
          console.log('📦 Processando PACOTE MENSAL - atualizando todos os 4 agendamentos...');
          
          // Extrair o pacote ID das observações (formato PMT...)
          const observacoes = agendamentoAtual.observacoes;
          const pacoteIdMatch = observacoes.match(/(PMT\d+)/i);
          
          if (pacoteIdMatch) {
            const pacoteId = pacoteIdMatch[1];
            console.log(`📦 Pacote ID encontrado: ${pacoteId}`);
            
            // Buscar TODOS os agendamentos deste pacote específico
            const { data: pacoteAgendamentos, error: fetchPacoteError } = await supabaseClient
              .from('agendamentos')
              .select('id, data_hora, status')
              .eq('user_id', agendamentoAtual.user_id)
              .ilike('observacoes', `%${pacoteId}%`)
              .order('data_hora', { ascending: true });

            if (fetchPacoteError) {
              console.error('❌ Erro ao buscar agendamentos do pacote:', fetchPacoteError);
            } else if (pacoteAgendamentos && pacoteAgendamentos.length > 0) {
              console.log(`📋 Encontrados ${pacoteAgendamentos.length} agendamentos para o pacote ${pacoteId}`);
              
              // Log status ANTES da atualização
              pacoteAgendamentos.forEach(agendamento => {
                console.log(`📋 ANTES - Agendamento ${agendamento.id} (${agendamento.data_hora}): Status = ${agendamento.status}`);
              });
              
              // Atualizar TODOS os agendamentos do pacote para "confirmado"
              const valorPorAgendamento = Number(pagamento.valor) / 4; // Sempre dividir por 4 para pacote mensal
              
              for (const agendamento of pacoteAgendamentos) {
                const { error: updateError } = await supabaseClient
                  .from('agendamentos')
                  .update({
                    status: 'confirmado',
                    valor_pago: valorPorAgendamento,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', agendamento.id);
                  
                if (updateError) {
                  console.error(`❌ Erro ao atualizar agendamento ${agendamento.id}:`, updateError);
                } else {
                  console.log(`✅ Agendamento ${agendamento.id} CONFIRMADO - valor pago: R$ ${valorPorAgendamento}`);
                }
                
                // Criar pagamento individual para cada agendamento
                const { error: createPaymentError } = await supabaseClient
                  .from('pagamentos')
                  .insert({
                    user_id: agendamentoAtual.user_id,
                    agendamento_id: agendamento.id,
                    valor: valorPorAgendamento,
                    status: 'pago',
                    percentual: 100
                  });
                  
                if (createPaymentError) {
                  console.error(`❌ Erro ao criar pagamento para agendamento ${agendamento.id}:`, createPaymentError);
                } else {
                  console.log(`✅ Pagamento criado para agendamento ${agendamento.id}`);
                }
              }
              
              console.log('✅ TODOS os agendamentos do pacote mensal foram CONFIRMADOS!');
            } else {
              console.log('⚠️ Nenhum agendamento encontrado para o pacote:', pacoteId);
            }
          } else {
            console.log('⚠️ Pacote ID não encontrado nas observações');
          }
        } else {
          // Atualizar agendamento individual
          console.log('📋 Processando agendamento individual...');
          const { error: updateAgendamentoError } = await supabaseClient
            .from('agendamentos')
            .update({
              status: 'confirmado',
              valor_pago: Number(pagamento.valor),
              updated_at: new Date().toISOString()
            })
            .eq('id', agendamentoId);

          if (updateAgendamentoError) {
            console.error('❌ Erro ao atualizar agendamento:', updateAgendamentoError);
          } else {
            console.log('✅ Agendamento individual atualizado para CONFIRMADO');
          }
        }


        return new Response(JSON.stringify({ 
          status: 'confirmed',
          message: 'Pagamento confirmado!',
          payment_id: pagamentoEncontrado.id,
          amount: pagamentoEncontrado.transaction_amount,
          reference_type: (pagamentoEncontrado.external_reference === agendamentoId || pagamentoEncontrado.metadata?.agendamento_id === agendamentoId) ? 'reference_match' : 'value_match'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        console.log('❌ Nenhum pagamento com valor exato encontrado nos últimos 5 minutos')
        console.log(`💰 Valor esperado: R$ ${valorEsperado}`)
        
        if (searchData.results.length > 0) {
          console.log('📋 Pagamentos encontrados:')
          searchData.results.forEach(p => {
            console.log(`  - ID: ${p.id}, Valor: R$ ${p.transaction_amount}, Status: ${p.status}, Método: ${p.payment_method_id}, Tipo: ${p.payment_type_id}, Parcelas: ${p.installments || 1}, Ref: ${p.external_reference}`)
          })
        }
        
        return new Response(JSON.stringify({ 
          status: 'not_found',
          message: 'Nenhum pagamento encontrado nos últimos 5 minutos',
          expected_value: valorEsperado,
          payments_found: searchData.results.length
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } else {
      console.log('❌ Nenhum pagamento encontrado nos últimos 5 minutos')
      return new Response(JSON.stringify({ 
        status: 'no_payments',
        message: 'Nenhum pagamento encontrado nos últimos 5 minutos'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('❌ Erro ao verificar status do pagamento:', error)
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
