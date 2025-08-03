
-- Corrigir as políticas RLS para cliente_profiles
DROP POLICY IF EXISTS "Users can view own client profile" ON public.cliente_profiles;
DROP POLICY IF EXISTS "Users can update own client profile" ON public.cliente_profiles;
DROP POLICY IF EXISTS "Users can insert own client profile" ON public.cliente_profiles;

-- Habilitar RLS na tabela cliente_profiles se não estiver habilitado
ALTER TABLE public.cliente_profiles ENABLE ROW LEVEL SECURITY;

-- Política para permitir que clientes vejam e editem seus próprios perfis
CREATE POLICY "Enable read access for own profile" ON public.cliente_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users" ON public.cliente_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for own profile" ON public.cliente_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Corrigir a função handle_cliente_signup para garantir criação correta
CREATE OR REPLACE FUNCTION public.handle_cliente_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Só criar perfil se o tipo de usuário for 'cliente'
  IF COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', '') = 'cliente' THEN
    INSERT INTO public.cliente_profiles (id, nome, email, telefone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data ->> 'telefone'
    )
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      email = EXCLUDED.email,
      telefone = EXCLUDED.telefone,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created_cliente ON auth.users;
CREATE TRIGGER on_auth_user_created_cliente
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_cliente_signup();

-- Atualizar a função handle_new_user para garantir que NÃO processe clientes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  empresa_slug text;
  profile_exists boolean;
  user_type text;
BEGIN
  -- Extrair tipo de usuário do metadata
  user_type := COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'profissional');
  
  -- Se for cliente, NÃO criar perfil na tabela profiles (que é só para profissionais)
  IF user_type = 'cliente' THEN
    RAISE LOG 'Usuário é cliente, não criando perfil profissional para: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Código existente para profissionais...
  empresa_slug := COALESCE(NEW.raw_user_meta_data ->> 'empresa', '');
  
  -- Se empresa estiver vazia, gerar uma única baseada no email
  IF empresa_slug = '' OR empresa_slug IS NULL THEN
    empresa_slug := CONCAT('empresa-', SUBSTRING(NEW.id::text, 1, 8));
  END IF;

  -- Verificar se o perfil já existe
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.id
  ) INTO profile_exists;

  IF NOT profile_exists THEN
    -- Verificar se a empresa já existe e gerar um nome único se necessário
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE empresa = empresa_slug) LOOP
      empresa_slug := CONCAT(empresa_slug, '-', SUBSTRING(NEW.id::text, 1, 4));
    END LOOP;

    -- Inserir na tabela profiles APENAS para profissionais
    INSERT INTO public.profiles (id, nome, email, empresa, tipo_usuario)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nome', COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)),
      NEW.email,
      empresa_slug,
      'profissional'
    );
  ELSE
    -- Atualizar o perfil existente
    UPDATE public.profiles SET
      nome = COALESCE(NEW.raw_user_meta_data ->> 'nome', COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)),
      email = NEW.email,
      tipo_usuario = 'profissional',
      updated_at = now()
    WHERE id = NEW.id;
  END IF;

  -- Criar assinatura trial APENAS para profissionais
  INSERT INTO public.assinaturas (user_id, status, trial_ate, data_vencimento)
  VALUES (
    NEW.id,
    'trial',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '37 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log o erro mas não falhar o signup
    RAISE LOG 'Erro na função handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Adicionar coluna profissional_vinculado se não existir na tabela cliente_profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cliente_profiles' 
                   AND column_name = 'profissional_vinculado') THEN
        ALTER TABLE public.cliente_profiles 
        ADD COLUMN profissional_vinculado uuid REFERENCES public.profiles(id);
    END IF;
END $$;

-- Função para associar cliente ao profissional baseado no ownerId do agendamento
CREATE OR REPLACE FUNCTION public.associate_cliente_to_professional()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Quando um agendamento é criado, associar o cliente ao profissional
  IF NEW.cliente_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    -- Verificar se o cliente existe na tabela cliente_profiles
    IF EXISTS (SELECT 1 FROM public.cliente_profiles WHERE id = NEW.cliente_id) THEN
      -- Atualizar a associação do cliente com o profissional
      UPDATE public.cliente_profiles 
      SET profissional_vinculado = NEW.user_id,
          updated_at = now()
      WHERE id = NEW.cliente_id 
      AND (profissional_vinculado IS NULL OR profissional_vinculado != NEW.user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para associação automática
DROP TRIGGER IF EXISTS associate_cliente_professional ON public.agendamentos;
CREATE TRIGGER associate_cliente_professional
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.associate_cliente_to_professional();
