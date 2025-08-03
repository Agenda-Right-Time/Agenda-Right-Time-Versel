-- Criar tabela para armazenar datas fechadas
CREATE TABLE IF NOT EXISTS public.calendar_closed_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Criar tabela para armazenar horários específicos fechados
CREATE TABLE IF NOT EXISTS public.calendar_closed_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.calendar_closed_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_closed_time_slots ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para calendar_closed_dates
CREATE POLICY "Users can manage their own closed dates" 
ON public.calendar_closed_dates 
FOR ALL 
USING (auth.uid() = user_id);

-- Criar políticas RLS para calendar_closed_time_slots
CREATE POLICY "Users can manage their own closed time slots" 
ON public.calendar_closed_time_slots 
FOR ALL 
USING (auth.uid() = user_id);

-- Criar triggers para atualizar updated_at
CREATE TRIGGER update_calendar_closed_dates_updated_at
BEFORE UPDATE ON public.calendar_closed_dates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_closed_time_slots_updated_at
BEFORE UPDATE ON public.calendar_closed_time_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();