-- Adicionar coluna preference_id na tabela pagamentos se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pagamentos' 
                   AND column_name = 'preference_id') THEN
        ALTER TABLE public.pagamentos ADD COLUMN preference_id TEXT;
    END IF;
END $$;

-- Verificar se a política de INSERT existe e permite edge functions
DROP POLICY IF EXISTS "insert_pagamento" ON public.pagamentos;
CREATE POLICY "insert_pagamento" ON public.pagamentos
  FOR INSERT
  WITH CHECK (true);

-- Verificar se a política de UPDATE existe e permite edge functions  
DROP POLICY IF EXISTS "update_pagamento" ON public.pagamentos;
CREATE POLICY "update_pagamento" ON public.pagamentos
  FOR UPDATE
  USING (true);