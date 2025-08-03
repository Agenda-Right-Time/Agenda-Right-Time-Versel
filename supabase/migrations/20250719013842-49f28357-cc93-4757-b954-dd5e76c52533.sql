-- Corrigir sistema de autenticação e associação automática cliente-profissional

-- 1. Criar função para associar cliente ao profissional no momento do cadastro
CREATE OR REPLACE FUNCTION public.associate_client_to_professional_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  professional_id uuid;
  empresa_slug_param text;
BEGIN
  -- Extrair o empresa_slug dos metadados do usuário
  empresa_slug_param := NEW.raw_user_meta_data ->> 'empresa_slug';
  
  RAISE LOG 'Tentando associar cliente % ao profissional com slug: %', NEW.id, empresa_slug_param;
  
  -- Se não há empresa_slug nos metadados, não fazer associação
  IF empresa_slug_param IS NULL OR empresa_slug_param = '' THEN
    RAISE LOG 'Nenhum empresa_slug encontrado para cliente %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Buscar o ID do profissional pelo slug da empresa
  SELECT id INTO professional_id 
  FROM public.profiles 
  WHERE empresa_slug = empresa_slug_param 
    AND tipo_usuario = 'profissional'
  LIMIT 1;
  
  IF professional_id IS NOT NULL THEN
    -- Atualizar o perfil do cliente com a associação
    UPDATE public.cliente_profiles 
    SET profissional_vinculado = professional_id,
        updated_at = now()
    WHERE id = NEW.id;
    
    -- Criar associação na tabela de associações se não existir
    INSERT INTO public.cliente_profissional_associations (cliente_id, profissional_id)
    VALUES (NEW.id, professional_id)
    ON CONFLICT (cliente_id, profissional_id) DO NOTHING;
    
    RAISE LOG 'Cliente % associado ao profissional % (slug: %)', NEW.id, professional_id, empresa_slug_param;
  ELSE
    RAISE LOG 'Profissional não encontrado para slug: %', empresa_slug_param;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Criar trigger para associação automática após criação do perfil de cliente
DROP TRIGGER IF EXISTS on_cliente_profile_created ON public.cliente_profiles;
CREATE TRIGGER on_cliente_profile_created
  AFTER INSERT ON public.cliente_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.associate_client_to_professional_on_signup();

-- 3. Atualizar a função handle_cliente_signup para incluir empresa_slug
CREATE OR REPLACE FUNCTION public.handle_cliente_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  professional_id uuid;
  empresa_slug_param text;
BEGIN
  -- Só processar se explicitamente for cliente
  IF public.get_user_type_from_metadata(NEW.raw_user_meta_data) = 'cliente' THEN
    -- Extrair empresa_slug dos metadados
    empresa_slug_param := NEW.raw_user_meta_data ->> 'empresa_slug';
    
    -- Inserir perfil do cliente
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
    
    -- Se há empresa_slug, fazer associação imediata
    IF empresa_slug_param IS NOT NULL AND empresa_slug_param != '' THEN
      -- Buscar o ID do profissional pelo slug
      SELECT id INTO professional_id 
      FROM public.profiles 
      WHERE empresa_slug = empresa_slug_param 
        AND tipo_usuario = 'profissional'
      LIMIT 1;
      
      IF professional_id IS NOT NULL THEN
        -- Atualizar o perfil do cliente com a associação
        UPDATE public.cliente_profiles 
        SET profissional_vinculado = professional_id,
            updated_at = now()
        WHERE id = NEW.id;
        
        -- Criar associação na tabela de associações
        INSERT INTO public.cliente_profissional_associations (cliente_id, profissional_id)
        VALUES (NEW.id, professional_id)
        ON CONFLICT (cliente_id, profissional_id) DO NOTHING;
        
        RAISE LOG 'Cliente % imediatamente associado ao profissional % (slug: %)', NEW.id, professional_id, empresa_slug_param;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Criar função para mostrar clientes associados ao profissional
CREATE OR REPLACE FUNCTION public.get_professional_clients(professional_user_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  email text,
  telefone text,
  created_at timestamptz,
  updated_at timestamptz,
  total_agendamentos bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    cp.id,
    cp.nome,
    cp.email,
    cp.telefone,
    cp.created_at,
    cp.updated_at,
    COALESCE(COUNT(a.id), 0) as total_agendamentos
  FROM public.cliente_profiles cp
  LEFT JOIN public.agendamentos a ON a.cliente_id = cp.id AND a.user_id = professional_user_id
  WHERE cp.profissional_vinculado = professional_user_id
  GROUP BY cp.id, cp.nome, cp.email, cp.telefone, cp.created_at, cp.updated_at
  ORDER BY cp.nome;
$$;

-- 5. Adicionar política RLS para profissionais visualizarem seus clientes associados
CREATE POLICY "Profissionais podem ver clientes associados" ON public.cliente_profiles
FOR SELECT
USING (
  profissional_vinculado = auth.uid() 
  OR auth.uid() IN (
    SELECT profissional_id 
    FROM public.cliente_profissional_associations 
    WHERE cliente_id = cliente_profiles.id
  )
);

-- 6. Política para profissionais gerenciarem clientes através da tabela clientes (compatibilidade)
DROP POLICY IF EXISTS "Profissionais podem ver clientes vinculados" ON public.clientes;
CREATE POLICY "Profissionais podem ver clientes vinculados" ON public.clientes
FOR ALL
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.cliente_profiles cp 
    WHERE cp.profissional_vinculado = auth.uid()
    AND (cp.email = clientes.email OR cp.nome = clientes.nome)
  )
);

COMMENT ON FUNCTION public.associate_client_to_professional_on_signup() IS 'Associa automaticamente cliente ao profissional após criação do perfil';
COMMENT ON FUNCTION public.get_professional_clients(uuid) IS 'Retorna todos os clientes associados a um profissional específico';