
-- Primeiro, vamos limpar e recriar as tabelas na ordem correta
-- Dropar tabelas existentes que podem ter sido alteradas incorretamente
DROP TABLE IF EXISTS avaliacoes CASCADE;
DROP TABLE IF EXISTS agendamentos CASCADE;
DROP TABLE IF EXISTS pagamentos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS servicos CASCADE;
DROP TABLE IF EXISTS profissionais CASCADE;
DROP TABLE IF EXISTS configuracoes CASCADE;
DROP TABLE IF EXISTS cliente_profiles CASCADE;
DROP TABLE IF EXISTS cliente_users CASCADE;

-- Recriar a tabela profiles (base do sistema)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  empresa text,
  avatar_url text,
  foto_salao_url text,
  tipo_usuario text DEFAULT 'profissional'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Recriar tabela assinaturas (sistema de pagamentos)
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'trial'::text,
  data_inicio timestamp with time zone NOT NULL DEFAULT now(),
  data_vencimento timestamp with time zone NOT NULL,
  trial_ate timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  preco numeric NOT NULL DEFAULT 35.99,
  payment_id text,
  preference_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Recriar tabela configuracoes com user_id
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_estabelecimento text,
  endereco text,
  cidade text,
  cep text,
  horario_abertura time without time zone DEFAULT '08:00:00'::time without time zone,
  horario_fechamento time without time zone DEFAULT '18:00:00'::time without time zone,
  dias_funcionamento text[] DEFAULT ARRAY['monday'::text, 'tuesday'::text, 'wednesday'::text, 'thursday'::text, 'friday'::text],
  intervalo_agendamento integer DEFAULT 30,
  antecedencia_minima integer DEFAULT 60,
  percentual_antecipado integer DEFAULT 50,
  mensagem_confirmacao text DEFAULT 'Seu agendamento foi confirmado!'::text,
  mercado_pago_access_token text,
  mercado_pago_public_key text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Recriar tabela profissionais com user_id
CREATE TABLE IF NOT EXISTS public.profissionais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  especialidade text,
  foto_url text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Recriar tabela servicos com user_id
CREATE TABLE IF NOT EXISTS public.servicos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  duracao integer NOT NULL,
  preco numeric,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Recriar tabela clientes com user_id
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Recriar tabela agendamentos com user_id
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  servico_id uuid REFERENCES public.servicos(id),
  profissional_id uuid REFERENCES public.profissionais(id),
  data_hora timestamp with time zone NOT NULL,
  cliente_email text,
  status text DEFAULT 'agendado'::text,
  valor numeric,
  valor_pago numeric DEFAULT 0,
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Recriar tabela pagamentos com user_id
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agendamento_id uuid REFERENCES public.agendamentos(id),
  valor numeric NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  percentual numeric NOT NULL DEFAULT 50,
  pix_code text,
  pix_qr_code text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:30:00'::interval),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Recriar tabela avaliacoes com user_id
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL,
  agendamento_id uuid REFERENCES public.agendamentos(id),
  nota integer NOT NULL,
  comentario text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Recriar tabela cliente_profiles
CREATE TABLE IF NOT EXISTS public.cliente_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  telefone text,
  profissional_vinculado uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Manter as tabelas admin existentes
-- admin_mercado_pago_config e admin_stripe_config permanecem como estão

-- Recriar triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Aplicar triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON public.configuracoes;
CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON public.configuracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profissionais_updated_at ON public.profissionais;
CREATE TRIGGER update_profissionais_updated_at BEFORE UPDATE ON public.profissionais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON public.agendamentos;
CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON public.agendamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pagamentos_updated_at ON public.pagamentos;
CREATE TRIGGER update_pagamentos_updated_at BEFORE UPDATE ON public.pagamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_avaliacoes_updated_at ON public.avaliacoes;
CREATE TRIGGER update_avaliacoes_updated_at BEFORE UPDATE ON public.avaliacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Manter função handle_new_user como estava
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Inserir na tabela profiles
  INSERT INTO public.profiles (id, nome, email, empresa, tipo_usuario)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'empresa', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'profissional')
  );

  -- Se for profissional, criar assinatura trial
  IF COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'profissional') = 'profissional' THEN
    INSERT INTO public.assinaturas (user_id, status, trial_ate, data_vencimento)
    VALUES (
      NEW.id,
      'trial',
      NOW() + INTERVAL '7 days',
      NOW() + INTERVAL '37 days'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Recriar trigger para novos usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função is_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND tipo_usuario = 'admin'
  );
$function$;
