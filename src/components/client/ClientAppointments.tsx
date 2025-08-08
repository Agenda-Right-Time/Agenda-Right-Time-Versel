
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useClientOnlyAuth } from '@/hooks/useClientOnlyAuth';
import { RefreshCw, History, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import AppointmentCard from './AppointmentCard';
import EmptyAppointments from './EmptyAppointments';

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  valor: number;
  observacoes?: string;
  servicos: {
    nome: string;
    duracao: number;
  };
  profissionais: {
    nome: string;
    especialidade: string;
  };
  pagamentos: {
    status: string;
    valor: number;
  }[];
  isPacoteMensal?: boolean;
  pacoteInfo?: {
    sequencia: number;
    pacoteId: string;
    valorTotal: number;
    agendamentosPacote?: Agendamento[];
    sessoesCanceladas?: number;
    sessoesConcluidas?: number;
    sessoesPendentes?: number;
  };
}

interface ClientAppointmentsProps {
  ownerId: string;
  refreshTrigger?: number;
}

const ClientAppointments = ({ ownerId, refreshTrigger }: ClientAppointmentsProps) => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historicos, setHistoricos] = useState<Agendamento[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { clientProfile } = useClientOnlyAuth(ownerId);
  const { toast } = useToast();

  // Função para verificar se é um UUID válido
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };


  const fetchAgendamentos = useCallback(async () => {
    try {
      // Só mostrar loading na primeira vez ou quando não há dados
      if (agendamentos.length === 0) {
        setLoading(true);
      }
      console.log('🔍 Buscando agendamentos para:', clientProfile?.email || 'sem email', 'owner:', ownerId);

      // Se não tem perfil de cliente ou é um ID inválido, não carregar dados
      if (!isValidUUID(ownerId)) {
        console.log('📋 ID inválido:', ownerId);
        setAgendamentos([]);
        setLoading(false);
        return;
      }

      // Buscar pelo perfil de cliente OU pelo ID do usuário se não tiver perfil
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📋 Usuário não autenticado');
        setAgendamentos([]);
        setLoading(false);
        return;
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataAtual = hoje.toISOString();

      // Buscar agendamentos normais confirmados OU agendados
      // Buscar tanto por cliente_email quanto por cliente_id para incluir agendamentos da dashboard
      let query = supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          valor,
          observacoes,
          cliente_id,
          servicos!inner(nome, duracao),
          profissionais!inner(nome, especialidade),
          pagamentos(status, valor)
        `)
        .eq('user_id', ownerId)
        .in('status', ['confirmado', 'agendado', 'pendente', 'concluido']) // Incluir concluidos para pacotes mensais
        .gte('data_hora', dataAtual)
        .order('data_hora', { ascending: true });

      // Se tem perfil de cliente, buscar por cliente_id
      if (clientProfile?.id) {
        query = query.eq('cliente_id', clientProfile.id);
      } else {
        // Se não tem perfil de cliente, buscar por cliente_id igual ao próprio user ID
        // ou por email do usuário, dependendo de como foi cadastrado o agendamento
        query = query.or(`cliente_id.eq.${user.id},cliente_email.eq.${user.email}`);
      }

      const { data: normalData, error: normalError } = await query;

      if (normalError) {
        console.error('❌ Erro ao buscar agendamentos normais:', normalError);
      }

      // Buscar todos os pacotes mensais ATIVOS (incluindo cancelados/concluídos) para processar corretamente as sessões
      const pacotesEncontrados = new Map<string, any[]>();
      
      // Primeiro, identificar todos os pacotes mensais
      if (normalData) {
        for (const agendamento of normalData) {
          const observacoes = agendamento.observacoes || '';
          const isPacoteMensal = observacoes.includes('PACOTE MENSAL');
          
          if (isPacoteMensal) {
            const pacoteMatch = observacoes.match(/PACOTE MENSAL (PMT\d+)/);
            const pacoteId = pacoteMatch ? pacoteMatch[1] : '';
            
            if (pacoteId && !pacotesEncontrados.has(pacoteId)) {
              // Buscar TODOS os agendamentos do pacote (incluindo cancelados e concluídos)
              const { data: allPacoteData } = await supabase
                .from('agendamentos')
                .select(`
                  id,
                  data_hora,
                  status,
                  valor,
                  observacoes,
                  servicos!inner(nome, duracao),
                  profissionais!inner(nome, especialidade),
                  pagamentos(status, valor)
                `)
                .eq('user_id', ownerId)
                .ilike('observacoes', `%${pacoteId}%`)
                .order('data_hora', { ascending: true });

              pacotesEncontrados.set(pacoteId, allPacoteData || []);
            }
          }
        }
      }

      // Processar agendamentos
      const agendamentosProcessados: Agendamento[] = [];
      const pacotesProcessados = new Set<string>();

      for (const agendamento of normalData || []) {
        const observacoes = agendamento.observacoes || '';
        const isPacoteMensal = observacoes.includes('PACOTE MENSAL');
        
        if (isPacoteMensal) {
          // Extrair ID do pacote das observações
          const pacoteMatch = observacoes.match(/PACOTE MENSAL (PMT\d+)/);
          const pacoteId = pacoteMatch ? pacoteMatch[1] : '';
          const sequenciaMatch = observacoes.match(/Sessão (\d+)\/4/);
          const sequencia = sequenciaMatch ? parseInt(sequenciaMatch[1]) : 1;

          // Se é qualquer sessão do pacote e ainda não foi processado
          if (pacoteId && !pacotesProcessados.has(pacoteId)) {
            pacotesProcessados.add(pacoteId);

            const agendamentosPacote = pacotesEncontrados.get(pacoteId) || [];

            // Contar sessões por status
            const sessoesCanceladas = agendamentosPacote.filter(a => a.status === 'cancelado').length;
            const sessoesConcluidas = agendamentosPacote.filter(a => a.status === 'concluido').length;
            const sessoesPendentes = agendamentosPacote.filter(a => 
              a.status !== 'cancelado' && a.status !== 'concluido'
            ).length;
            
            // Mostrar o pacote se há pelo menos uma sessão ativa OU se há sessões canceladas/concluídas para mostrar na dashboard
            if (sessoesPendentes > 0 || sessoesCanceladas > 0 || sessoesConcluidas > 0) {
              const valorTotal = agendamentosPacote.reduce((total, a) => total + (a.valor || 0), 0);
              
              // Determinar status do pacote baseado nos pagamentos de QUALQUER sessão do pacote
              // CORREÇÃO: Verificar pagamento em TODAS as sessões, não apenas as ativas
              const hasPaidPayment = agendamentosPacote.some(a => a.pagamentos?.some((p: any) => p.status === 'pago'));
              const hasPendingPayment = agendamentosPacote.some(a => a.pagamentos?.some((p: any) => p.status === 'pendente'));
              
              // Filtrar sessões ativas apenas para exibição
              const sessoesAtivas = agendamentosPacote.filter(a => 
                a.status !== 'cancelado' && a.status !== 'concluido'
              );
              
              let pacoteStatus = 'agendado';
              if (hasPaidPayment || sessoesAtivas.some(a => a.status === 'confirmado')) {
                pacoteStatus = 'confirmado';
              } else if (hasPendingPayment) {
                pacoteStatus = 'pendente';
              }

              agendamentosProcessados.push({
                id: agendamento.id,
                data_hora: agendamento.data_hora,
                status: pacoteStatus,
                valor: valorTotal,
                observacoes: agendamento.observacoes,
                servicos: Array.isArray(agendamento.servicos) 
                  ? agendamento.servicos[0] 
                  : agendamento.servicos as { nome: string; duracao: number },
                profissionais: Array.isArray(agendamento.profissionais)
                  ? agendamento.profissionais[0]
                  : agendamento.profissionais as { nome: string; especialidade: string },
                pagamentos: Array.isArray(agendamento.pagamentos) ? agendamento.pagamentos : (agendamento.pagamentos ? [agendamento.pagamentos] : []),
                isPacoteMensal: true,
                pacoteInfo: {
                  sequencia: 1,
                  pacoteId,
                  valorTotal,
                  sessoesCanceladas,
                  sessoesConcluidas,
                  sessoesPendentes,
                  // Incluir APENAS sessões ativas para mostrar no card
                  agendamentosPacote: sessoesAtivas.map(a => ({
                    id: a.id,
                    data_hora: a.data_hora,
                    status: a.status,
                    valor: a.valor || 0,
                    observacoes: a.observacoes,
                    servicos: Array.isArray(a.servicos) ? a.servicos[0] : a.servicos as { nome: string; duracao: number },
                    profissionais: Array.isArray(a.profissionais) ? a.profissionais[0] : a.profissionais as { nome: string; especialidade: string },
                    pagamentos: a.pagamentos || []
                  }))
                }
              });
            }
          }
        } else {
          // Agendamento normal
          agendamentosProcessados.push({
            id: agendamento.id,
            data_hora: agendamento.data_hora,
            status: agendamento.status,
            valor: agendamento.valor,
            observacoes: agendamento.observacoes,
            servicos: Array.isArray(agendamento.servicos) 
              ? agendamento.servicos[0] 
              : agendamento.servicos as { nome: string; duracao: number },
            profissionais: Array.isArray(agendamento.profissionais)
              ? agendamento.profissionais[0]
              : agendamento.profissionais as { nome: string; especialidade: string },
            pagamentos: Array.isArray(agendamento.pagamentos) ? agendamento.pagamentos : (agendamento.pagamentos ? [agendamento.pagamentos] : []),
            isPacoteMensal: false
          });
        }
      }

      console.log('📊 Agendamentos processados:', agendamentosProcessados.length);
      console.log('📊 Agendamentos atuais na tela:', agendamentos.length);
      
      // Sempre atualizar a lista de agendamentos
      console.log('✅ Atualizando agendamentos na tela');
      setAgendamentos(agendamentosProcessados);
    } catch (error) {
      console.error('❌ Erro ao buscar agendamentos:', error);
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId, clientProfile, refreshTrigger]); // Dependências sem loop infinito

  // Unificando todos os useEffect em um só para evitar conflitos
  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    const initializeData = async () => {
      if (mounted) {
        await fetchAgendamentos();
      }
    };

    // Setup real-time listener apenas uma vez
    const setupRealtimeListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !ownerId || !mounted) return;

      console.log('🔄 Configurando listener real-time para agendamentos');
      
      channel = supabase
        .channel('client-agendamentos-unified')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agendamentos',
            filter: `user_id=eq.${ownerId}`
          },
          (payload) => {
            console.log('🔄 Mudança em agendamento detectada:', payload);
            if (mounted) {
              // Atualização IMEDIATA quando o agendamento muda
              setTimeout(() => {
                if (mounted) fetchAgendamentos();
              }, 500); // Reduzido de 3000ms para 500ms
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pagamentos'
          },
          (payload) => {
            console.log('🔄 Mudança em pagamento detectada:', payload);
            if (mounted) {
              // Atualização IMEDIATA quando pagamento muda
              setTimeout(() => {
                if (mounted) fetchAgendamentos();
              }, 500); // Reduzido de 3000ms para 500ms
            }
          }
        )
        .subscribe();
    };

    // Handler para quando a página fica visível novamente
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        console.log('🔄 Página visível novamente, atualizando agendamentos...');
        fetchAgendamentos();
      }
    };

    // Verificar se veio de redirect de pagamento
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'meus-agendamentos') {
      console.log('🔄 Redirecionado para agendamentos, carregando dados...');
    }

    // Inicializar
    initializeData();
    setupRealtimeListener();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      mounted = false;
      console.log('🔌 Removendo listeners');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [clientProfile, ownerId, fetchAgendamentos]); // Dependências simplificadas

  const fetchHistorico = async () => {
    setLoadingHistory(true);
    try {
      console.log('📖 Buscando histórico de agendamentos...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar agendamentos dos últimos 30 dias (incluindo cancelados e concluídos)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      let query = supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          valor,
          observacoes,
          cliente_id,
          servicos!inner(nome, duracao),
          profissionais!inner(nome, especialidade),
          pagamentos(status, valor)
        `)
        .eq('user_id', ownerId)
        .gte('data_hora', thirtyDaysAgoISO)
        .order('data_hora', { ascending: false });

      // Se tem perfil de cliente, buscar por cliente_id
      if (clientProfile?.id) {
        query = query.eq('cliente_id', clientProfile.id);
      } else {
        // Se não tem perfil de cliente, buscar por cliente_id igual ao próprio user ID
        // ou por email do usuário, dependendo de como foi cadastrado o agendamento
        query = query.or(`cliente_id.eq.${user.id},cliente_email.eq.${user.email}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        throw error;
      }

      // Processar histórico (incluindo pacotes mensais)
      const historicoProcessado: Agendamento[] = [];
      const pacotesProcessados = new Set<string>();

      for (const agendamento of data || []) {
        const observacoes = agendamento.observacoes || '';
        const isPacoteMensal = observacoes.includes('PACOTE MENSAL');
        
        if (isPacoteMensal) {
          const pacoteMatch = observacoes.match(/PACOTE MENSAL (PMT\d+)/);
          const pacoteId = pacoteMatch ? pacoteMatch[1] : '';
          
          if (pacoteId && !pacotesProcessados.has(pacoteId)) {
            pacotesProcessados.add(pacoteId);

            // Buscar todos os agendamentos do pacote
            const { data: allPacoteData } = await supabase
              .from('agendamentos')
              .select(`
                id,
                data_hora,
                status,
                valor,
                observacoes,
                servicos!inner(nome, duracao),
                profissionais!inner(nome, especialidade),
                pagamentos(status, valor)
              `)
              .eq('user_id', ownerId)
              .ilike('observacoes', `%${pacoteId}%`)
              .order('data_hora', { ascending: true });

            const agendamentosPacote = allPacoteData || [];
            const valorTotal = agendamentosPacote.reduce((total, a) => total + (a.valor || 0), 0);

            historicoProcessado.push({
              id: agendamento.id,
              data_hora: agendamento.data_hora,
              status: agendamento.status,
              valor: valorTotal,
              observacoes: agendamento.observacoes,
              servicos: Array.isArray(agendamento.servicos) 
                ? agendamento.servicos[0] 
                : agendamento.servicos as { nome: string; duracao: number },
              profissionais: Array.isArray(agendamento.profissionais)
                ? agendamento.profissionais[0]
                : agendamento.profissionais as { nome: string; especialidade: string },
              pagamentos: Array.isArray(agendamento.pagamentos) ? agendamento.pagamentos : (agendamento.pagamentos ? [agendamento.pagamentos] : []),
              isPacoteMensal: true,
              pacoteInfo: {
                sequencia: 1,
                pacoteId,
                valorTotal,
                agendamentosPacote: agendamentosPacote.map(a => ({
                  id: a.id,
                  data_hora: a.data_hora,
                  status: a.status,
                  valor: a.valor || 0,
                  observacoes: a.observacoes,
                  servicos: Array.isArray(a.servicos) ? a.servicos[0] : a.servicos as { nome: string; duracao: number },
                  profissionais: Array.isArray(a.profissionais) ? a.profissionais[0] : a.profissionais as { nome: string; especialidade: string },
                  pagamentos: Array.isArray(a.pagamentos) ? a.pagamentos : (a.pagamentos ? [a.pagamentos] : [])
                }))
              }
            });
          }
        } else {
          // Agendamento normal
          historicoProcessado.push({
            id: agendamento.id,
            data_hora: agendamento.data_hora,
            status: agendamento.status,
            valor: agendamento.valor,
            observacoes: agendamento.observacoes,
            servicos: Array.isArray(agendamento.servicos) 
              ? agendamento.servicos[0] 
              : agendamento.servicos as { nome: string; duracao: number },
            profissionais: Array.isArray(agendamento.profissionais)
              ? agendamento.profissionais[0]
              : agendamento.profissionais as { nome: string; especialidade: string },
            pagamentos: Array.isArray(agendamento.pagamentos) ? agendamento.pagamentos : (agendamento.pagamentos ? [agendamento.pagamentos] : []),
            isPacoteMensal: false
          });
        }
      }

      setHistoricos(historicoProcessado);
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico.",
        variant: "destructive"
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    // Encontrar o agendamento
    const appointment = agendamentos.find(a => a.id === appointmentId);
    
    if (!appointment) {
      toast({
        title: "Erro",
        description: "Agendamento não encontrado.",
        variant: "destructive"
      });
      return;
    }

    // Não permitir cancelamento de pacotes mensais CONFIRMADOS (mas permitir se estiver pendente)
    if (appointment.isPacoteMensal && appointment.status !== 'pendente') {
      toast({
        title: "Cancelamento não permitido",
        description: "Pacotes mensais não podem ser cancelados após a confirmação.",
        variant: "destructive"
      });
      return;
    }

    // Verificar prazo apenas para agendamentos confirmados (não pendentes)
    if (appointment.status !== 'pendente') {
      // Verificar se ainda está dentro do prazo de 2 dias (48h) antes do agendamento
      const appointmentDate = new Date(appointment.data_hora);
      const now = new Date();
      const hoursUntilAppointment = Math.floor((appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (hoursUntilAppointment < 48) {
        toast({
          title: "Cancelamento não disponível",
          description: "Só é possível cancelar agendamentos com pelo menos 2 dias (48h) de antecedência.",
          variant: "destructive"
        });
        return;
      }
    }

    // Confirmar cancelamento
    const confirmMessage = appointment.isPacoteMensal 
      ? 'Tem certeza que deseja cancelar todo o pacote mensal? Todas as 4 sessões serão canceladas.'
      : 'Tem certeza que deseja cancelar este agendamento?';
      
    if (!confirm(confirmMessage)) {
      return;
    }

    setCancelling(appointmentId);
    try {
      console.log('🚫 Cancelando agendamento:', appointmentId);

      if (appointment.isPacoteMensal) {
        // Para pacotes mensais, extrair o ID do pacote e cancelar todos os agendamentos relacionados
        const pacoteMatch = appointment.observacoes?.match(/PACOTE MENSAL (PMT\d+)/);
        if (pacoteMatch) {
          const pacoteId = pacoteMatch[1];
          console.log('🗂️ Cancelando pacote completo:', pacoteId);
          
          // Buscar e cancelar todos os agendamentos do pacote
          const { data: pacoteAgendamentos, error: searchError } = await supabase
            .from('agendamentos')
            .select('id')
            .eq('user_id', ownerId)
            .like('observacoes', `%${pacoteId}%`);
          
          if (searchError) {
            console.error('❌ Erro ao buscar agendamentos do pacote:', searchError);
            throw searchError;
          }
          
          console.log('📋 Agendamentos do pacote encontrados:', pacoteAgendamentos);
          
          // Cancelar todos os agendamentos do pacote
          const { error } = await supabase
            .from('agendamentos')
            .update({ status: 'cancelado' })
            .in('id', pacoteAgendamentos?.map(a => a.id) || []);
          
          if (error) {
            console.error('❌ Erro ao cancelar pacote:', error);
            throw error;
          }
          
          console.log('✅ Pacote mensal cancelado com sucesso');
          
          toast({
            title: "Pacote mensal cancelado! ✅",
            description: "Todas as sessões do pacote foram canceladas com sucesso."
          });
        } else {
          // Fallback: cancelar apenas o agendamento individual se não conseguir extrair o pacoteId
          const { error } = await supabase
            .from('agendamentos')
            .update({ status: 'cancelado' })
            .eq('id', appointmentId);
          
          if (error) throw error;
          
          toast({
            title: "Agendamento cancelado! ✅",
            description: "Seu agendamento foi cancelado com sucesso."
          });
        }
      } else {
        // Para agendamentos normais, cancelar apenas o individual
        const { error } = await supabase
          .from('agendamentos')
          .update({ status: 'cancelado' })
          .eq('id', appointmentId);

        if (error) {
          console.error('❌ Erro ao cancelar agendamento:', error);
          throw error;
        }

        console.log('✅ Agendamento cancelado com sucesso');
        
        toast({
          title: "Agendamento cancelado! ✅",
          description: "Seu agendamento foi cancelado com sucesso."
        });
      }

      await fetchAgendamentos();

    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o agendamento.",
        variant: "destructive"
      });
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-700 rounded w-1/3"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={fetchAgendamentos}
            variant="outline"
            size="sm"
            disabled={loading}
            className="border-gray-600 text-gray-800 hover:bg-gray-800 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => {
              setShowHistory(true);
              fetchHistorico();
            }}
            variant="outline"
            size="sm"
            className="border-gold-500 text-gold-600 hover:bg-gold-500 hover:text-white"
          >
            <History className="h-4 w-4 mr-2" />
            Histórico
          </Button>
        </div>
      </div>

      {/* Modal de Histórico */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="text-white max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <History className="h-5 w-5 text-gold-500" />
              Histórico - Últimos 30 dias
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-gray-800 border-gray-600">
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : historicos.length === 0 ? (
              <Card className="bg-gray-800 border-gray-600">
                <CardContent className="p-6 text-center">
                  <History className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300">Nenhum histórico encontrado nos últimos 30 dias.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {historicos
                  .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
                  .map((agendamento) => (
                  <Card key={agendamento.id} className="bg-gray-800 border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-white">
                              {agendamento.servicos.nome}
                              {agendamento.isPacoteMensal && (
                                <span className="text-xs text-gold-400 ml-2">(Pacote Mensal)</span>
                              )}
                            </h3>
                            <Badge 
                              variant={
                                agendamento.status === 'confirmado' || agendamento.status === 'agendado' ? 'default' :
                                agendamento.status === 'concluido' ? 'secondary' :
                                agendamento.status === 'pendente' ? 'outline' : 
                                'destructive'
                              }
                              className="text-xs"
                            >
                              {agendamento.status === 'confirmado' ? 'Confirmado' :
                               agendamento.status === 'agendado' ? 'Agendado' :
                               agendamento.status === 'concluido' ? 'Concluído' :
                               agendamento.status === 'pendente' ? 'Pendente' :
                               agendamento.status === 'cancelado' ? 'Cancelado' : agendamento.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-300">
                            <p>{agendamento.profissionais.nome}</p>
                            <p>{new Date(agendamento.data_hora).toLocaleDateString('pt-BR')} às {new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="text-gold-400 font-medium">R$ {agendamento.valor.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {agendamentos.length === 0 ? (
        <EmptyAppointments />
      ) : (
        <div className="space-y-4">
          {agendamentos
            .sort((a, b) => {
              const statusOrder = { 'confirmado': 1, 'agendado': 1, 'pendente': 2, 'cancelado': 3 };
              const aStatus = statusOrder[a.status as keyof typeof statusOrder] || 2;
              const bStatus = statusOrder[b.status as keyof typeof statusOrder] || 2;
              
              // Primeiro ordenar por status
              if (aStatus !== bStatus) {
                return aStatus - bStatus;
              }
              
              // Depois ordenar por data e hora cronologicamente
              return new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime();
            })
            .map((agendamento) => (
            <AppointmentCard
              key={agendamento.id}
              agendamento={agendamento}
              onCancel={handleCancelAppointment}
              isCancelling={cancelling === agendamento.id}
              ownerId={ownerId}
              onPaymentSuccess={fetchAgendamentos}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientAppointments;
