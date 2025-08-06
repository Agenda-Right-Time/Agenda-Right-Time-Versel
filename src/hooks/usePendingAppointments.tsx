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
    console.log('🔍 Verificando agendamentos pendentes:', { clienteId, ownerId, profissionalId, enabled });
    
    if (!enabled || !clienteId || !ownerId || !profissionalId) {
      console.log('❌ Verificação bloqueada:', { enabled, clienteId: !!clienteId, ownerId: !!ownerId, profissionalId: !!profissionalId });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar agendamentos pendentes para este cliente específico e este profissional
      const { data: pendingAppointments, error } = await supabase
        .from('agendamentos')
        .select('id, status, cliente_id')
        .eq('cliente_id', clienteId)
        .eq('user_id', ownerId)
        .eq('profissional_id', profissionalId)
        .eq('status', 'pendente');

      console.log('📊 Resultado da busca:', { pendingAppointments, error });

      if (error) {
        console.error('Erro ao verificar agendamentos pendentes:', error);
        setHasPendingAppointments(false);
        setPendingAppointmentIds([]);
        return;
      }

      const pendingIds = pendingAppointments?.map(app => app.id) || [];
      console.log('✅ Agendamentos pendentes encontrados:', pendingIds);
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
    checkPendingAppointments();
    
    // Criar subscription em tempo real para agendamentos
    if (enabled && clienteId && ownerId && profissionalId) {
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