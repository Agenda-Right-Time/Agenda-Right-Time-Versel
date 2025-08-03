
-- Criar bucket para fotos do estabelecimento
INSERT INTO storage.buckets (id, name, public)
VALUES ('estabelecimento-fotos', 'estabelecimento-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Adicionar coluna para URL da foto na tabela configuracoes
ALTER TABLE public.configuracoes 
ADD COLUMN IF NOT EXISTS foto_estabelecimento_url text;

-- Criar políticas para o bucket estabelecimento-fotos
CREATE POLICY "Authenticated users can upload establishment photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'estabelecimento-fotos');

CREATE POLICY "Authenticated users can update their establishment photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'estabelecimento-fotos');

CREATE POLICY "Authenticated users can delete their establishment photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'estabelecimento-fotos');

CREATE POLICY "Public can view establishment photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'estabelecimento-fotos');
