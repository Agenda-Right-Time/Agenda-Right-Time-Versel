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
    console.log('🔧 Iniciando manual-fix-package...');
    
    // Use service role key for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // IDs específicos do pacote PMT1754514579970
    const agendamentoIds = [
      '121a99d5-ee36-43b4-bfa7-5315c3861f13', // Sessão 2/4
      '91156b0c-12b8-4a4e-b483-7d59caa3111b', // Sessão 3/4 
      '24bbcbb3-a67b-404b-b86f-e0a36a14d9f9', // Sessão 4/4
      '2e8fc128-7af3-4dc1-bf2a-2e9ba382ec20'  // Sessão 1/4
    ];

    console.log('📦 Atualizando agendamentos específicos do pacote PMT1754514579970');
    
    // Valor por agendamento (R$ 5,00 / 4 = R$ 1,25)
    const valorPorAgendamento = 1.25;
    
    let sucessos = 0;
    for (const agendamentoId of agendamentoIds) {
      console.log(`🔄 Atualizando agendamento ${agendamentoId}...`);
      
      const { error: updateError } = await supabaseService
        .from('agendamentos')
        .update({
          status: 'confirmado',
          valor_pago: valorPorAgendamento,
          updated_at: new Date().toISOString()
        })
        .eq('id', agendamentoId);
        
      if (updateError) {
        console.error(`❌ Erro ao atualizar agendamento ${agendamentoId}:`, updateError);
      } else {
        console.log(`✅ Agendamento ${agendamentoId} CONFIRMADO - valor pago: R$ ${valorPorAgendamento}`);
        sucessos++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Pacote PMT1754514579970 corrigido manualmente!`,
        agendamentos_atualizados: sucessos,
        total_agendamentos: agendamentoIds.length,
        valor_por_agendamento: valorPorAgendamento
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na função manual-fix-package:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})