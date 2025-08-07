
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar as CalendarIcon, UserCheck, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { startOfDay } from 'date-fns';
import { Appointment } from '@/types/database';
import AppointmentForm from './appointments/AppointmentForm';
import AppointmentTable from './appointments/AppointmentTable';

interface Service {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
}

interface Client {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
}

interface Professional {
  id: string;
  nome: string;
  especialidade?: string;
}

const AppointmentsManager = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('todos');
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [searchDate, setSearchDate] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    cleanupOldAppointments();
    cleanupExpiredPendingAppointments();
    // Removido confirmPacoteMensalAppointments() - pacotes só devem ser confirmados após pagamento PIX
    fetchAppointments();
    fetchServices();
    fetchClients();
    fetchProfessionals();

    // ADICIONAR: Sistema de atualização em tempo real para agendamentos
    const setupRealtimeSubscription = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return null;

      const channel = supabase
        .channel('appointments-realtime')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'agendamentos',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('🔄 Agendamento alterado em tempo real:', payload);
            // Recarregar dados quando houver mudanças
            fetchAppointments();
          }
        )
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'pagamentos'
          }, 
          (payload) => {
            console.log('💰 Pagamento alterado em tempo real:', payload);
            // Recarregar dados quando houver mudanças nos pagamentos
            fetchAppointments();
          }
        )
        .subscribe();

      return channel;
    };

    let channel: any = null;
    setupRealtimeSubscription().then(ch => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    fetchAppointments();
  }, [searchEmail, searchDate]);

  const cleanupOldAppointments = async () => {
    try {
      const today = startOfDay(new Date()).toISOString();
      
      console.log('🧹 Cleaning up appointments before:', today);
      
      // Primeiro buscar os IDs dos agendamentos antigos
      const { data: oldAppointments, error: fetchError } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id) // FILTRAR POR PROFISSIONAL ATUAL
        .lt('data_hora', today);

      if (fetchError) {
        console.error('❌ Error fetching old appointments:', fetchError);
        return;
      }

      if (oldAppointments && oldAppointments.length > 0) {
        const appointmentIds = oldAppointments.map(a => a.id);
        
        console.log(`🧹 Cleaning up ${appointmentIds.length} old appointments...`);
        
        // Primeiro deletar os pagamentos relacionados
        const { error: paymentsError } = await supabase
          .from('pagamentos')
          .delete()
          .in('agendamento_id', appointmentIds);

        if (paymentsError) {
          console.error('❌ Error cleaning up old payments:', paymentsError);
        } else {
          console.log('✅ Old payments cleaned up');
        }

        // Depois deletar os agendamentos
        const { error: appointmentsError } = await supabase
          .from('agendamentos')
          .delete()
          .in('id', appointmentIds);

        if (appointmentsError) {
          console.error('❌ Error cleaning up old appointments:', appointmentsError);
        } else {
          console.log('✅ Old appointments cleaned up successfully');
        }
      }
    } catch (error) {
      console.error('❌ Error in cleanup:', error);
    }
  };

  const cleanupExpiredPendingAppointments = async () => {
    try {
      console.log('🧹 Cleaning up expired pending appointments...');
      
      // Buscar agendamentos pendentes com pagamentos expirados
      const { data: pendingAppointments, error: fetchError } = await supabase
        .from('agendamentos')
        .select(`
          id,
          status,
          data_hora,
          pagamentos!inner(id, status, expires_at)
        `)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id) // FILTRAR POR PROFISSIONAL ATUAL
          .eq('status', 'pendente'); // APENAS agendamentos que JÁ ESTÃO pendentes

      if (fetchError) {
        console.error('❌ Error fetching pending appointments:', fetchError);
        return;
      }

      const now = new Date();
      const expiredAppointments = pendingAppointments?.filter(appointment => {
        // CRÍTICO: NÃO TOCAR EM AGENDAMENTOS CONCLUÍDOS OU CONFIRMADOS
        if (appointment.status === 'concluido' || appointment.status === 'confirmado') {
          return false;
        }
        
        const hasExpiredPayment = appointment.pagamentos.some(payment => 
          payment.status === 'pendente' && new Date(payment.expires_at) < now
        );
        return hasExpiredPayment;
      }) || [];

      console.log(`🗑️ Found ${expiredAppointments.length} expired pending appointments`);

      // Cancelar agendamentos expirados
      if (expiredAppointments.length > 0) {
        const appointmentIds = expiredAppointments.map(a => a.id);
        
        const { error: cancelError } = await supabase
          .from('agendamentos')
          .update({ status: 'cancelado' })
          .in('id', appointmentIds);

        if (cancelError) {
          console.error('❌ Error canceling expired appointments:', cancelError);
        } else {
          console.log(`✅ Canceled ${expiredAppointments.length} expired pending appointments`);
        }
      }
    } catch (error) {
      console.error('❌ Error in cleanup expired pending:', error);
    }
  };

  // Função removida - confirmPacoteMensalAppointments
  // Os pacotes mensais devem ser confirmados APENAS após o pagamento PIX ser processado

  const fetchAppointments = async () => {
    try {
      console.log('🔍 Buscando todos os agendamentos...');

      // Calcular data limite de 30 dias atrás
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          servicos(nome, preco, duracao),
          profissionais(nome),
          pagamentos(status, valor, preference_id, pix_code, agendamento_id)
        `)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id) // FILTRAR POR PROFISSIONAL ATUAL
      .not('status', 'eq', 'cancelado')
      .gte('data_hora', thirtyDaysAgoISO); // Filtrar últimos 30 dias

      // Aplicar filtros de busca se preenchidos
      if (searchEmail && searchEmail.trim()) {
        query = query.ilike('cliente_email', `%${searchEmail.trim()}%`);
      }

      if (searchDate && searchDate.trim()) {
        const selectedDate = new Date(searchDate);
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte('data_hora', startOfDay.toISOString())
          .lt('data_hora', endOfDay.toISOString());
      }

      const { data: normalAppointments, error: normalError } = await query.order('data_hora', { ascending: true });

      if (normalError) {
        console.error('❌ Erro ao buscar agendamentos:', normalError);
        throw normalError;
      }

      console.log('📊 Agendamentos encontrados:', normalAppointments?.length || 0);
      console.log('📋 Agendamentos detalhados:', normalAppointments);

      // Mapear status para exibição na dashboard e processar pacotes mensais
      const mappedNormalAppointments: Appointment[] = (normalAppointments || []).map(appointment => {
        const isPacoteMensal = appointment.observacoes?.includes('PACOTE MENSAL');
        
        if (isPacoteMensal) {
          // Para pacotes mensais, buscar TODOS os agendamentos do mesmo pacote
          const pacoteId = appointment.observacoes?.match(/PACOTE MENSAL (PMT\d+)/)?.[1] || '';
          
          // BUSCAR TODOS os agendamentos do pacote para verificar se há pagamento
          const agendamentosDoPacote = (normalAppointments || []).filter(a => 
            a.observacoes?.includes(`PACOTE MENSAL ${pacoteId}`)
          );
          
          // Verificar se QUALQUER agendamento do pacote tem pagamento
          const temPagamentoPacote = agendamentosDoPacote.some(a => 
            a.pagamentos?.some((p: any) => p.status === 'pago')
          );
          
          const temPagamentoPendentePacote = agendamentosDoPacote.some(a => 
            a.pagamentos?.some((p: any) => p.status === 'pendente')
          );
          
          console.log('🔍 [PACOTE DEBUG] Verificando pacote completo:', {
            pacoteId,
            agendamentoId: appointment.id,
            sequencia: appointment.observacoes?.match(/Sessão (\d+)\/4/)?.[1],
            statusOriginal: appointment.status,
            totalAgendamentosPacote: agendamentosDoPacote.length,
            temPagamentoPacote,
            temPagamentoPendentePacote
          });
          
          let displayStatus = 'agendado';
          let realStatus = appointment.status;
          let valorPago = appointment.valor_pago || 0;
          
          // CRÍTICO: Status "concluido" e "cancelado" NUNCA devem ser sobrescritos
          if (appointment.status === 'concluido') {
            console.log('🏁 [PACOTE] Mantendo status CONCLUÍDO para:', { agendamentoId: appointment.id, pacoteId });
            displayStatus = 'concluido';
            realStatus = 'concluido';
            valorPago = appointment.valor; // 100% pago se concluído
          } else if (appointment.status === 'cancelado') {
            console.log('❌ [PACOTE] Mantendo status CANCELADO para:', { agendamentoId: appointment.id, pacoteId });
            displayStatus = 'cancelado';
            realStatus = 'cancelado';
            valorPago = 0; // 0% pago se cancelado
          } else if (temPagamentoPacote || appointment.status === 'confirmado') {
            // Se QUALQUER sessão do pacote foi paga OU status já é confirmado
            console.log('💰 [PACOTE] Pacote foi pago ou já confirmado, definindo como AGENDADO:', { 
              agendamentoId: appointment.id, 
              pacoteId,
              temPagamentoPacote,
              statusConfirmado: appointment.status === 'confirmado'
            });
            displayStatus = 'agendado';
            realStatus = appointment.status === 'concluido' ? 'concluido' : 'confirmado';
            valorPago = appointment.valor; // 100% pago se confirmado
          } else if (temPagamentoPendentePacote) {
            // PAGAMENTO PENDENTE no pacote
            console.log('⏳ [PACOTE] Pagamento pendente no pacote, definindo como PENDENTE:', { 
              agendamentoId: appointment.id, 
              pacoteId
            });
            displayStatus = 'pendente';
            realStatus = 'pendente';
            valorPago = 0; // 0% pago se pendente
          } else {
            // SEM PAGAMENTOS - agendamento livre
            console.log('🆓 [PACOTE] Sem pagamentos no pacote, definindo como AGENDADO:', { agendamentoId: appointment.id, pacoteId });
            displayStatus = 'agendado';
            realStatus = appointment.status;
            valorPago = appointment.valor_pago || 0;
          }
          
          return {
            ...appointment,
            displayStatus,
            isPacoteMensal: true,
            status: realStatus,
            valor_pago: valorPago,
            pacoteInfo: {
              sequencia: parseInt(appointment.observacoes?.match(/Sessão (\d+)\/4/)?.[1] || '1'),
              pacoteId: pacoteId
            }
          };
        }
        
        // Para agendamentos normais, verificar status do pagamento
        const hasPendingPayment = appointment.pagamentos?.some((p: any) => p.status === 'pendente');
        const hasPaidPayment = appointment.pagamentos?.some((p: any) => p.status === 'pago');
        
        let displayStatus = appointment.status;
        
        // IMPORTANTE: Não alterar status "concluido"
        if (appointment.status === 'concluido') {
          displayStatus = 'concluido';
        }
        // Se há pagamento pendente e nenhum pago, mostrar como pendente
        else if (hasPendingPayment && !hasPaidPayment) {
          displayStatus = 'pendente';
        }
        // Se há pagamento pago ou status é confirmado, mostrar como agendado
        else if (hasPaidPayment || appointment.status === 'confirmado') {
          displayStatus = 'agendado';
        }
        // Se não há pagamentos, usar o status original do agendamento
        else if (!appointment.pagamentos || appointment.pagamentos.length === 0) {
          displayStatus = appointment.status === 'confirmado' ? 'agendado' : appointment.status;
        }
        
        return {
          ...appointment,
          displayStatus,
          isPacoteMensal: false
        };
      });
      
      setAppointments(mappedNormalAppointments);
    } catch (error) {
      console.error('❌ Erro completo:', error);
      toast({
        title: "Erro ao carregar agendamentos",
        description: "Não foi possível carregar os agendamentos.",
        variant: "destructive"
      });
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('id, nome, preco, duracao')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id) // FILTRAR POR PROFISSIONAL ATUAL
        .eq('ativo', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, email')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id) // FILTRAR POR PROFISSIONAL ATUAL
        .order('nome');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('id, nome, especialidade')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id) // FILTRAR POR PROFISSIONAL ATUAL
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error('Error fetching professionals:', error);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    
    // Verificar se é um agendamento de pacote mensal
    if (appointment?.isPacoteMensal) {
      const pacoteId = appointment.pacoteInfo?.pacoteId || '';
      
      // Buscar todos os agendamentos do mesmo pacote
      const agendamentosDoPacote = appointments.filter(a => 
        a.isPacoteMensal && a.pacoteInfo?.pacoteId === pacoteId
      );
      
      // Verificar se todos estão pendentes
      const todosPendentes = agendamentosDoPacote.every(a => 
        a.displayStatus === 'pendente' || a.status === 'pendente'
      );
      
      if (todosPendentes) {
        // Se todos estão pendentes, excluir todos de uma vez
        if (!confirm('Excluir agendamentos pendentes excluirá todos os 4 agendamentos de uma vez. Deseja continuar?')) {
          return;
        }
        
        setDeletingId(appointmentId);
        try {
          console.log('🗑️ Excluindo todos os 4 agendamentos do pacote pendente:', pacoteId);
          
          const idsParaExcluir = agendamentosDoPacote.map(a => a.id);
          
          // Primeiro deletar todos os pagamentos relacionados
          console.log('💳 Deletando pagamentos relacionados aos agendamentos do pacote...');
          const { error: paymentsError } = await supabase
            .from('pagamentos')
            .delete()
            .in('agendamento_id', idsParaExcluir);

          if (paymentsError) {
            console.error('❌ Erro ao excluir pagamentos:', paymentsError);
            throw paymentsError;
          }

          // Depois excluir todos os agendamentos do pacote
          const { error: appointmentsError } = await supabase
            .from('agendamentos')
            .delete()
            .in('id', idsParaExcluir);

          if (appointmentsError) {
            console.error('❌ Erro ao excluir agendamentos do pacote:', appointmentsError);
            throw appointmentsError;
          }

          console.log('✅ Todos os agendamentos do pacote foram excluídos com sucesso');
          
          toast({
            title: "Pacote excluído! ✅",
            description: "Todos os 4 agendamentos do pacote mensal foram excluídos com sucesso."
          });
          
          await fetchAppointments();
          return;
          
        } catch (error) {
          console.error('❌ Erro ao excluir pacote completo:', error);
          toast({
            title: "Erro",
            description: "Não foi possível excluir o pacote completo.",
            variant: "destructive"
          });
          setDeletingId(null);
          return;
        }
      } else {
        // Se nem todos estão pendentes, cancelar apenas esta sessão
        if (!confirm('Tem certeza que deseja cancelar esta sessão do pacote mensal? Apenas esta sessão específica será cancelada.')) {
          return;
        }
      }
    } else {
      if (!confirm('Tem certeza que deseja excluir este agendamento?')) {
        return;
      }
    }

    setDeletingId(appointmentId);
    try {
      console.log('🗑️ Processando cancelamento/exclusão do agendamento:', appointmentId);
      console.log('📋 Agendamento selecionado:', appointment);

      if (appointment?.isPacoteMensal) {
        // Para pacotes mensais, apenas cancelar (não excluir)
        console.log('📦 Cancelando APENAS esta sessão de pacote mensal. ID:', appointmentId);
        console.log('📦 Informações do pacote:', appointment.pacoteInfo);
        
        const { error } = await supabase
          .from('agendamentos')
          .update({ status: 'cancelado' })
          .eq('id', appointmentId);

        console.log('📦 Query executada - UPDATE agendamentos SET status = cancelado WHERE id =', appointmentId);

        if (error) {
          console.error('❌ Erro ao cancelar sessão do pacote mensal:', error);
          throw error;
        }

        console.log('✅ Sessão do pacote mensal cancelada com sucesso');
        
        toast({
          title: "Sessão cancelada! ✅",
          description: "A sessão do pacote mensal foi cancelada. O horário ficará disponível novamente."
        });
      } else {
        // Para agendamentos normais, excluir (primeiro os pagamentos, depois o agendamento)
        console.log('📅 Excluindo agendamento normal');
        
        // Primeiro, deletar todos os pagamentos relacionados
        console.log('💳 Deletando pagamentos relacionados...');
        const { error: paymentsError } = await supabase
          .from('pagamentos')
          .delete()
          .eq('agendamento_id', appointmentId);

        if (paymentsError) {
          console.error('❌ Erro ao excluir pagamentos:', paymentsError);
          throw paymentsError;
        }

        console.log('✅ Pagamentos relacionados excluídos');

        // Depois, deletar o agendamento
        const { error: appointmentError } = await supabase
          .from('agendamentos')
          .delete()
          .eq('id', appointmentId);

        if (appointmentError) {
          console.error('❌ Erro ao excluir agendamento:', appointmentError);
          throw appointmentError;
        }

        console.log('✅ Agendamento excluído com sucesso');
        
        toast({
          title: "Agendamento excluído! ✅",
          description: "O agendamento foi removido com sucesso."
        });
      }

      // Atualizar lista
      await fetchAppointments();

    } catch (error) {
      console.error('❌ Erro:', error);
      const actionText = appointment?.isPacoteMensal ? 'cancelar a sessão' : 'excluir o agendamento';
      toast({
        title: "Erro",
        description: `Não foi possível ${actionText}.`,
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    console.log('🔄 Tentando concluir agendamento:', { 
      appointmentId, 
      isPacoteMensal: appointment?.isPacoteMensal,
      currentStatus: appointment?.status 
    });
    
    if (!confirm('Tem certeza que deseja marcar este agendamento como concluído?')) {
      return;
    }

    setCompletingId(appointmentId);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'concluido' })
        .eq('id', appointmentId);

      if (error) throw error;

      console.log('✅ Agendamento concluído com sucesso, recarregando dados...');

      toast({
        title: "Agendamento concluído! ✅",
        description: "O agendamento foi marcado como concluído."
      });

      await fetchAppointments();
      
      console.log('✅ Dados recarregados após conclusão');
    } catch (error) {
      console.error('❌ Erro ao concluir agendamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir o agendamento.",
        variant: "destructive"
      });
    } finally {
      setCompletingId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchAppointments();
  };

  // Filtrar agendamentos por profissional selecionado
  const filteredAppointments = appointments.filter(appointment => {
    if (selectedProfessional === 'todos') return true;
    return appointment.profissional_id === selectedProfessional;
  });

  // Primeiro ordenar cronologicamente, depois por status dentro de cada dia
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const aDate = new Date(a.data_hora);
    const bDate = new Date(b.data_hora);
    
    // Primeiro ordenar por data (dia)
    const aDayStart = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate());
    const bDayStart = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());
    
    if (aDayStart.getTime() !== bDayStart.getTime()) {
      return aDayStart.getTime() - bDayStart.getTime();
    }
    
    // Dentro do mesmo dia, ordenar por status: agendados → concluídos → pendentes → cancelados
    const getStatusPriority = (appointment: Appointment) => {
      const status = appointment.displayStatus || appointment.status;
      console.log('🔍 Status para ordenação:', { 
        id: appointment.id, 
        status, 
        displayStatus: appointment.displayStatus, 
        originalStatus: appointment.status 
      });
      
      if (status === 'agendado' || status === 'confirmado') return 1;
      if (status === 'concluido') return 2;
      if (status === 'pendente') return 3;
      if (status === 'cancelado') return 4;
      return 3; // default para pendente
    };
    
    const aStatusPriority = getStatusPriority(a);
    const bStatusPriority = getStatusPriority(b);
    
    console.log('📊 Comparação ordenação:', { 
      aId: a.id, 
      aPriority: aStatusPriority, 
      bId: b.id, 
      bPriority: bStatusPriority 
    });
    
    if (aStatusPriority !== bStatusPriority) {
      return aStatusPriority - bStatusPriority;
    }
    
    // Por último, ordenar por hora dentro do mesmo status
    return aDate.getTime() - bDate.getTime();
  });

  const selectedProfessionalName = professionals.find(p => p.id === selectedProfessional)?.nome || 'Todos os Profissionais';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold">Agendamentos</h3>
          <p className="text-gray-400 text-sm">
            {selectedProfessional === 'todos' 
              ? `Total: ${appointments.length} agendamentos` 
              : `${selectedProfessionalName}: ${filteredAppointments.length} agendamentos`
            }
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gold-gradient text-black font-semibold w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Filtros */}
      <div className="space-y-4">
        {/* Filtro de Profissionais */}
        <Card className="bg-gray-900 border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-gold-500" />
              <Label className="text-white font-medium">Filtrar por Profissional:</Label>
            </div>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="bg-white border-gray-300 text-black w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300">
                <SelectItem value="todos" className="text-black hover:bg-gray-100">
                  Todos os Profissionais
                </SelectItem>
                {professionals.map((professional) => (
                  <SelectItem 
                    key={professional.id} 
                    value={professional.id}
                    className="text-black hover:bg-gray-100"
                  >
                    {professional.nome}
                    {professional.especialidade && ` - ${professional.especialidade}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Filtros de Busca */}
        <Card className="bg-gray-900 border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-gold-500" />
              <Label className="text-white font-medium">Buscar Agendamentos:</Label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative">
                <Input
                  placeholder="Buscar por email do cliente..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="bg-white border-gray-300 text-black w-full sm:w-64"
                />
                {searchEmail && (
                  <Button
                    onClick={() => setSearchEmail('')}
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="relative">
                <Input
                  type="date"
                  placeholder="Filtrar por data..."
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="bg-white border-gray-300 text-black w-full sm:w-48"
                />
                {searchDate && (
                  <Button
                    onClick={() => setSearchDate('')}
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          {(searchEmail || searchDate) && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                📝 Filtros ativos: {searchEmail && `email "${searchEmail}"`} {searchEmail && searchDate && ' + '} {searchDate && `data ${new Date(searchDate).toLocaleDateString('pt-BR')}`}
                <span className="text-gold-500 ml-2">• Mostrando últimos 30 dias</span>
              </p>
            </div>
          )}
        </Card>
      </div>

      {showForm && (
        <AppointmentForm
          services={services}
          clients={clients}
          professionals={professionals}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      <Card className="bg-gray-900 border-gray-700">
        <div className="p-4 sm:p-6">
          {sortedAppointments.length > 0 ? (
            <AppointmentTable
              appointments={sortedAppointments}
              onDelete={handleDeleteAppointment}
              deletingId={deletingId}
              onComplete={handleCompleteAppointment}
              completingId={completingId}
            />
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h4 className="text-lg text-white font-semibold mb-2">
                {selectedProfessional === 'todos' 
                  ? 'Nenhum agendamento encontrado' 
                  : `Nenhum agendamento encontrado para ${selectedProfessionalName}`
                }
              </h4>
              <p className="text-gray-400 mb-4 text-sm">
                {selectedProfessional === 'todos'
                  ? 'Os agendamentos aparecem aqui assim que são criados pelos clientes ou pela dashboard.'
                  : `Este profissional ainda não possui agendamentos.`
                }
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gold-gradient text-black font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Agendamento
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AppointmentsManager;
