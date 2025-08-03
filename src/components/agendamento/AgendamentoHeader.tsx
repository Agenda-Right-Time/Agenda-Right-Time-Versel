
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, LogOut } from 'lucide-react';
import { useClientOnlyAuth } from '@/hooks/useClientOnlyAuth';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AgendamentoHeaderProps {
  businessName?: string;
  showClientDashboard?: boolean;
  onShowDashboard?: () => void;
  clientnome?: string;
}

const AgendamentoHeader = ({ 
  businessName, 
  showClientDashboard = false, 
  onShowDashboard,
  clientnome
}: AgendamentoHeaderProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ownerId = searchParams.get('owner');
  const { user, signOut } = useClientOnlyAuth();
  const { toast } = useToast();
  const [empresaSlug, setEmpresaSlug] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmpresaSlug = async () => {
      console.log('ownerId dos searchParams:', ownerId);
      console.log('Todos os searchParams:', Object.fromEntries(searchParams));
      console.log('URL atual:', window.location.href);
      
      // Se não temos ownerId dos searchParams, tentar extrair da URL atual
      let targetOwnerId = ownerId;
      
      if (!targetOwnerId) {
        // Tentar extrair o slug da empresa da URL atual (ex: /agendamento/tatadocorte)
        const pathParts = window.location.pathname.split('/');
        console.log('Path parts:', pathParts);
        
        if (pathParts.length >= 3 && pathParts[1] === 'agendamento') {
          const empresaSlugFromUrl = pathParts[2];
          console.log('Empresa slug da URL:', empresaSlugFromUrl);
          
          if (empresaSlugFromUrl) {
            // Buscar o ownerId pelo empresaSlug
            try {
              const { data } = await supabase
                .from('profissional_profiles')
                .select('id')
                .eq('empresa_slug', empresaSlugFromUrl)
                .maybeSingle();
              
              console.log('Profissional encontrado pela URL:', data);
              
              if (data?.id) {
                targetOwnerId = data.id;
                setEmpresaSlug(empresaSlugFromUrl);
                return;
              }
            } catch (error) {
              console.error('Erro ao buscar profissional pelo slug da URL:', error);
            }
          }
        }
        
        console.log('ownerId não encontrado, não é possível buscar empresa_slug');
        return;
      }
      
      console.log('Buscando empresa_slug para ownerId:', targetOwnerId);
      
      try {
        const { data, error } = await supabase
          .from('profissional_profiles')
          .select('empresa_slug')
          .eq('id', targetOwnerId)
          .maybeSingle();
        
        console.log('Resultado da busca:', data, 'Error:', error);
        
        if (data?.empresa_slug) {
          console.log('Empresa slug encontrado:', data.empresa_slug);
          setEmpresaSlug(data.empresa_slug);
        } else {
          console.log('Empresa slug não encontrado');
        }
      } catch (error) {
        console.error('Erro ao buscar empresa_slug:', error);
      }
    };

    fetchEmpresaSlug();
  }, [ownerId, searchParams]);

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
      
      // Redirecionar para a página de login do cliente com o slug do profissional
      console.log('Redirecionando com empresaSlug:', empresaSlug);
      if (empresaSlug) {
        console.log('Navegando para:', `/${empresaSlug}`);
        navigate(`/${empresaSlug}`, { replace: true });
      } 
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao sair.",
        variant: "destructive"
      });
    }
  };

  return (
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
          </div>  
        </div>
       </div>  
      </header>
  );
};

export default AgendamentoHeader;
