-- Adicionar coluna cliente_id à tabela agendamentos
ALTER TABLE public.agendamentos 
ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX idx_agendamentos_cliente_id ON public.agendamentos(cliente_id);

-- Criar trigger para associar cliente ao profissional quando um agendamento é criado
DROP TRIGGER IF EXISTS associate_cliente_to_professional_trigger ON public.agendamentos;

CREATE OR REPLACE FUNCTION public.associate_cliente_to_professional()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um agendamento é criado, associar o cliente ao profissional
  IF NEW.cliente_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    -- Verificar se o cliente existe na tabela cliente_profiles
    IF EXISTS (SELECT 1 FROM public.cliente_profiles WHERE id = NEW.cliente_id) THEN
      -- Atualizar a associação do cliente com o profissional
      UPDATE public.cliente_profiles 
      SET profissional_vinculado = NEW.user_id,
          updated_at = now()
      WHERE id = NEW.cliente_id 
      AND (profissional_vinculado IS NULL OR profissional_vinculado != NEW.user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
CREATE TRIGGER associate_cliente_to_professional_trigger
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.associate_cliente_to_professional();