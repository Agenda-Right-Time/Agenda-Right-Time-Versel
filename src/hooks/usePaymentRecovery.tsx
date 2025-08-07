import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePaymentRecoveryProps {
  enabled: boolean;
  ownerId?: string;
  onRecoveredPayment?: (agendamentoId: string) => void;
}

export const usePaymentRecovery = ({ 
  enabled, 
  ownerId, 
  onRecoveredPayment 
}: UsePaymentRecoveryProps) => {

  const checkPendingPayments = async () => {
    if (!ownerId) return;

    try {
      console.log('🔍 Verificando pagamentos não verificados...');
      
      // Buscar agendamentos pendentes com pagamentos não verificados
      const { data: agendamentosPendentes } = await supabase
        .from('agendamentos')
        .select(`
          id,
          status,
          created_at,
          user_id,
          pagamentos!inner(id, status, created_at, valor)
        `)
        .eq('status', 'agendado') // Só verificar agendamentos que ainda estão agendados
        .eq('user_id', ownerId)
        .eq('pagamentos.status', 'pendente')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24 horas

      if (!agendamentosPendentes || agendamentosPendentes.length === 0) {
        console.log('✅ Nenhum agendamento pendente com pagamentos não verificados');
        return;
      }

      console.log(`🔍 Encontrados ${agendamentosPendentes.length} agendamentos com pagamentos pendentes`);

      // Para cada agendamento pendente, tentar recuperar o pagamento
      for (const agendamento of agendamentosPendentes) {
        try {
          console.log(`🔄 Tentando recuperar pagamento para agendamento ${agendamento.id}`);
          
          const { data: response } = await supabase.functions.invoke('check-payment-status', {
            body: {
              agendamentoId: agendamento.id,
              userId: ownerId
            }
          });

          if (response?.status === 'confirmed') {
            console.log(`✅ Pagamento recuperado para agendamento ${agendamento.id}`);
            if (onRecoveredPayment) {
              onRecoveredPayment(agendamento.id);
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao recuperar pagamento para ${agendamento.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Erro na verificação de recovery:', error);
    }
  };

  useEffect(() => {
    if (!enabled || !ownerId) {
      return;
    }

    console.log('🔄 Iniciando verificação de recovery de pagamentos');
    
    // Verificar imediatamente
    checkPendingPayments();

    // Verificar a cada 1 minuto para recovery mais rápido
    const interval = setInterval(checkPendingPayments, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, ownerId]);

  return null;
};