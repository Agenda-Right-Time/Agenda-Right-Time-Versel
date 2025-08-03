-- Criar tabela profiles simples para administradores
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tipo_usuario TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem seus próprios dados
CREATE POLICY "Admins can manage their own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id);

-- Política para acesso público limitado aos dados de admin
CREATE POLICY "Public access to admin data" 
ON public.profiles 
FOR SELECT 
USING (tipo_usuario = 'admin');