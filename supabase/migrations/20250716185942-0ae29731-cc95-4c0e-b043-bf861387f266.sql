-- Remover a constraint única antiga que só considera user_id e date
ALTER TABLE calendar_closed_dates 
DROP CONSTRAINT IF EXISTS calendar_closed_dates_user_id_date_key;

-- Criar nova constraint única que considera user_id, profissional_id e date
ALTER TABLE calendar_closed_dates 
ADD CONSTRAINT calendar_closed_dates_user_profissional_date_key 
UNIQUE (user_id, profissional_id, date);

-- Fazer o mesmo para calendar_closed_time_slots se necessário
-- (verificar se existe constraint similar)
ALTER TABLE calendar_closed_time_slots 
DROP CONSTRAINT IF EXISTS calendar_closed_time_slots_user_id_date_key;

-- Criar constraint única para time slots considerando todos os campos relevantes
ALTER TABLE calendar_closed_time_slots 
ADD CONSTRAINT calendar_closed_time_slots_unique_key 
UNIQUE (user_id, profissional_id, date, start_time, end_time);