-- Adicionar uma função para gerar slug da empresa
CREATE OR REPLACE FUNCTION public.generate_company_slug(company_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(company_name, '[áàâãäå]', 'a', 'gi'),
        '[éèêë]', 'e', 'gi'
      ),
      '[^a-z0-9]', '', 'gi'
    )
  );
$$;

-- Adicionar coluna empresa_slug na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS empresa_slug text;

-- Atualizar os slugs existentes baseados no campo empresa
UPDATE public.profiles 
SET empresa_slug = public.generate_company_slug(empresa)
WHERE tipo_usuario = 'profissional' AND empresa_slug IS NULL;

-- Criar índice único para empresa_slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_empresa_slug 
ON public.profiles (empresa_slug) 
WHERE tipo_usuario = 'profissional';

-- Adicionar função para buscar profissional por slug
CREATE OR REPLACE FUNCTION public.get_professional_by_slug(slug text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.profiles 
  WHERE empresa_slug = slug AND tipo_usuario = 'profissional'
  LIMIT 1;
$$;

-- Atualizar a função handle_new_user para gerar slug automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  empresa_name text;
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
    INSERT INTO public.profiles (id, nome, email, empresa, empresa_slug, tipo_usuario)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
      NEW.email,
      'admin-system',
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
  empresa_name := COALESCE(NEW.raw_user_meta_data ->> 'empresa', '');
  
  IF empresa_name = '' OR empresa_name IS NULL THEN
    empresa_name := CONCAT('empresa-', SUBSTRING(NEW.id::text, 1, 8));
  END IF;

  -- Gerar slug da empresa
  empresa_slug := public.generate_company_slug(empresa_name);
  
  -- Verificar se o perfil já existe
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.id
  ) INTO profile_exists;

  IF NOT profile_exists THEN
    -- Verificar se o slug já existe e gerar um único se necessário
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE empresa_slug = empresa_slug) LOOP
      empresa_slug := CONCAT(empresa_slug, SUBSTRING(NEW.id::text, 1, 4));
    END LOOP;

    -- Inserir na tabela profiles APENAS para profissionais
    INSERT INTO public.profiles (id, nome, email, empresa, empresa_slug, tipo_usuario)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
      NEW.email,
      empresa_name,
      empresa_slug,
      'profissional'
    );
    
    RAISE LOG 'Perfil de profissional criado para: % com slug: %', NEW.id, empresa_slug;
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
$$;