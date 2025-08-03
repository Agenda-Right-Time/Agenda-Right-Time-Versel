-- Criar política para permitir inserção de assinaturas durante o signup
CREATE POLICY "Users can create their own assinatura" ON public.assinaturas
FOR INSERT
WITH CHECK (auth.uid() = user_id);