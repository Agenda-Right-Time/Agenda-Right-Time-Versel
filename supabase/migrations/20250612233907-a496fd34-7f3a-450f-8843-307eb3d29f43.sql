
-- Primeiro, vamos limpar os registros duplicados mantendo apenas o mais recente
DELETE FROM public.configuracoes 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.configuracoes
  ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Agora adicionar a constraint única
ALTER TABLE public.configuracoes ADD CONSTRAINT configuracoes_user_id_unique UNIQUE (user_id);
