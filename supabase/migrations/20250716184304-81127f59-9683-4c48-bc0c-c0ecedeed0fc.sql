-- Adicionar coluna profissional_id na tabela calendar_closed_dates para filtro específico por profissional
ALTER TABLE calendar_closed_dates 
ADD COLUMN profissional_id UUID DEFAULT NULL;

-- Adicionar coluna profissional_id na tabela calendar_closed_time_slots para filtro específico por profissional
ALTER TABLE calendar_closed_time_slots 
ADD COLUMN profissional_id UUID DEFAULT NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_calendar_closed_dates_profissional 
ON calendar_closed_dates(user_id, profissional_id, date);

CREATE INDEX IF NOT EXISTS idx_calendar_closed_time_slots_profissional 
ON calendar_closed_time_slots(user_id, profissional_id, date);

-- Criar índice para calendar_settings por profissional
CREATE INDEX IF NOT EXISTS idx_calendar_settings_profissional 
ON calendar_settings(user_id, profissional_id);