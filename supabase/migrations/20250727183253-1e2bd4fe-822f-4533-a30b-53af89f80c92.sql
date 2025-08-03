-- Deletar usuário existente e recriar com senha correta
-- Primeiro deletar da tabela profiles
DELETE FROM public.profiles WHERE email = 'hudsonluizdacruz@gmail.com';

-- Deletar do auth.users
DELETE FROM auth.users WHERE email = 'hudsonluizdacruz@gmail.com';

-- Criar função para signup programático
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Inserir novo usuário no auth.users com senha hash correta
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change_token_current
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'hudsonluizdacruz@gmail.com',
        crypt('HudsoN12H*', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO new_user_id;
    
    -- Inserir perfil admin
    INSERT INTO public.profiles (id, nome, email, tipo_usuario)
    VALUES (new_user_id, 'Admin Sistema', 'hudsonluizdacruz@gmail.com', 'admin');
    
    RAISE NOTICE 'Admin criado com ID: %', new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar a função
SELECT create_admin_user();