
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import AccessBlock from '@/components/AccessBlock';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardContent from '@/components/dashboard/DashboardContent';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  // TODOS OS HOOKS DEVEM ser declarados primeiro, antes de qualquer early return
  const { user, loading: authLoading } = useAuth();
  const { hasValidAccess, loading: subscriptionLoading, refetch } = useSubscription();
  const [activeTab, setActiveTab] = useState('agendamentos');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [empresaSlug, setEmpresaSlug] = useState<string>('');
  const [accessChecked, setAccessChecked] = useState(false);

  // Verificar se voltou do pagamento com sucesso
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId && user) {
      console.log('🎉 Pagamento realizado com sucesso, verificando status...');
      
      // Verificar o pagamento no Stripe e atualizar assinatura
      const checkPaymentSuccess = async () => {
        try {
          // Aguardar um pouco para o webhook processar primeiro
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const { data, error } = await supabase.functions.invoke('check-stripe-payment');
          
          if (error) {
            console.error('Erro ao verificar pagamento:', error);
            toast({
              title: "Verificando pagamento...",
              description: "Estamos processando seu pagamento. A página será atualizada automaticamente.",
            });
            
            // Tentar novamente após alguns segundos
            setTimeout(() => {
              window.location.reload();
            }, 5000);
          } else if (data?.success) {
            console.log('✅ Assinatura atualizada com sucesso');
            await refetch();
            toast({
              title: "Pagamento confirmado! 🎉",
              description: "Sua assinatura foi ativada com sucesso. Bem-vindo ao Right Time!",
            });
            
            // Limpar parâmetros da URL
            setSearchParams({});
            
            // Recarregar para garantir que tudo está atualizado
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            toast({
              title: "Processando pagamento...",
              description: "Seu pagamento está sendo processado. A página será atualizada automaticamente.",
            });
            
            // Tentar novamente
            setTimeout(() => {
              window.location.reload();
            }, 5000);
          }
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error);
          toast({
            title: "Processando...",
            description: "Verificando status do pagamento. A página será atualizada em breve.",
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }
      };

      checkPaymentSuccess();
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Pagamento cancelado",
        description: "O pagamento foi cancelado. Você pode tentar novamente quando quiser.",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, user, refetch, toast, setSearchParams]);

  useEffect(() => {
    const fetchEmpresaSlug = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profissional_profiles')
            .select('empresa_slug')
            .eq('id', user.id)
            .single();
          
          if (!error && data?.empresa_slug) {
            setEmpresaSlug(data.empresa_slug);
          }
        } catch (error) {
          console.error('Erro ao buscar slug da empresa:', error);
        }
      }
    };

    fetchEmpresaSlug();
  }, [user?.id]);

  // Verificar se é profissional antes de permitir acesso - EXCLUSIVAMENTE PROFISSIONAIS
  useEffect(() => {
    const checkProfessionalAccess = async () => {
      setAccessChecked(false);
      
      if (user && !authLoading) {
        try {
          console.log('🔒 Verificando acesso profissional para:', user.email);
          
          // PRIMEIRA verificação: DEVE existir na tabela profissional_profiles
          const { data: profissionalProfile, error: profError } = await supabase
            .from('profissional_profiles')
            .select('id, tipo_usuario, nome, empresa')
            .eq('id', user.id)
            .maybeSingle();

          // Se NÃO existe na tabela profissional_profiles, NEGAR ACESSO
          if (profError || !profissionalProfile) {
            console.log('❌ ACESSO NEGADO: Usuário não está cadastrado como profissional');
            
            // Verificar se é admin para redirecionar corretamente
            const { data: adminProfile } = await supabase
              .from('profiles')
              .select('tipo_usuario')
              .eq('id', user.id)
              .maybeSingle();

            if (adminProfile?.tipo_usuario === 'admin') {
              console.log('🔀 Redirecionando admin para área administrativa');
              toast({
                title: "Acesso de Admin",
                description: "Administradores devem usar a área administrativa.",
              });
              navigate('/admin-dashboard');
              return;
            }

            // Verificar se é cliente para dar mensagem específica
            const { data: clienteProfile } = await supabase
              .from('cliente_profiles')
              .select('id')
              .eq('id', user.id)
              .maybeSingle();

            if (clienteProfile) {
              console.log('🚫 ACESSO NEGADO: Usuário é cliente tentando acessar área profissional');
              toast({
                title: "Acesso Negado",
                description: "Esta área é exclusiva para profissionais. Clientes devem usar a área de agendamento.",
                variant: "destructive",
              });
            } else {
              console.log('🚫 ACESSO NEGADO: Usuário não cadastrado no sistema');
              toast({
                title: "Acesso Negado",
                description: "Você não tem permissão para acessar esta área.",
                variant: "destructive",
              });
            }
            
            await supabase.auth.signOut();
            navigate('/');
            return;
          }

          // SEGUNDA verificação: garantir que tipo_usuario é 'profissional'
          if (profissionalProfile.tipo_usuario && profissionalProfile.tipo_usuario !== 'profissional') {
            console.log('❌ ACESSO NEGADO: tipo_usuario inválido:', profissionalProfile.tipo_usuario);
            toast({
              title: "Acesso Negado", 
              description: "Apenas usuários do tipo 'profissional' podem acessar esta área.",
              variant: "destructive",
            });
            await supabase.auth.signOut();
            navigate('/');
            return;
          }

          console.log('✅ ACESSO AUTORIZADO para profissional:', profissionalProfile.nome);
          setAccessChecked(true);
          
        } catch (error) {
          console.error('❌ Erro na verificação de acesso:', error);
          toast({
            title: "Erro de Verificação",
            description: "Erro ao verificar permissões. Fazendo logout por segurança.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          navigate('/');
        }
      } else if (!user && !authLoading) {
        console.log('🔓 Nenhum usuário logado, redirecionando para home');
        navigate('/');
      }
    };

    checkProfessionalAccess();
  }, [user, authLoading, navigate, toast]);

  const handleUpgrade = () => {
    setActiveTab('assinatura');
  };

  const handleViewPublicBooking = () => {
    if (user?.id) {
      if (empresaSlug) {
        navigate(`/${empresaSlug}`);
      } else {
        navigate(`/agendamento?owner=${user.id}`);
      }
    } else {
      navigate('/agendamento');
    }
  };


  // Aguardar carregamento e verificação de acesso
  if (authLoading || subscriptionLoading || !accessChecked) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p>Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Se não está logado, redirecionar para home
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <Crown className="h-16 w-16 text-gold-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
          <p className="text-gray-400 mb-6">Você precisa estar logado como profissional para acessar o dashboard.</p>
          <Button onClick={() => window.location.href = '/'} className="bg-gold-gradient text-black font-semibold">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  // IMPORTANTE: Só mostrar AccessBlock se comprovadamente não tem acesso válido
  if (hasValidAccess === false) {
    return <AccessBlock onUpgrade={handleUpgrade} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader 
        onViewPublicBooking={handleViewPublicBooking} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <DashboardContent activeTab={activeTab} />
    </div>
  );
};

export default Dashboard;
