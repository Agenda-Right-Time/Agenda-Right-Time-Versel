
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireUserType?: 'admin' | 'profissional' | 'cliente';
  redirectTo?: string;
}

const AuthGuard = ({ children, requireUserType, redirectTo = '/login' }: AuthGuardProps) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user && requireUserType) {
      console.log(`AuthGuard: Usuário não autenticado, redirecionando para ${redirectTo}`);
      window.location.href = redirectTo;
    }
  }, [user, loading, requireUserType, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400 mx-auto mb-4"></div>
          <p>Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Se não requer tipo específico, só verificar se está logado
  if (!requireUserType) {
    return user ? <>{children}</> : null;
  }

  // Se requer tipo específico, verificar autenticação
  return user ? <>{children}</> : null;
};

export default AuthGuard;
