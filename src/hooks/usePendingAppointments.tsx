import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePendingAppointmentsProps {
  clienteId: string;
  ownerId: string;
  profissionalId: string;
  enabled?: boolean;
}

export const usePendingAppointments = ({ clienteId, ownerId, profissionalId, enabled = true }: UsePendingAppointmentsProps) => {
  const [hasPendingAppointments, setHasPendingAppointments] = useState(false);
  const [pendingAppointmentIds, setPendingAppointmentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const checkPendingAppointments = async () => {
    console.log('🔍 [PENDING DEBUG] Verificando agendamentos pendentes:', { clienteId, ownerId, profissionalId, enabled });
    
    if (!enabled || !clienteId || !ownerId || !profissionalId) {
      console.log('❌ [PENDING DEBUG] Verificação bloqueada:', { 
        enabled, 
        hasClienteId: !!clienteId, 
        hasOwnerId: !!ownerId, 
        hasProfissionalId: !!profissionalId,
        clienteId,
        ownerId,
        profissionalId
      });
      setHasPendingAppointments(false);
      setPendingAppointmentIds([]);
      setLoading(false);
      return;
    }

    console.log('✅ [PENDING DEBUG] Verificação habilitada - executando busca...');

    try {
      setLoading(true);

      // Buscar agendamentos pendentes para este cliente específico e este profissional
      // Incluindo status 'agendado' que são agendamentos confirmados mas sem pagamento
      const { data: pendingAppointments, error } = await supabase
        .from('agendamentos')
        .select(`
          id, 
          status, 
          cliente_id,
          pagamentos(status)
        `)
        .eq('cliente_id', clienteId)
        .eq('user_id', ownerId)
        .eq('profissional_id', profissionalId)
        .in('status', ['pendente', 'agendado']); // Incluir agendados também

      console.log('📊 Resultado da busca pendentes:', { 
        pendingAppointments, 
        error,
        totalEncontrados: pendingAppointments?.length || 0,
        detalhes: pendingAppointments?.map(app => ({
          id: app.id,
          status: app.status,
          pagamentos: app.pagamentos
        }))
      });

      if (error) {
        console.error('❌ Erro ao verificar agendamentos pendentes:', error);
        setHasPendingAppointments(false);
        setPendingAppointmentIds([]);
        return;
      }

      // Filtrar agendamentos que realmente estão pendentes
      // Status 'pendente' OU status 'agendado' com pagamentos pendentes/inexistentes
      const reallyPendingAppointments = pendingAppointments?.filter(app => {
        console.log('🔍 Analisando agendamento:', {
          id: app.id,
          status: app.status,
          pagamentos: app.pagamentos,
          isPagamentosArray: Array.isArray(app.pagamentos)
        });

        if (app.status === 'pendente') {
          console.log('✅ Agendamento pendente encontrado:', app.id);
          return true; // Status pendente sempre bloqueia
        }
        
        // Para status 'agendado', verificar se não tem pagamentos aprovados
        if (app.status === 'agendado') {
          const hasPaidPayment = Array.isArray(app.pagamentos) && 
            app.pagamentos.some((p: any) => p.status === 'pago');
          console.log('🔍 Agendamento agendado:', {
            id: app.id,
            hasPaidPayment,
            bloqueia: !hasPaidPayment
          });
          return !hasPaidPayment; // Bloqueia se não tem pagamento pago
        }
        
        return false;
      }) || [];

      const pendingIds = reallyPendingAppointments.map(app => app.id);
      console.log('✅ Agendamentos realmente pendentes encontrados:', pendingIds);
      setHasPendingAppointments(pendingIds.length > 0);
      setPendingAppointmentIds(pendingIds);

    } catch (error) {
      console.error('Erro ao verificar agendamentos pendentes:', error);
      setHasPendingAppointments(false);
      setPendingAppointmentIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🎯 usePendingAppointments useEffect executado:', { clienteId, ownerId, profissionalId, enabled });
    checkPendingAppointments();
    
    // Criar subscription em tempo real para agendamentos
    if (enabled && clienteId && ownerId && profissionalId) {
      console.log('🔔 Criando subscription para agendamentos pendentes...');
      const subscription = supabase
        .channel('pending-appointments-check')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'agendamentos',
            filter: `cliente_id=eq.${clienteId}`
          }, 
          (payload) => {
            console.log('🔄 Agendamento alterado, revalidando pendências:', payload);
            checkPendingAppointments();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [clienteId, ownerId, profissionalId, enabled]);

  return {
    hasPendingAppointments,
    pendingAppointmentIds,
    loading,
    refetch: checkPendingAppointments
  };
};