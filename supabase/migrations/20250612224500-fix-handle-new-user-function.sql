
-- Corrigir a função handle_new_user para resolver erro de constraint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  empresa_slug text;
  profile_exists boolean;
BEGIN
  -- Extrair empresa do metadata
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

    -- Inserir na tabela profiles
    INSERT INTO public.profiles (id, nome, email, empresa, tipo_usuario)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nome', COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)),
      NEW.email,
      empresa_slug,
      COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'profissional')
    );
  ELSE
    -- Atualizar o perfil existente
    UPDATE public.profiles SET
      nome = COALESCE(NEW.raw_user_meta_data ->> 'nome', COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)),
      email = NEW.email,
      tipo_usuario = COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'profissional'),
      updated_at = now()
    WHERE id = NEW.id;
  END IF;

  -- Se for profissional, criar assinatura trial (se não existir)
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log o erro mas não falhar o signup
    RAISE LOG 'Erro na função handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;
