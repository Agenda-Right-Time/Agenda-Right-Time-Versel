
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== EDGE FUNCTION: get-mercado-pago-user INICIADA ===');
  console.log('Método da requisição:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Respondendo a requisição OPTIONS (CORS)');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Parseando corpo da requisição...');
    const body = await req.json();
    console.log('Corpo da requisição:', body);
    
    const { userId } = body;
    
    if (!userId) {
      console.error('User ID não fornecido');
      return new Response(
        JSON.stringify({ error: 'User ID é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User ID recebido:', userId);

    // Inicializar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('URLs e chaves do ambiente:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variáveis de ambiente não configuradas');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Cliente Supabase inicializado');

    // Buscar configuração do Mercado Pago
    console.log('Buscando configuração do Mercado Pago para o usuário:', userId);
    const { data: configData, error: configError } = await supabase
      .from('configuracoes')
      .select('mercado_pago_access_token')
      .eq('user_id', userId)
      .single();

    console.log('Resultado da busca de configuração:', { 
      found: !!configData, 
      hasToken: !!configData?.mercado_pago_access_token,
      error: configError 
    });

    if (configError) {
      console.error('Erro ao buscar configuração:', configError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar configuração do Mercado Pago', details: configError.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!configData?.mercado_pago_access_token) {
      console.error('Token do Mercado Pago não encontrado');
      return new Response(
        JSON.stringify({ error: 'Token do Mercado Pago não configurado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = configData.mercado_pago_access_token;
    console.log('Token encontrado, fazendo requisição para API do Mercado Pago...');
    console.log('Token (primeiros 20 chars):', accessToken.substring(0, 20) + '...');

    // Fazer requisição para API do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Resposta da API do Mercado Pago:', {
      status: mpResponse.status,
      statusText: mpResponse.statusText,
      ok: mpResponse.ok
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Erro na API do Mercado Pago:', {
        status: mpResponse.status,
        statusText: mpResponse.statusText,
        body: errorText
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao acessar API do Mercado Pago',
          details: `Status: ${mpResponse.status}, ${mpResponse.statusText}`,
          body: errorText
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userData = await mpResponse.json();
    console.log('Dados do usuário MP obtidos:', {
      id: userData.id,
      email: userData.email,
      nickname: userData.nickname
    });

    // Retornar email como chave PIX
    const pixKey = userData.email;
    
    if (!pixKey) {
      console.error('Email não encontrado nos dados do Mercado Pago');
      return new Response(
        JSON.stringify({ error: 'Email não encontrado nos dados do Mercado Pago' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== SUCESSO: CHAVE PIX ENCONTRADA ===');
    console.log('Chave PIX (email):', pixKey);

    const responseData = { 
      pixKey, 
      userData: { 
        email: userData.email, 
        id: userData.id,
        nickname: userData.nickname 
      } 
    };

    console.log('Retornando dados:', responseData);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== ERRO GERAL NA EDGE FUNCTION ===');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
});
