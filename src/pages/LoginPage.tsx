
import { useState, useEffect } from "react";
import TrialSignup from "@/components/TrialSignup";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const [showTrialSignup, setShowTrialSignup] = useState(true);
  const [showLoginMode, setShowLoginMode] = useState(true);

  useEffect(() => {
    console.log('🌐 LoginPage carregado no domínio:', window.location.hostname);
    console.log('🔗 URL completa:', window.location.href);
    console.log('🔧 Ambiente de produção:', process.env.NODE_ENV);
    
    // Testar conexão com Supabase
    supabase.auth.getSession().then(({ data, error }) => {
      console.log('🔍 Sessão atual:', data.session?.user?.email || 'Nenhuma');
      console.log('📊 Session data completa:', data.session);
      console.log('🍪 LocalStorage keys:', Object.keys(localStorage));
      if (error) console.error('❌ Erro ao obter sessão:', error);
    });

    // Testar se consegue fazer uma query simples  
    supabase.from('profissional_profiles').select('count').then(({ data, error }) => {
      console.log('🎯 Teste de query profissional_profiles:', { data, error });
    });

    // Verificar se há diferenças no storage entre domínios
    console.log('🗄️ localStorage supabase keys:', 
      Object.keys(localStorage).filter(k => k.includes('supabase'))
    );
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Agenda Right Time</h1>
          <p className="text-gray-400">Faça login para acessar sua conta</p>
        </div>

        {showTrialSignup && (
          <TrialSignup 
            onClose={() => setShowTrialSignup(false)} 
            initialLoginMode={showLoginMode}
          />
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => setShowLoginMode(!showLoginMode)}
            className="text-gold-500 hover:text-gold-400 text-sm"
          >
            {showLoginMode ? 'Não tem conta? Criar conta' : 'Já tem conta? Fazer login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
