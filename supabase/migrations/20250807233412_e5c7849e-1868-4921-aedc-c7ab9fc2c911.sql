-- Primeiro, identificar e manter apenas o pagamento mais recente para cada agendamento
DELETE FROM public.pagamentos 
WHERE id NOT IN (
    SELECT DISTINCT ON (agendamento_id) id 
    FROM public.pagamentos 
    ORDER BY agendamento_id, created_at DESC
);

-- Agora adicionar a constraint UNIQUE
ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_agendamento_id_unique UNIQUE (agendamento_id);