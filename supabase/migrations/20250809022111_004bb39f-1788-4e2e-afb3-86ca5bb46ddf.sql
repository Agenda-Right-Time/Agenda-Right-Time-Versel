-- Remover a foreign key constraint problemática que está impedindo inserções
ALTER TABLE public.cliente_profiles 
DROP CONSTRAINT IF EXISTS cliente_profiles_id_fkey;

-- Garantir que a tabela permite inserções sem restrições de foreign key
-- O campo id deve ser independente para permitir criação de clientes não autenticados