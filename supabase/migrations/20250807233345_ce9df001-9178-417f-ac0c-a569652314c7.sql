-- Adicionar constraint UNIQUE no agendamento_id para permitir UPSERT
ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_agendamento_id_unique UNIQUE (agendamento_id);