import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

serve(async (req) => {
  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  // Corrigir diretamente o pacote PMT1754514579970
  const updates = await Promise.all([
    supabaseService.from('agendamentos').update({ status: 'confirmado', valor_pago: 1.25 }).eq('id', '121a99d5-ee36-43b4-bfa7-5315c3861f13'),
    supabaseService.from('agendamentos').update({ status: 'confirmado', valor_pago: 1.25 }).eq('id', '91156b0c-12b8-4a4e-b483-7d59caa3111b'),
    supabaseService.from('agendamentos').update({ status: 'confirmado', valor_pago: 1.25 }).eq('id', '24bbcbb3-a67b-404b-b86f-e0a36a14d9f9'),
    supabaseService.from('agendamentos').update({ status: 'confirmado', valor_pago: 1.25 }).eq('id', '2e8fc128-7af3-4dc1-bf2a-2e9ba382ec20')
  ])

  return new Response(JSON.stringify({ success: true, updates }))
})