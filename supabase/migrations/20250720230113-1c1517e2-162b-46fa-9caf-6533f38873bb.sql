-- Atualizar todos os agendamentos do pacote PMT1753051733907 para confirmado
UPDATE agendamentos 
SET status = 'confirmado', 
    valor_pago = 1.5,
    updated_at = now()
WHERE observacoes LIKE '%PMT1753051733907%';