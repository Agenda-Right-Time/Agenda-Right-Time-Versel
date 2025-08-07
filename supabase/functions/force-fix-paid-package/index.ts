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
    console.log('🔧 Iniciando force-fix-paid-package...');
    
    // Use service role key for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Buscar o pacote PMT1754514579970 que tem pagamento aprovado mas valor_pago = 0
    const { data: pacoteAgendamentos, error: fetchError } = await supabaseService
      .from('agendamentos')
      .select('*')
      .ilike('observacoes', '%PMT1754514579970%')
      
    if (fetchError || !pacoteAgendamentos) {
      console.error('❌ Erro ao buscar agendamentos:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar agendamentos do pacote' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📦 Encontrados ${pacoteAgendamentos.length} agendamentos no pacote PMT1754514579970`);
    
    // Buscar o pagamento aprovado do pacote
    const { data: pagamentoPago } = await supabaseService
      .from('pagamentos')
      .select('valor')
      .eq('agendamento_id', pacoteAgendamentos[0]?.id)
      .eq('status', 'pago')
      .single()

    if (!pagamentoPago) {
      console.log('❌ Pagamento aprovado não encontrado');
      return new Response(
        JSON.stringify({ error: 'Pagamento aprovado não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`💰 Pagamento encontrado: R$ ${pagamentoPago.valor}`);

    // Calcular valor por agendamento
    const valorPorAgendamento = Number(pagamentoPago.valor) / 4;
    console.log(`💰 Valor por agendamento: R$ ${valorPorAgendamento}`);
    
    // Atualizar TODOS os agendamentos do pacote
    let sucessos = 0;
    for (const agendamento of pacoteAgendamentos) {
      console.log(`🔄 Atualizando agendamento ${agendamento.id} (status atual: ${agendamento.status})...`);
      
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
        sucessos++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Pacote PMT1754514579970 corrigido com sucesso!`,
        agendamentos_atualizados: sucessos,
        total_agendamentos: pacoteAgendamentos.length,
        valor_por_agendamento: valorPorAgendamento
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na função force-fix-paid-package:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})