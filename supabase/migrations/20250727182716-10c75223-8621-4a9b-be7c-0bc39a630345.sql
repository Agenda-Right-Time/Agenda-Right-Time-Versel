-- Criar o usuário admin usando um UUID fixo e inserir no profiles
-- Primeiro vamos criar um UUID fixo para o admin
DO $$
DECLARE
    admin_uuid UUID := 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
BEGIN
    -- Inserir o perfil admin diretamente na tabela profiles
    INSERT INTO public.profiles (id, nome, email, tipo_usuario)
    VALUES (admin_uuid, 'Admin Sistema', 'hudsonluizdacruz@gmail.com', 'admin')
    ON CONFLICT (id) DO UPDATE SET 
        email = 'hudsonluizdacruz@gmail.com',
        tipo_usuario = 'admin',
        nome = 'Admin Sistema';
        
    RAISE NOTICE 'Admin profile criado com ID: %', admin_uuid;
END $$;