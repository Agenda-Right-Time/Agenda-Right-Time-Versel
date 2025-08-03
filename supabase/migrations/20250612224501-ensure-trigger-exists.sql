
-- Verificar se o trigger existe e criar se necessário
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        
        RAISE NOTICE 'Trigger on_auth_user_created criado com sucesso';
    ELSE
        RAISE NOTICE 'Trigger on_auth_user_created já existe';
    END IF;
END
$$;

-- Adicionar constraint única na tabela assinaturas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'assinaturas_user_id_key'
    ) THEN
        ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_user_id_key UNIQUE (user_id);
        RAISE NOTICE 'Constraint unique em assinaturas.user_id criada';
    ELSE
        RAISE NOTICE 'Constraint unique em assinaturas.user_id já existe';
    END IF;
END
$$;
