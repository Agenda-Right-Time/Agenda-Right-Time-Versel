-- Add stripe_subscription_id column to assinaturas table
ALTER TABLE public.assinaturas 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;