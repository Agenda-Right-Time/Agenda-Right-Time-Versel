-- Inserir o usuário admin diretamente na tabela profiles
-- Como não podemos criar diretamente no auth.users, vamos criar apenas na profiles
-- O usuário admin será criado via signup normal

-- Primeiro vamos criar um ID específico para o admin
DO $$
DECLARE
    admin_id UUID := gen_random_uuid();
BEGIN
    -- Inserir o perfil admin na tabela profiles
    INSERT INTO public.profiles (id, nome, email, tipo_usuario)
    VALUES (admin_id, 'Admin Sistema', 'hudsonluizdacruz@gmail.com', 'admin')
    ON CONFLICT (email) DO NOTHING;
END $$;