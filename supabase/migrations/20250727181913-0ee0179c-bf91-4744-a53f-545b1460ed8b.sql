-- Inserir o usuário admin que já existe no auth.users na tabela profiles
INSERT INTO public.profiles (id, nome, email, tipo_usuario)
VALUES (
  '3895daed-3163-45f5-aa2f-5e0cdea2217d',
  'Admin Sistema', 
  'tatadocorte@gmail.com',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET 
  tipo_usuario = 'admin',
  nome = 'Admin Sistema';