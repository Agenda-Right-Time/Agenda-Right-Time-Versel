import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 Resetando senha do admin...');
    
    // Usar service role para operações admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Resetar senha do usuário admin
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      '2276c0d5-3ebf-4a6a-be99-0d03ff2aa37b',
      {
        password: 'HudsoN12H*'
      }
    );

    if (error) {
      console.error('❌ Erro ao resetar senha:', error);
      throw error;
    }

    console.log('✅ Senha resetada com sucesso!');
    
    return new Response(
      JSON.stringify({ success: true, message: 'Senha resetada com sucesso!' }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});