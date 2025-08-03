
-- Corrigir a função handle_new_user para não criar perfis profissionais para clientes
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

-- Limpar dados incorretos (clientes que foram criados como profissionais)
DELETE FROM public.profiles 
WHERE id IN (
  SELECT cp.id 
  FROM public.cliente_profiles cp 
  INNER JOIN public.profiles p ON cp.id = p.id
);

-- Limpar assinaturas de clientes que não deveriam ter
DELETE FROM public.assinaturas 
WHERE user_id IN (
  SELECT id FROM public.cliente_profiles
);
