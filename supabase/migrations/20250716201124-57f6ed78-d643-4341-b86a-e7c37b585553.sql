-- Criar perfil manualmente para o usuário que não foi criado pelo trigger
INSERT INTO public.profiles (
  id, 
  nome, 
  email, 
  empresa, 
  tipo_usuario
) VALUES (
  'e65fd5b8-b07f-4e67-9bbb-7d98f3f2a1d7',
  'Hudson Luiz',
  'hudsonldcldc@gmail.com',
  'Agenda Right Time',
  'profissional'
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  empresa = EXCLUDED.empresa,
  tipo_usuario = EXCLUDED.tipo_usuario,
  updated_at = now();