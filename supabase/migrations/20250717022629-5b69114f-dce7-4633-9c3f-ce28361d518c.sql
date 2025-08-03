-- Criar tabela para configuração admin do Stripe
CREATE TABLE IF NOT EXISTS public.admin_stripe_config (
  id SERIAL PRIMARY KEY,
  secret_key TEXT NOT NULL,
  publishable_key TEXT NOT NULL,
  is_test_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_stripe_config ENABLE ROW LEVEL SECURITY;

-- Política para admin gerenciar configuração Stripe
CREATE POLICY "Admin can manage stripe config" ON public.admin_stripe_config
FOR ALL
USING (true);