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

    console.log('🔄 Executando backup de webhook - verificando pagamentos perdidos...');

    // Buscar pagamentos pendentes há mais de 3 minutos
    const tresMinutosAtras = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    
    const { data: pagamentosPendentes, error: fetchError } = await supabaseClient
      .from('pagamentos')
      .select(`
        id,
        agendamento_id,
        user_id,
        valor,
        created_at,
        agendamentos!inner(status)
      `)
      .eq('status', 'pendente')
      .eq('agendamentos.status', 'agendado') // Só processar agendamentos que ainda estão agendados (não confirmados)
      .lte('created_at', tresMinutosAtras)
      .limit(20); // Processar até 20 por vez

    if (fetchError) {
      console.error('❌ Erro ao buscar pagamentos pendentes:', fetchError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar pagamentos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!pagamentosPendentes || pagamentosPendentes.length === 0) {
      console.log('✅ Nenhum pagamento pendente encontrado para backup');
      return new Response(JSON.stringify({ 
        message: 'Nenhum pagamento pendente encontrado',
        processed: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔍 Encontrados ${pagamentosPendentes.length} pagamentos pendentes para verificação`);

    let processedCount = 0;
    let confirmedCount = 0;

    for (const pagamento of pagamentosPendentes) {
      try {
        console.log(`🔄 Verificando pagamento ${pagamento.id} do agendamento ${pagamento.agendamento_id}`);
        
        // Chamar função de verificação
        const { data: checkResponse } = await supabaseClient.functions.invoke('check-payment-status', {
          body: {
            agendamentoId: pagamento.agendamento_id,
            userId: pagamento.user_id
          }
        });

        processedCount++;

        if (checkResponse?.status === 'confirmed') {
          confirmedCount++;
          console.log(`✅ Pagamento ${pagamento.id} foi confirmado pelo backup!`);
        } else {
          console.log(`⏳ Pagamento ${pagamento.id} ainda não confirmado`);
        }
        
        // Pequena pausa entre verificações para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Erro ao verificar pagamento ${pagamento.id}:`, error);
        processedCount++;
      }
    }

    console.log(`✅ Backup concluído: ${processedCount} pagamentos verificados, ${confirmedCount} confirmados`);

    return new Response(JSON.stringify({
      message: 'Backup de webhook executado com sucesso',
      processed: processedCount,
      confirmed: confirmedCount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no backup de webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno no backup de webhook',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});