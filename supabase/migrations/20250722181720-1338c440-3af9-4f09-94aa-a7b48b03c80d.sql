-- Função para remover com segurança um profissional e todos os seus agendamentos
CREATE OR REPLACE FUNCTION public.delete_professional_safely(professional_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success boolean := false;
BEGIN
  -- Marcar todos os agendamentos do profissional como cancelados
  UPDATE public.agendamentos
  SET status = 'cancelado'
  WHERE profissional_id = professional_id;
  
  -- Remover o profissional
  DELETE FROM public.profissionais
  WHERE id = professional_id;
  
  success := true;
  
  RETURN success;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao excluir profissional (ID: %): %', professional_id, SQLERRM;
    RETURN false;
END;
$$;