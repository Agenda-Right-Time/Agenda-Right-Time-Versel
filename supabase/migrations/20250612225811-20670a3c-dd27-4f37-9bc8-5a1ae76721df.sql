
-- Criar função RPC para admin acessar todos os profissionais (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_all_professionals()
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles 
  WHERE tipo_usuario = 'profissional'
  ORDER BY created_at DESC;
$$;

-- Criar função para admin acessar todas as assinaturas (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_all_assinaturas()
RETURNS SETOF public.assinaturas
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.assinaturas
  ORDER BY created_at DESC;
$$;

-- Criar função para admin acessar todos os pagamentos (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_all_pagamentos()
RETURNS SETOF public.pagamentos
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.pagamentos
  ORDER BY created_at DESC;
$$;
