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
    console.log('🔧 Iniciando fix-package-payment...');
    
    // Use service role key for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { package_id } = await req.json()
    
    if (!package_id) {
      return new Response(
        JSON.stringify({ error: 'package_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📦 Corrigindo pacote:', package_id);

    // Buscar TODOS os agendamentos do pacote
    const { data: pacoteAgendamentos, error: fetchError } = await supabaseService
      .from('agendamentos')
      .select('*')
      .ilike('observacoes', `%${package_id}%`)
      
    if (fetchError) {
      console.error('❌ Erro ao buscar agendamentos:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar agendamentos do pacote' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pacoteAgendamentos || pacoteAgendamentos.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum agendamento encontrado para este pacote' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📦 Encontrados ${pacoteAgendamentos.length} agendamentos no pacote`);
    
    // Buscar o pagamento aprovado do pacote
    const { data: pagamentoPago } = await supabaseService
      .from('pagamentos')
      .select('valor')
      .eq('agendamento_id', pacoteAgendamentos[0].id)
      .eq('status', 'pago')
      .single()

    if (!pagamentoPago) {
      return new Response(
        JSON.stringify({ error: 'Pagamento aprovado não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calcular valor por agendamento
    const valorPorAgendamento = Number(pagamentoPago.valor) / 4;
    console.log(`💰 Valor por agendamento: R$ ${valorPorAgendamento}`);
    
    // Atualizar TODOS os agendamentos do pacote
    for (const agendamento of pacoteAgendamentos) {
      const { error: updateError } = await supabaseService
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
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Pacote ${package_id} corrigido com sucesso!`,
        agendamentos_atualizados: pacoteAgendamentos.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na função fix-package-payment:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})