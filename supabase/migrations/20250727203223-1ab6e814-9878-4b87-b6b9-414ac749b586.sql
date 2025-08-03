-- Atualizar políticas RLS para assinaturas para permitir inserção via edge functions
DROP POLICY IF EXISTS "Users can create their own assinatura" ON public.assinaturas;
DROP POLICY IF EXISTS "Users can update their own assinatura" ON public.assinaturas;

-- Criar nova política para inserção que permite edge functions
CREATE POLICY "Enable insert for authenticated users and edge functions" ON public.assinaturas
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR auth.uid() IS NULL
);

-- Criar nova política para update que permite edge functions
CREATE POLICY "Enable update for authenticated users and edge functions" ON public.assinaturas
FOR UPDATE 
USING (
  auth.uid() = user_id OR auth.uid() IS NULL
)
WITH CHECK (
  auth.uid() = user_id OR auth.uid() IS NULL
);

-- Garantir que a coluna user_id não seja nullable (importante para RLS)
ALTER TABLE public.assinaturas ALTER COLUMN user_id SET NOT NULL;