
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useClientOnlyAuth } from '@/hooks/useClientOnlyAuth';
import { useCompanySlug } from '@/hooks/useCompanySlug';
import { supabase } from '@/integrations/supabase/client';
import ClientAuth from '@/components/client/ClientAuth';
import ClientDashboard from '@/components/client/ClientDashboard';

const ClientDashboardPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { empresaSlug, ownerId, loading: slugLoading, error: slugError } = useCompanySlug();
  const { user, loading: authLoading, clientProfile, hasAccessToThisProfessional } = useClientOnlyAuth(empresaSlug || undefined);

  console.log('ClientDashboardPage - user:', user?.id, 'clientProfile:', clientProfile, 'ownerId:', ownerId);

  // Loading states
  if (slugLoading || authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (slugError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Erro</h1>
          <p className="text-gray-400">{slugError}</p>
        </div>
      </div>
    );
  }

  // Se não há usuário autenticado, mostrar login
  if (!user) {
    return <ClientAuth />;
  }

  // Verificar se cliente tem acesso a este profissional específico
  console.log('🔍 [DEBUG DASHBOARD] Estado de verificação:', { 
    user: !!user, 
    clientProfile: !!clientProfile, 
    hasAccessToThisProfessional,
    empresaSlug,
    ownerId 
  });
  
  if (user && clientProfile && hasAccessToThisProfessional === false) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Acesso Negado</h1>
          <p className="text-gray-400 mb-4">
            Você não tem acesso a este profissional. Cada cliente é específico para o profissional que forneceu o link de cadastro.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Se deseja agendar com este profissional, você precisa criar uma nova conta usando o link fornecido por ele.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gold-gradient text-black px-6 py-2 rounded font-semibold"
            >
              Voltar ao Início
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="w-full bg-gray-600 text-white px-6 py-2 rounded font-semibold"
            >
              Fazer Novo Cadastro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se há usuário mas não há perfil de cliente, é um profissional tentando acessar
  if (!clientProfile) {
    // Verificar se é um profissional (tem perfil na tabela profiles)
    React.useEffect(() => {
      if (user?.id) {
        supabase
          .from('profissional_profiles')
          .select('tipo_usuario')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.tipo_usuario === 'profissional') {
              navigate('/dashboard', { replace: true });
              return;
            }
            if (data?.tipo_usuario === 'admin') {
              navigate('/admin', { replace: true });
              return;
            }
          });
      }
    }, [user?.id, navigate]);

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Acesso Negado</h1>
          <p className="text-gray-400 mb-4">Esta área é exclusiva para clientes.</p>
          <p className="text-gray-500 text-sm mb-4">
            Se você é um profissional, utilize a área administrativa.
          </p>
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="bg-gold-gradient text-black px-6 py-2 rounded font-semibold mr-2"
          >
            Dashboard Profissional
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="bg-gray-600 text-white px-6 py-2 rounded font-semibold"
          >
            Página Inicial
          </button>
        </div>
      </div>
    );
  }

  const handleNewAppointment = () => {
    navigate(`/${empresaSlug}`, { replace: true });
  };

  return (
    <ClientDashboard 
      ownerId={ownerId || 'demo-owner'} 
      onNewAppointment={handleNewAppointment}
    />
  );
};

export default ClientDashboardPage;
