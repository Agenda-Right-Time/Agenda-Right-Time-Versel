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

    console.log('💓 Monitor de heartbeat - verificando agendamentos pendentes ativos...');

    // Buscar agendamentos pendentes das últimas 24 horas
    const vintequatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: agendamentosPendentes, error: fetchError } = await supabaseClient
      .from('agendamentos')
      .select(`
        id,
        user_id,
        status,
        created_at,
        data_hora,
        pagamentos!inner(id, status, created_at)
      `)
      .eq('status', 'agendado')
      .eq('pagamentos.status', 'pendente')
      .gte('created_at', vintequatroHorasAtras)
      .limit(50);

    if (fetchError) {
      console.error('❌ Erro ao buscar agendamentos pendentes:', fetchError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar agendamentos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!agendamentosPendentes || agendamentosPendentes.length === 0) {
      console.log('✅ Nenhum agendamento pendente ativo encontrado');
      return new Response(JSON.stringify({ 
        message: 'Nenhum agendamento pendente ativo',
        processed: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`💓 Encontrados ${agendamentosPendentes.length} agendamentos pendentes para monitoramento`);

    let processedCount = 0;
    let confirmedCount = 0;

    for (const agendamento of agendamentosPendentes) {
      try {
        // Verificar se agendamento ainda está ativo (não foi cancelado nem confirmado)
        const { data: currentStatus } = await supabaseClient
          .from('agendamentos')
          .select('status')
          .eq('id', agendamento.id)
          .single();

        if (!currentStatus || currentStatus.status === 'cancelado') {
          console.log(`⏹️ Agendamento ${agendamento.id} foi cancelado - pulando`);
          continue;
        }

        if (currentStatus.status === 'confirmado') {
          console.log(`✅ Agendamento ${agendamento.id} já foi confirmado - PARANDO MONITORAMENTO`);
          continue;
        }

        console.log(`💓 Verificando heartbeat para agendamento ${agendamento.id}`);
        
        // Chamar função de verificação
        const { data: checkResponse } = await supabaseClient.functions.invoke('check-payment-status', {
          body: {
            agendamentoId: agendamento.id,
            userId: agendamento.user_id
          }
        });

        processedCount++;

        if (checkResponse?.status === 'confirmed') {
          confirmedCount++;
          console.log(`✅ Agendamento ${agendamento.id} foi confirmado pelo heartbeat monitor!`);
        } else {
          console.log(`⏳ Agendamento ${agendamento.id} ainda pendente`);
        }
        
        // Pausa entre verificações
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Erro ao verificar agendamento ${agendamento.id}:`, error);
        processedCount++;
      }
    }

    console.log(`💓 Heartbeat monitor concluído: ${processedCount} agendamentos verificados, ${confirmedCount} confirmados`);

    return new Response(JSON.stringify({
      message: 'Heartbeat monitor executado com sucesso',
      processed: processedCount,
      confirmed: confirmedCount,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no heartbeat monitor:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno no heartbeat monitor',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});