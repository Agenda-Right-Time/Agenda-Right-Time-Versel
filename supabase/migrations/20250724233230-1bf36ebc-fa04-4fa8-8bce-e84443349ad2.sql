-- Limpar todos os dados de profissionais e clientes
DELETE FROM public.assinaturas WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario IN ('profissional', 'cliente')
);

DELETE FROM public.pagamentos WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.agendamentos WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.servicos WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.profissionais WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.configuracoes WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.calendar_settings WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.calendar_closed_dates WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.calendar_closed_time_slots WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.salao_fotos WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.clientes WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.avaliacoes WHERE user_id IN (
  SELECT id FROM public.profiles WHERE tipo_usuario = 'profissional'
);

DELETE FROM public.cliente_profissional_associations;

DELETE FROM public.cliente_profiles;

-- Remover perfis de profissionais (manter apenas admins)
DELETE FROM public.profiles WHERE tipo_usuario = 'profissional';

-- Verificar se já existe conta admin com esse email
DELETE FROM public.profiles WHERE email = 'hudsonluizdacruz@gmail.com';

-- Criar conta admin segura
INSERT INTO public.profiles (id, nome, email, empresa, empresa_slug, tipo_usuario)
VALUES (
  gen_random_uuid(),
  'Admin Sistema',
  'hudsonluizdacruz@gmail.com',
  'admin-system',
  'admin-system',
  'admin'
);