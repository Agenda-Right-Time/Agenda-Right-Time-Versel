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
    // Use service role key para operações no banco
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { agendamento_id } = await req.json()

    if (!agendamento_id) {
      return new Response(
        JSON.stringify({ error: 'agendamento_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔧 Corrigindo agendamento com pagamento rejeitado:', agendamento_id)

    // Atualizar status do agendamento para pendente quando há pagamento rejeitado
    const { data: updatedAgendamento, error: updateError } = await supabaseService
      .from('agendamentos')
      .update({ status: 'pendente' })
      .eq('id', agendamento_id)
      .select('id, status')
      .single()

    if (updateError) {
      console.error('Erro ao atualizar agendamento:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar agendamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Agendamento corrigido:', updatedAgendamento)

    return new Response(
      JSON.stringify({ 
        success: true, 
        agendamento: updatedAgendamento,
        message: 'Agendamento corrigido com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na função fix-rejected-payment:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})