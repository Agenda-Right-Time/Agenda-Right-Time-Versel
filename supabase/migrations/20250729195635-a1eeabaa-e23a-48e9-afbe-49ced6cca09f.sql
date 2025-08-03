-- Corrigir agendamentos que ficaram com status 'agendado' mas têm pagamento rejeitado
UPDATE agendamentos 
SET status = 'pendente' 
WHERE id IN (
  SELECT a.id 
  FROM agendamentos a 
  INNER JOIN pagamentos p ON p.agendamento_id = a.id 
  WHERE a.status = 'agendado' 
  AND p.status = 'rejeitado'
);