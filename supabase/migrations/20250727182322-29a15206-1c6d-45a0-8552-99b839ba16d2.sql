-- Verificar se o usuário já existe e criar se necessário
-- Como não podemos inserir diretamente no auth.users via SQL, 
-- vamos primeiro limpar o registro incorreto e depois o usuário fará signup

-- Remover registro incorreto da tabela profiles se existir
DELETE FROM public.profiles WHERE email = 'hudsonluizdacruz@gmail.com';

-- Criar função para verificar se admin já foi criado
CREATE OR REPLACE FUNCTION public.create_admin_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o email for do admin, criar perfil admin automaticamente
  IF NEW.email = 'hudsonluizdacruz@gmail.com' THEN
    INSERT INTO public.profiles (id, nome, email, tipo_usuario)
    VALUES (NEW.id, 'Admin Sistema', NEW.email, 'admin')
    ON CONFLICT (email) DO UPDATE SET 
      tipo_usuario = 'admin',
      nome = 'Admin Sistema';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para auto-criar perfil admin
DROP TRIGGER IF EXISTS auto_create_admin_profile ON auth.users;
CREATE TRIGGER auto_create_admin_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_admin_profile_on_signup();