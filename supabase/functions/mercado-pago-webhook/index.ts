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

    const body = await req.json()
    console.log('🔔 Webhook received:', JSON.stringify(body, null, 2))

    // Verificar se é notificação de pagamento
    if (body.type === 'payment') {
      const paymentId = body.data.id

      // Buscar configuração admin do Mercado Pago
      console.log('🔍 Buscando configuração admin do Mercado Pago...')
      const { data: mpConfig, error: configError } = await supabaseClient
        .from('admin_mercado_pago_config')
        .select('access_token')
        .single()

      if (configError || !mpConfig?.access_token) {
        console.error('❌ Admin Mercado Pago config not found:', configError)
        return new Response('OK', { status: 200 })
      }

      console.log('✅ Admin config found, fetching payment data...')
      console.log('🔍 Fetching payment data for ID:', paymentId)

      // Buscar dados do pagamento no Mercado Pago usando a conta admin
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpConfig.access_token}`
        }
      })

      if (!mpResponse.ok) {
        console.error('❌ Error fetching payment from Mercado Pago:', mpResponse.status)
        return new Response('OK', { status: 200 })
      }

      const paymentData = await mpResponse.json()
      console.log('📊 Payment data from MP (admin account):', {
        id: paymentData.id,
        status: paymentData.status,
        payment_method_id: paymentData.payment_method_id,
        transaction_amount: paymentData.transaction_amount,
        external_reference: paymentData.external_reference,
        metadata: paymentData.metadata
      })

      // Se o pagamento foi aprovado
      if (paymentData.status === 'approved') {
        console.log('✅ Payment approved!')

        // Verificar se é pagamento de assinatura
        const isSubscriptionPayment = paymentData.external_reference?.startsWith('subscription_') || 
                                     paymentData.metadata?.type === 'subscription_payment'

        if (isSubscriptionPayment) {
          console.log('💰 Processing subscription payment...')
          const subscriptionId = paymentData.external_reference?.replace('subscription_', '') || 
                                paymentData.metadata?.subscription_id
          
          // Buscar assinatura
          const { data: subscription, error: subError } = await supabaseClient
            .from('assinaturas')
            .select('*')
            .eq('id', subscriptionId)
            .single()

          if (subscription) {
            console.log('✅ Subscription found:', subscription.id)

            // Calcular nova data de vencimento (30 dias a partir de agora)
            const now = new Date()
            const newExpirationDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

            // Atualizar assinatura para ativa
            const { error: updateError } = await supabaseClient
              .from('assinaturas')
              .update({
                status: 'ativa',
                payment_id: paymentId.toString(),
                data_vencimento: newExpirationDate.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', subscriptionId)

            if (updateError) {
              console.error('❌ Error updating subscription:', updateError)
            } else {
              console.log('✅ Subscription activated successfully!')
            }
          }
        } else {
          // Processar pagamento de agendamento (PIX ou cartão)
          console.log('📅 Processing agendamento payment...')
          console.log('🔍 Payment amount:', paymentData.transaction_amount)
          console.log('🔍 External reference:', paymentData.external_reference)
          console.log('🔍 Payment metadata:', paymentData.metadata)

          let pagamento = null;

          // Primeiro, tentar encontrar por external_reference (pagamentos de cartão)
          if (paymentData.external_reference) {
            console.log('🔍 Searching payment by agendamento_id from external_reference...')
            
            const { data: pagamentoByRef, error: refError } = await supabaseClient
              .from('pagamentos')
              .select('*')
              .eq('agendamento_id', paymentData.external_reference)
              .eq('status', 'pendente')
              .single()

            if (!refError && pagamentoByRef) {
              console.log('✅ Found payment by external_reference:', pagamentoByRef.id)
              pagamento = pagamentoByRef
            } else {
              console.log('ℹ️ No payment found by external_reference')
            }
          }

          // Se não encontrou por external_reference, usar estratégia anterior (buscar por valor)
          if (!pagamento) {
            console.log('🔍 Searching for ALL pending payments by amount...')
            
            const { data: allPendingPayments, error: searchError } = await supabaseClient
              .from('pagamentos')
              .select('*')
              .eq('status', 'pendente')
              .order('created_at', { ascending: false })

            if (searchError) {
              console.error('❌ Error searching payments:', searchError)
              return new Response('OK', { status: 200 })
            }

            console.log('📋 Found pending payments:', allPendingPayments?.length || 0)
            
            if (allPendingPayments && allPendingPayments.length > 0) {
              console.log('💰 All pending payments:', allPendingPayments.map(p => ({ 
                id: p.id, 
                valor: p.valor, 
                agendamento_id: p.agendamento_id,
                created_at: p.created_at,
                expires_at: p.expires_at
              })))

              // Buscar correspondência exata primeiro
              pagamento = allPendingPayments.find(p => {
                const diff = Math.abs(Number(p.valor) - paymentData.transaction_amount)
                console.log(`💰 Exact match check: DB=${p.valor}, MP=${paymentData.transaction_amount}, diff=${diff}`)
                return diff < 0.01
              })
              
              // Se não encontrou exato, buscar por aproximação (até R$ 5.00 de diferença)
              if (!pagamento) {
                console.log('🔍 Trying approximate match (within R$ 5.00)...')
                pagamento = allPendingPayments.find(p => {
                  const diff = Math.abs(Number(p.valor) - paymentData.transaction_amount)
                  console.log(`💰 Approximate match check: DB=${p.valor}, MP=${paymentData.transaction_amount}, diff=${diff}`)
                  return diff <= 5.0
                })
              }

              // Se ainda não encontrou, pegar o mais recente não expirado
              if (!pagamento) {
                const now = new Date()
                const notExpired = allPendingPayments.filter(p => new Date(p.expires_at) > now)
                if (notExpired.length > 0) {
                  pagamento = notExpired[0]
                  console.log('⚠️ Using most recent non-expired payment as fallback:', pagamento.id)
                }
              }
            }
          }

          if (pagamento) {
            console.log('✅ Payment matched:', {
              id: pagamento.id,
              valor: pagamento.valor,
              agendamento_id: pagamento.agendamento_id,
              amount_difference: Math.abs(Number(pagamento.valor) - paymentData.transaction_amount)
            })

            // ATUALIZAR PAGAMENTO PARA PAGO
            console.log('🔄 Updating payment status to PAGO...')
            const { error: updatePaymentError } = await supabaseClient
              .from('pagamentos')
              .update({
                status: 'pago',
                updated_at: new Date().toISOString()
              })
              .eq('id', pagamento.id)

            if (updatePaymentError) {
              console.error('❌ Error updating payment status:', updatePaymentError)
              return new Response('OK', { status: 200 })
            }

            console.log('✅ Payment status updated to PAGO successfully!')

            // ATUALIZAR AGENDAMENTO PARA CONFIRMADO
            if (pagamento.agendamento_id) {
              console.log('🗓️ Updating agendamento to CONFIRMADO for ID:', pagamento.agendamento_id)
              
              // Primeiro, buscar o agendamento para verificar se é pacote mensal
              const { data: agendamento, error: fetchError } = await supabaseClient
                .from('agendamentos')
                .select('observacoes')
                .eq('id', pagamento.agendamento_id)
                .single()

              if (fetchError) {
                console.error('❌ Error fetching agendamento:', fetchError)
              } else {
                const isPacoteMensal = agendamento?.observacoes?.includes('PACOTE MENSAL')
                
                if (isPacoteMensal) {
                  // Se é pacote mensal, extrair o ID do pacote e confirmar TODOS os agendamentos
                  const pacoteMatch = agendamento.observacoes.match(/PACOTE MENSAL (PMT\d+)/)
                  const pacoteId = pacoteMatch ? pacoteMatch[1] : null
                  
                  if (pacoteId) {
                    console.log('📦 PACOTE MENSAL detected! Confirming ALL appointments for package:', pacoteId)
                    
                    // Buscar TODOS os agendamentos do pacote (não apenas os pendentes)
                    const { data: pacoteAgendamentos, error: fetchPacoteError } = await supabaseClient
                      .from('agendamentos')
                      .select('id, status, data_hora')
                      .ilike('observacoes', `%PACOTE MENSAL ${pacoteId}%`)
                    
                    if (fetchPacoteError) {
                      console.error('❌ Error fetching package appointments:', fetchPacoteError)
                    } else {
                      console.log(`📋 Found ${pacoteAgendamentos?.length || 0} appointments for package ${pacoteId}`)
                      
                      if (pacoteAgendamentos && pacoteAgendamentos.length > 0) {
                        // Log status de cada agendamento ANTES da atualização
                        pacoteAgendamentos.forEach(agendamento => {
                          console.log(`📋 ANTES - Agendamento ${agendamento.id} (${agendamento.data_hora}): Status = ${agendamento.status}`)
                        })
                        
                        // Atualizar TODOS os agendamentos do pacote para confirmado
                        for (const agendamento of pacoteAgendamentos) {
                          const { error: updateError } = await supabaseClient
                            .from('agendamentos')
                            .update({
                              status: 'confirmado',
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', agendamento.id)
                            
                          if (updateError) {
                            console.error(`❌ Error updating appointment ${agendamento.id}:`, updateError)
                          } else {
                            console.log(`✅ Confirmed appointment: ${agendamento.id} (${agendamento.data_hora})`)
                          }
                        }
                        
                        // Atualizar valor pago em TODOS os agendamentos do pacote
                        const valorPorAgendamento = Number(pagamento.valor) / 4; // Dividir valor por 4 agendamentos
                        for (const agendamento of pacoteAgendamentos) {
                          const { error: valorError } = await supabaseClient
                            .from('agendamentos')
                            .update({
                              valor_pago: valorPorAgendamento
                            })
                            .eq('id', agendamento.id)

                          if (valorError) {
                            console.error(`❌ Error updating payment value for appointment ${agendamento.id}:`, valorError)
                          } else {
                            console.log(`✅ Payment value (${valorPorAgendamento}) updated for appointment ${agendamento.id}`)
                          }
                        }
                        
                        console.log('✅ ALL package appointments updated successfully!')
                      } else {
                        console.log('⚠️ No appointments found for package:', pacoteId)
                      }
                    }
                  }
                } else {
                  // Agendamento normal - atualizar apenas o específico
                  const { error: agendamentoError } = await supabaseClient
                    .from('agendamentos')
                    .update({
                      status: 'confirmado',
                      valor_pago: Number(pagamento.valor),
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', pagamento.agendamento_id)

                  if (agendamentoError) {
                    console.error('❌ Error updating agendamento:', agendamentoError)
                  } else {
                    console.log('✅ Single agendamento updated to CONFIRMADO successfully!')
                  }
                }
              }
            }

            // FORÇAR NOTIFICAÇÃO REALTIME ADICIONAL
            console.log('📡 Sending additional realtime notification...')
            const { error: notifyError } = await supabaseClient
              .from('pagamentos')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', pagamento.id)

            if (notifyError) {
              console.error('❌ Error sending realtime notification:', notifyError)
            } else {
              console.log('✅ Additional realtime notification sent!')
            }

          } else {
            console.log('❌ No matching payment found for amount:', paymentData.transaction_amount)
          }
        }
      } else {
        console.log('⏸️ Payment not approved. Status:', paymentData.status)
        console.log('📋 Status detail:', paymentData.status_detail)
      }
    } else {
      console.log('ℹ️ Non-payment webhook received:', body.type || 'unknown type')
    }

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('❌ Webhook error:', error.message)
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})