
-- Garantir que o campo empresa seja único e não nulo na tabela profiles
ALTER TABLE public.profiles 
ALTER COLUMN empresa SET NOT NULL;

-- Adicionar constraint de unicidade no campo empresa (sem IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_empresa_unique'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_empresa_unique UNIQUE (empresa);
    END IF;
END $$;

-- Criar índice para melhor performance nas consultas por empresa
CREATE INDEX IF NOT EXISTS profiles_empresa_idx ON public.profiles(empresa);

-- Atualizar a função handle_new_user para usar o nome da empresa como identificador
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  empresa_slug text;
BEGIN
  -- Extrair empresa do metadata
  empresa_slug := COALESCE(NEW.raw_user_meta_data ->> 'empresa', '');
  
  -- Se empresa estiver vazia, gerar uma única baseada no email
  IF empresa_slug = '' OR empresa_slug IS NULL THEN
    empresa_slug := CONCAT('empresa-', SUBSTRING(NEW.id::text, 1, 8));
  END IF;

  -- Inserir na tabela profiles usando INSERT ... ON CONFLICT
  INSERT INTO public.profiles (id, nome, email, empresa, tipo_usuario)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)),
    NEW.email,
    empresa_slug,
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'profissional')
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    empresa = EXCLUDED.empresa,
    tipo_usuario = EXCLUDED.tipo_usuario,
    updated_at = now()
  ON CONFLICT (empresa) DO UPDATE SET
    empresa = CONCAT(EXCLUDED.empresa, '-', SUBSTRING(NEW.id::text, 1, 4));

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
EXCEPTION
  WHEN OTHERS THEN
    -- Log o erro mas não falhar o signup
    RAISE LOG 'Erro na função handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Atualizar registros existentes que têm empresa vazia
UPDATE public.profiles 
SET empresa = CONCAT('empresa-', SUBSTRING(id::text, 1, 8))
WHERE empresa IS NULL OR empresa = '' OR TRIM(empresa) = '';
