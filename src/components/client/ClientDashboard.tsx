
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useClientOnlyAuth } from '@/hooks/useClientOnlyAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Crown, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClientAppointments from './ClientAppointments';
import EstablishmentProfile from './EstablishmentProfile';

interface ClientDashboardProps {
  ownerId: string;
  onNewAppointment: () => void;
}

const ClientDashboard = ({ ownerId, onNewAppointment }: ClientDashboardProps) => {
  // TODOS OS HOOKS DEVEM SER DECLARADOS PRIMEIRO
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useClientOnlyAuth(ownerId);
  const { toast } = useToast();
  const [empresaSlug, setEmpresaSlug] = useState<string>('');

  // Variáveis computadas após hooks
  const activeTab = searchParams.get('tab') || 'meus-agendamentos';

  useEffect(() => {
    const fetchEmpresaSlug = async () => {
      if (ownerId) {
        try {
          const { data, error } = await supabase
            .from('profissional_profiles')
            .select('empresa_slug')
            .eq('id', ownerId)
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
  }, [ownerId]);

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast({
          title: "Erro ao sair",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado da sua conta."
      });
      
      // ROTA LIMPA - voltar para página de agendamento usando apenas empresa_slug
      if (empresaSlug) {
        navigate(`/${empresaSlug}`, { replace: true });
      } else {
        navigate(`/`, { replace: true });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao sair.",
        variant: "destructive"
      });
    }
  };

  const handleNewAppointment = () => {
    // ROTA LIMPA - ir para nova marcação usando apenas empresa_slug
    if (empresaSlug) {
      navigate(`/${empresaSlug}`, { replace: true });
    } else {
      navigate(`/`, { replace: true });
    }
  };

  const handleTabChange = (value: string) => {
    // ROTA LIMPA - trocar aba usando apenas empresa_slug
    if (empresaSlug) {
      navigate(`/${empresaSlug}?dashboard=true&tab=${value}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-3 sm:p-4">
       <div className="container mx-auto">
        <div className="flex items-center justify-between">
          {/* Título e identificação do cliente - lado esquerdo */}
          <div className="flex flex-col items-start">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-gold-500 flex-shrink-0" />
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent leading-tight">
                Agenda Right Time
              </h1>
            </div>
          
          <div className="flex mt-1">
            {user && (
              <span className="text-gray-300 text-sm">{user.email}</span>     
            )}
          </div> 
          </div>  

          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs sm:text-sm px-1.5 py-0.5 h-6 sm:px-3 sm:py-2 sm:h-9"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-2" />
              <span>Sair</span>
            </Button>

          </div>
        </div>
       </div>  
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            onClick={handleNewAppointment}
            className="h-8 bg-gold-gradient text-black text-xs font-semibold hover:opacity-90 px-4 py-3"
          >
            <Plus className="mr-2" />
            Novo Agendamento
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger 
              value="meus-agendamentos"
              className="data-[state=active]:bg-gold-500 data-[state=active]:text-black"
            >
              Meus Agendamentos
            </TabsTrigger>
            <TabsTrigger 
              value="estabelecimento"
              className="data-[state=active]:bg-gold-500 data-[state=active]:text-black"
            >
              Estabelecimento
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="meus-agendamentos" className="mt-6">
            <ClientAppointments 
              ownerId={ownerId}
            />
          </TabsContent>
          
          <TabsContent value="estabelecimento" className="mt-6">
            <EstablishmentProfile ownerId={ownerId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDashboard;
