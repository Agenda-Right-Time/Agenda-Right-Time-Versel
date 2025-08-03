-- Remover campos desnecessários da tabela profiles
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS empresa,
DROP COLUMN IF EXISTS empresa_slug;

-- Atualizar qualquer registro existente
UPDATE public.profiles 
SET tipo_usuario = 'admin' 
WHERE tipo_usuario IS NULL;