
-- Add telefone_estabelecimento column to configuracoes table
ALTER TABLE configuracoes 
ADD COLUMN IF NOT EXISTS telefone_estabelecimento TEXT;

-- Add comment to document the column
COMMENT ON COLUMN configuracoes.telefone_estabelecimento IS 'Telefone do estabelecimento para exibir na página de agendamento';
