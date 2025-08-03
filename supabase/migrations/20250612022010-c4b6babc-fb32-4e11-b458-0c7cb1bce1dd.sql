
-- Habilitar RLS em todas as tabelas que precisam
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela configuracoes
DROP POLICY IF EXISTS "Users can view their own configuracoes" ON public.configuracoes;
CREATE POLICY "Users can view their own configuracoes" 
  ON public.configuracoes 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own configuracoes" ON public.configuracoes;
CREATE POLICY "Users can create their own configuracoes" 
  ON public.configuracoes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own configuracoes" ON public.configuracoes;
CREATE POLICY "Users can update their own configuracoes" 
  ON public.configuracoes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Políticas para a tabela profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Políticas para a tabela profissionais
DROP POLICY IF EXISTS "Users can manage their own profissionais" ON public.profissionais;
CREATE POLICY "Users can manage their own profissionais" 
  ON public.profissionais 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas para a tabela servicos
DROP POLICY IF EXISTS "Users can manage their own servicos" ON public.servicos;
CREATE POLICY "Users can manage their own servicos" 
  ON public.servicos 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas para a tabela clientes
DROP POLICY IF EXISTS "Users can manage their own clientes" ON public.clientes;
CREATE POLICY "Users can manage their own clientes" 
  ON public.clientes 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas para a tabela agendamentos
DROP POLICY IF EXISTS "Users can manage their own agendamentos" ON public.agendamentos;
CREATE POLICY "Users can manage their own agendamentos" 
  ON public.agendamentos 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas para a tabela pagamentos
DROP POLICY IF EXISTS "Users can manage their own pagamentos" ON public.pagamentos;
CREATE POLICY "Users can manage their own pagamentos" 
  ON public.pagamentos 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas para a tabela avaliacoes
DROP POLICY IF EXISTS "Users can manage their own avaliacoes" ON public.avaliacoes;
CREATE POLICY "Users can manage their own avaliacoes" 
  ON public.avaliacoes 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas para a tabela assinaturas
DROP POLICY IF EXISTS "Users can view their own assinatura" ON public.assinaturas;
CREATE POLICY "Users can view their own assinatura" 
  ON public.assinaturas 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own assinatura" ON public.assinaturas;
CREATE POLICY "Users can update their own assinatura" 
  ON public.assinaturas 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS configuracoes_user_id_idx ON public.configuracoes(user_id);
CREATE INDEX IF NOT EXISTS profiles_id_idx ON public.profiles(id);
CREATE INDEX IF NOT EXISTS profissionais_user_id_idx ON public.profissionais(user_id);
CREATE INDEX IF NOT EXISTS servicos_user_id_idx ON public.servicos(user_id);
CREATE INDEX IF NOT EXISTS clientes_user_id_idx ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS agendamentos_user_id_idx ON public.agendamentos(user_id);
CREATE INDEX IF NOT EXISTS pagamentos_user_id_idx ON public.pagamentos(user_id);
CREATE INDEX IF NOT EXISTS avaliacoes_user_id_idx ON public.avaliacoes(user_id);
CREATE INDEX IF NOT EXISTS assinaturas_user_id_idx ON public.assinaturas(user_id);

-- Corrigir a função handle_new_user para garantir que funcione corretamente
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
    COALESCE(NEW.raw_user_meta_data ->> 'nome', COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'empresa', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'profissional')
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    empresa = EXCLUDED.empresa,
    tipo_usuario = EXCLUDED.tipo_usuario,
    updated_at = now();

  -- Se for profissional, criar assinatura trial
  IF COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'profissional') = 'profissional' THEN
    INSERT INTO public.assinaturas (user_id, status, trial_ate, data_vencimento)
    VALUES (
      NEW.id,
      'trial',
      NOW() + INTERVAL '7 days',
      NOW() + INTERVAL '37 days'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
