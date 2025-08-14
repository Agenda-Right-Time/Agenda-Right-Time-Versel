import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useProfessionalAuth } from "@/hooks/useProfessionalAuth";
import { ArrowRight, Mail, Lock, Calendar, X, Building, Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TrialSignupProps {
  onClose: () => void;
  initialLoginMode?: boolean;
}

const TrialSignup = ({ onClose, initialLoginMode = false }: TrialSignupProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(initialLoginMode);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signInProfessional, signUpProfessional } = useProfessionalAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Função para filtrar caracteres inválidos para URL
  const filterUrlCharacters = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '') // Remove tudo exceto letras, números,hífens e underlines
      .replace(/--+/g, '-') // Remove múltiplos hífens consecutivos
      .replace(/__+/g, '_') // Remove múltiplos underline consecutivos
      .replace(/^-|$/g, '') // Remove hífens no início
      .replace(/^_|$/g, '') // Remove underline no início
      .substring(0, 20); // Limita a 20 caracteres
  };

  // Handle empresa input with URL filtering
  const handleEmpresaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const filteredValue = filterUrlCharacters(rawValue);
    setEmpresa(filteredValue);
  };

  // Gerar preview do slug da empresa
  const empresaSlug = empresa.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 20);

  // Verificar disponibilidade do slug
  useEffect(() => {
    const checkSlugAvailability = async () => {
      if (!empresa || empresa.length < 3) {
        setSlugAvailable(null);
        return;
      }

      setCheckingSlug(true);
      
      try {
        const { data, error } = await supabase
          .from('profissional_profiles')
          .select('id')
          .eq('empresa', empresa)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao verificar slug:', error);
          setSlugAvailable(null);
        } else {
          setSlugAvailable(!data);
        }
      } catch (error) {
        console.error('Erro na verificação:', error);
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    };

    const timeoutId = setTimeout(checkSlugAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [empresa]);

  const handleTrialSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('🚀 Iniciando cadastro de profissional...');
      
      if (!nome.trim()) {
        toast({
          title: "Erro na validação",
          description: "Nome é obrigatório",
          variant: "destructive"
        });
        return;
      }

      if (!empresa.trim()) {
        toast({
          title: "Erro na validação",
          description: "Nome da empresa é obrigatório",
          variant: "destructive"
        });
        return;
      }

      if (slugAvailable === false) {
        toast({
          title: "Erro na validação",
          description: "Este nome de empresa já está em uso. Tente outro.",
          variant: "destructive"
        });
        return;
      }

      if (!email.trim()) {
        toast({
          title: "Erro na validação", 
          description: "Email é obrigatório",
          variant: "destructive"
        });
        return;
      }

      if (!password || password.length < 6) {
        toast({
          title: "Erro na validação", 
          description: "Senha deve ter pelo menos 6 caracteres",
          variant: "destructive"
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Erro na validação", 
          description: "As senhas não coincidem",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await signUpProfessional(email, password, nome, empresaSlug);

      if (error) {
        console.error('❌ Erro no signup do profissional:', error);
        
        let errorMessage = "Ocorreu um erro ao criar a conta.";
        
        if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
          errorMessage = "Este email já está cadastrado. Tente fazer login.";
        } else if (error.message?.includes('invalid email')) {
          errorMessage = "Email inválido. Verifique e tente novamente.";
        } else if (error.message?.includes('weak password')) {
          errorMessage = "Senha muito fraca. Use pelo menos 6 caracteres.";
        }
        
        toast({
          title: "Erro ao criar conta",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Teste grátis ativado! 🎉",
        description: `Sua conta de 7 dias foi criada com sucesso! URL: /${empresaSlug}`,
      });
      
      setTimeout(() => {
        onClose();
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('❌ Erro inesperado no signup:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('🔑 Tentando fazer login de profissional...');
      console.log('🌐 Domínio atual:', window.location.hostname);
      console.log('📧 Email do login:', email);
      console.log('🗄️ LocalStorage antes do login:', Object.keys(localStorage).filter(k => k.includes('supabase')));
      
      const { error } = await signInProfessional(email, password);

      if (error) {
        console.error('❌ Erro no login:', error);
        console.log('🔍 Tipo do erro:', typeof error);
        console.log('🔍 Estrutura completa do erro:', JSON.stringify(error, null, 2));
        
        let errorMessage = "Erro ao fazer login.";
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = "Email ou senha incorretos.";
        } else if (error.message?.includes('Acesso negado')) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Erro ao fazer login",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      // Verificar estado imediatamente após login bem-sucedido
      console.log('✅ Login retornou sucesso, verificando estado...');
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('📊 Sessão pós-login:', sessionData.session?.user?.email);
      console.log('🗄️ LocalStorage após login:', Object.keys(localStorage).filter(k => k.includes('supabase')));
      
      // Verificar se usuário está em profissional_profiles
      if (sessionData.session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profissional_profiles')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
          
        console.log('👤 Perfil profissional encontrado:', profile);
        if (profileError) console.error('❌ Erro ao buscar perfil:', profileError);
      }

      toast({
        title: "Login realizado com sucesso! 🎉",
        description: "Redirecionando para o dashboard...",
      });
      
      setTimeout(() => {
        onClose();
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('❌ Erro inesperado no login:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSlugStatusIcon = () => {
    if (checkingSlug) {
      return <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />;
    }
    if (slugAvailable === true) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    if (slugAvailable === false) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getSlugStatusText = () => {
    if (checkingSlug) return "Verificando disponibilidade...";
    if (slugAvailable === true) return <span className="text-gray-400">✅ Disponível</span>;
    if (slugAvailable === false) return <span className="text-gray-400">❌ Já existe</span>;
    return "";
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center p-4 z-50 overflow-y-auto scrollbar-hide">
      <Card className="bg-gray-900 border-gray-700 p-8 max-w-md w-full relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="text-center mb-6">
          <Calendar className="h-12 w-12 text-gold-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLoginMode ? "Entrar como Profissional" : "Teste Grátis por 7 Dias"}
          </h2>
        {isLoginMode && (
          <p className="text-gray-400">
          Conta profissional{" "}
          <span className="text-gold-500 bg-gradient-to-r font-semibold">Agenda Right Time</span>
          </p>
        )}
          {!isLoginMode && (
            <div className="mt-4 p-3 bg-gold-500/10 border border-gold-500/30 rounded-lg">
              <p className="text-gold-400 text-sm font-medium">
                ✨ Após o trial: R$ 35,99/mês
              </p>
            </div>
          )}
        </div>

        <form onSubmit={isLoginMode ? handleLogin : handleTrialSignup} className="space-y-4">
          {!isLoginMode && (
            <>
              <div>
                <Label htmlFor="nome" className="text-gray-300">Nome Completo</Label>
                <div className="relative mt-1">
                  <Input
                    id="nome"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="empresa" className="text-gray-300">
                  Nome da Empresa <span className="text-xs text-gold-400">(letras, números e hífen)</span>
                </Label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="empresa"
                    type="text"
                    value={empresa}
                    onChange={handleEmpresaChange}
                    className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white"
                    placeholder="ex: salao-maria, barbearia-joao"
                    required
                  />
                  <div className="absolute right-3 top-3">
                    {getSlugStatusIcon()}
                  </div>
                </div>
                
                {empresa && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded border border-gray-600">
                    <p className="text-xs text-gray-400 mb-1">Seu link de agendamento:</p>
                    <p className="text-xs font-mono text-gold-400 mb-1">
                      agendarighttime.com.br/<span className="bg-gold-500/20 px-1 rounded">{empresa || 'nomedaempresa'}</span>
                    </p>
                    {empresa && (
                      <p className="text-xs mt-1 flex items-center gap-1">
                        {getSlugStatusText()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email" className="text-gray-300">
              Email { !isLoginMode && <span className="text-xs text-gold-400">(Use como chave PIX da sua conta)</span> }
            </Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-600 text-white"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-300">Senha</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {!isLoginMode && (
            <div>
              <Label htmlFor="confirmPassword" className="text-gray-300">Confirmar Senha</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white"
                  placeholder="Confirme sua senha"
                  minLength={6}
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
          )}

          {!isLoginMode && (
            <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4 text-center">
              <p className="text-gold-400 text-sm font-medium">
                ✨ Cancele quando quiser
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-900 hover:bg-gray-800"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gold-gradient hover:opacity-90 text-black font-semibold"
              disabled={isLoading || (!isLoginMode && slugAvailable === false)}
            >
              {isLoading 
                ? (isLoginMode ? 'Entrando...' : 'Criando...') 
                : (isLoginMode ? 'Entrar' : 'Começar Teste')
              }
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>

          <div className="text-center pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-gold-400 hover:text-gold-300 text-sm transition-colors"
            >
              {isLoginMode 
                ? "Não tem conta? Comece seu teste grátis" 
                : "Já tem conta? Fazer login"
              }
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TrialSignup;
