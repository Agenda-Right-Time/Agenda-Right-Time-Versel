-- SOLUÇÃO DEFINITIVA: Limpar e recriar tudo corretamente

-- 1. Deletar registros existentes
DELETE FROM public.profiles WHERE email = 'hudsonluizdacruz@gmail.com';
DELETE FROM auth.users WHERE email = 'hudsonluizdacruz@gmail.com';

-- 2. Criar usuário com senha correta usando crypt
DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
BEGIN
    -- Inserir no auth.users com todos os campos necessários
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at,
        is_anonymous
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        'hudsonluizdacruz@gmail.com',
        crypt('HudsoN12H*', gen_salt('bf')),
        NOW(),
        NULL,
        '',
        NULL,
        '',
        NULL,
        '',
        '',
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        FALSE,
        NOW(),
        NOW(),
        NULL,
        NULL,
        '',
        '',
        NULL,
        '',
        0,
        NULL,
        '',
        NULL,
        false,
        NULL,
        false
    );
    
    -- Inserir perfil admin
    INSERT INTO public.profiles (id, nome, email, tipo_usuario)
    VALUES (new_user_id, 'Admin Sistema', 'hudsonluizdacruz@gmail.com', 'admin');
    
    RAISE NOTICE 'Admin criado com sucesso com ID: %', new_user_id;
END $$;