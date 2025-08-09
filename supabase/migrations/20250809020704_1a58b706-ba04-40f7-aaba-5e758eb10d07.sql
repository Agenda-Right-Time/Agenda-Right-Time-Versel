-- Remover a tabela clientes que não está sendo usada
-- O sistema agora usa apenas cliente_profiles

DROP TABLE IF EXISTS public.clientes CASCADE;