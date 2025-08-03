-- Inserir perfil de cliente para o profissional e atualizar agendamentos existentes
INSERT INTO public.cliente_profiles (id, nome, email, telefone, profissional_vinculado) 
VALUES (
  'e65fd5b8-b07f-4e67-9bbb-7d98f3f2a1d7', 
  'Hudson Luiz', 
  'hudsonldcldc@gmail.com', 
  null, 
  'e65fd5b8-b07f-4e67-9bbb-7d98f3f2a1d7'
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  profissional_vinculado = EXCLUDED.profissional_vinculado,
  updated_at = now();

-- Atualizar todos os agendamentos do profissional para usar o ID correto do cliente
UPDATE public.agendamentos 
SET cliente_id = 'e65fd5b8-b07f-4e67-9bbb-7d98f3f2a1d7'
WHERE user_id = 'e65fd5b8-b07f-4e67-9bbb-7d98f3f2a1d7'
AND cliente_email = 'hudsonldcldc@gmail.com';