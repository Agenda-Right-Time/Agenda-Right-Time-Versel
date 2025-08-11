-- Adicionar campos de horário de almoço na tabela calendar_settings
ALTER TABLE calendar_settings 
ADD COLUMN horario_inicio_almoco TIME,
ADD COLUMN horario_fim_almoco TIME;