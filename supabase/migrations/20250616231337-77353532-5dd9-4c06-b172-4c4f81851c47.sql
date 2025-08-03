
-- Criar função para identificar o tipo de usuário baseado no metadata
CREATE OR REPLACE FUNCTION public.get_user_type_from_metadata(user_metadata jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(user_metadata ->> 'tipo_usuario', 'profissional');
$$;

-- Atualizar a função handle_new_user para ser mais restritiva
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
  user_type := public.get_user_type_from_metadata(NEW.raw_user_meta_data);
  
  RAISE LOG 'Processando usuário tipo: % para ID: %', user_type, NEW.id;
  
  -- Se for cliente, NÃO criar perfil na tabela profiles
  IF user_type = 'cliente' THEN
    RAISE LOG 'Usuário é cliente, ignorando criação de perfil profissional';
    RETURN NEW;
  END IF;
  
  -- Se for admin, criar perfil de admin
  IF user_type = 'admin' THEN
    INSERT INTO public.profiles (id, nome, email, empresa, tipo_usuario)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
      NEW.email,
      'admin-system',
      'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      email = EXCLUDED.email,
      tipo_usuario = 'admin',
      updated_at = now();
    
    RAISE LOG 'Perfil de admin criado para: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Código para profissionais
  empresa_slug := COALESCE(NEW.raw_user_meta_data ->> 'empresa', '');
  
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
      COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
      NEW.email,
      empresa_slug,
      'profissional'
    );
    
    RAISE LOG 'Perfil de profissional criado para: %', NEW.id;
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
  
  RAISE LOG 'Assinatura trial criada para profissional: %', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro na função handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Atualizar a função handle_cliente_signup para ser mais específica
CREATE OR REPLACE FUNCTION public.handle_cliente_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Só processar se explicitamente for cliente
  IF public.get_user_type_from_metadata(NEW.raw_user_meta_data) = 'cliente' THEN
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
      
    RAISE LOG 'Perfil de cliente criado para: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar função para verificar tipo de usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tipo_usuario = 'admin') THEN 'admin'
      WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tipo_usuario = 'profissional') THEN 'profissional'
      WHEN EXISTS (SELECT 1 FROM public.cliente_profiles WHERE id = auth.uid()) THEN 'cliente'
      ELSE NULL
    END;
$$;

-- Atualizar políticas RLS para maior isolamento
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.cliente_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.cliente_profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.cliente_profiles;

-- Políticas mais restritivas para cliente_profiles
CREATE POLICY "Clientes podem ver próprio perfil" ON public.cliente_profiles
  FOR SELECT USING (
    auth.uid() = id AND 
    public.get_current_user_type() = 'cliente'
  );

CREATE POLICY "Clientes podem inserir próprio perfil" ON public.cliente_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id AND 
    public.get_current_user_type() = 'cliente'
  );

CREATE POLICY "Clientes podem atualizar próprio perfil" ON public.cliente_profiles
  FOR UPDATE USING (
    auth.uid() = id AND 
    public.get_current_user_type() = 'cliente'
  );

-- Limpar dados inconsistentes (clientes que viraram profissionais por erro)
DELETE FROM public.assinaturas 
WHERE user_id IN (
  SELECT id FROM public.cliente_profiles
);

DELETE FROM public.profiles 
WHERE id IN (
  SELECT id FROM public.cliente_profiles
) AND tipo_usuario != 'admin';
