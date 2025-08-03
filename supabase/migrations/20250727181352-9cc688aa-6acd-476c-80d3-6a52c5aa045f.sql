-- Criar tabela profiles para administradores
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  empresa TEXT DEFAULT 'admin-system',
  empresa_slug TEXT DEFAULT 'admin-system',
  tipo_usuario TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem seus próprios dados
CREATE POLICY "Admins can manage their own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id);

-- Política para acesso público limitado
CREATE POLICY "Public access to admin data" 
ON public.profiles 
FOR SELECT 
USING (tipo_usuario = 'admin');

-- Inserir usuário admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'hudsonluizdacruz@gmail.com',
  crypt('HudsoN12H*', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"tipo_usuario":"admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Inserir perfil admin na tabela profiles
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'hudsonluizdacruz@gmail.com'
)
INSERT INTO public.profiles (id, nome, email, tipo_usuario)
SELECT 
  admin_user.id,
  'Admin Sistema',
  'hudsonluizdacruz@gmail.com',
  'admin'
FROM admin_user
ON CONFLICT (email) DO NOTHING;