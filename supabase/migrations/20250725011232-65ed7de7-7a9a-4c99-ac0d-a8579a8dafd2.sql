-- Atualizar função para buscar profissional pelo slug na tabela correta
CREATE OR REPLACE FUNCTION public.get_professional_by_slug(slug text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT id FROM public.profissional_profiles 
  WHERE empresa_slug = slug 
  LIMIT 1;
$function$