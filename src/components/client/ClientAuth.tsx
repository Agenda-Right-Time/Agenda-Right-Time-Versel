
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useClientOnlyAuth } from '@/hooks/useClientOnlyAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';

const ClientAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { empresaSlug: routeSlug } = useParams<{ empresaSlug: string }>();
  const ownerParam = searchParams.get('owner');
  const isDashboard = searchParams.get('dashboard') === 'true';
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Usar o slug da rota primeiro, depois o parâmetro owner
  const empresaSlug = routeSlug || ownerParam || '';
  
  console.log('ClientAuth - empresaSlug:', empresaSlug, 'routeSlug:', routeSlug, 'ownerParam:', ownerParam);
  
  const { signIn, signUp } = useClientOnlyAuth(empresaSlug);
  const { toast } = useToast();

  

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [signupData, setSignupData] = useState({
    nome: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!empresaSlug) {
      toast({
        title: "Erro",
        description: "Slug da empresa não encontrado na URL.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🔑 Cliente tentando fazer login para o profissional:', empresaSlug);
      
      const { error } = await signIn(loginData.email, loginData.password);
      
      if (error) {
        console.error('❌ Erro no login do cliente:', error);
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Login realizado com sucesso! 🎉",
        description: "Redirecionando..."
      });

      console.log('✅ Cliente logado, redirecionando');
      
      // Redirecionar usando apenas slug
      const redirectUrl = isDashboard 
        ? `/${empresaSlug}?dashboard=true`
        : `/${empresaSlug}`;
      
      setTimeout(() => {
        navigate(redirectUrl, { replace: true });
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro inesperado no login:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!empresaSlug) {
      toast({
        title: "Erro",
        description: "Slug da empresa não encontrado na URL.",
        variant: "destructive"
      });
      return;
    }
    
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Cliente tentando fazer cadastro para o profissional:', empresaSlug);
      console.log('📋 Dados do cadastro:', {
        email: signupData.email,
        nome: signupData.nome,
        telefone: signupData.telefone,
        empresa_slug: empresaSlug
      });
      
      const { error } = await signUp(
        signupData.email,
        signupData.password,
        signupData.nome,
        signupData.telefone
      );
      
      if (error) {
        console.error('❌ Erro no cadastro do cliente:', error);
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Cadastro realizado com sucesso! 🎉",
        description: "Redirecionando..."
      });

      console.log('✅ Cliente cadastrado, redirecionando');
      
      // Redirecionar usando apenas slug
      const redirectUrl = isDashboard 
        ? `/${empresaSlug}?dashboard=true`
        : `/${empresaSlug}`;
      
      setTimeout(() => {
        navigate(redirectUrl, { replace: true });
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro inesperado no cadastro:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-gold-500 mr-2" />
            <CardTitle className="text-2xl bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
              Agenda Right Time
            </CardTitle>
          </div>
          <p className="text-gray-400">Faça login para continuar seu agendamento</p>
          {empresaSlug && (
            <p className="text-xs text-gold-400 mt-2">
              🔗 Conectando com profissional: {empresaSlug}
            </p>
          )}
          {!empresaSlug && (
            <p className="text-xs text-red-400 mt-2">
              ⚠️ Slug da empresa não encontrado na URL
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-gold-500 data-[state=active]:text-black data-[state=active]:font-semibold"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="data-[state=active]:bg-gold-500 data-[state=active]:text-black data-[state=active]:font-semibold"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="bg-gray-800 border-gray-600 pl-10 text-white placeholder-gray-400"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="bg-gray-800 border-gray-600 pl-10 pr-10 text-white placeholder-gray-400"
                      placeholder="Sua senha"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold-gradient text-black font-semibold hover:opacity-90 py-3"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      value={signupData.nome}
                      onChange={(e) => setSignupData({ ...signupData, nome: e.target.value })}
                      className="bg-gray-800 border-gray-600 pl-10 text-white placeholder-gray-400"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      className="bg-gray-800 border-gray-600 pl-10 text-white placeholder-gray-400"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      value={signupData.telefone}
                      onChange={(e) => setSignupData({ ...signupData, telefone: e.target.value })}
                      className="bg-gray-800 border-gray-600 pl-10 text-white placeholder-gray-400"
                      placeholder="(11) 9 9999-9999"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      className="bg-gray-800 border-gray-600 pl-10 pr-10 text-white placeholder-gray-400"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      className="bg-gray-800 border-gray-600 pl-10 pr-10 text-white placeholder-gray-400"
                      placeholder="Confirme sua senha"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold-gradient text-black font-semibold hover:opacity-90 py-3"
                >
                  {loading ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAuth;
