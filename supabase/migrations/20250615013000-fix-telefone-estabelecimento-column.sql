
-- Force refresh schema cache and add telefone_estabelecimento column
DO $$
BEGIN
    -- Add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'configuracoes' 
        AND column_name = 'telefone_estabelecimento'
    ) THEN
        ALTER TABLE configuracoes ADD COLUMN telefone_estabelecimento TEXT;
        
        -- Add comment to document the column
        COMMENT ON COLUMN configuracoes.telefone_estabelecimento IS 'Telefone do estabelecimento para exibir na página de agendamento';
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
