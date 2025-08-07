import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGlobalPaymentMonitorProps {
  enabled: boolean;
  ownerId?: string;
  onPaymentFound?: (agendamentoId: string) => void;
}

export const useGlobalPaymentMonitor = ({ 
  enabled, 
  ownerId, 
  onPaymentFound 
}: UseGlobalPaymentMonitorProps) => {
  const monitorRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  const checkGlobalPayments = async () => {
    if (!ownerId) return;

    try {
      console.log('🌐 Global Payment Monitor - verificando pagamentos...');
      
      // Buscar agendamentos pendentes com pagamentos não verificados
      const { data: agendamentosPendentes } = await supabase
        .from('agendamentos')
        .select(`
          id,
          status,
          created_at,
          pagamentos!inner(id, status, created_at)
        `)
        .eq('status', 'agendado') // Só verificar agendamentos que ainda estão agendados (não confirmados)
        .eq('user_id', ownerId)
        .eq('pagamentos.status', 'pendente')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24 horas

      if (!agendamentosPendentes || agendamentosPendentes.length === 0) {
        console.log('🌐 Nenhum agendamento pendente encontrado no monitor global');
        return;
      }

      console.log(`🌐 Monitor global encontrou ${agendamentosPendentes.length} agendamentos pendentes (status='agendado' com pagamentos='pendente')`);

      // Verificar cada agendamento
      for (const agendamento of agendamentosPendentes) {
        try {
          const { data: response } = await supabase.functions.invoke('check-payment-status', {
            body: {
              agendamentoId: agendamento.id,
              userId: ownerId
            }
          });

          if (response?.status === 'confirmed') {
            console.log(`🌐 ✅ Pagamento confirmado pelo monitor global: ${agendamento.id}`);
            if (onPaymentFound) {
              onPaymentFound(agendamento.id);
            }
          }
        } catch (error) {
          console.error(`🌐 ❌ Erro ao verificar agendamento ${agendamento.id}:`, error);
        }
      }
    } catch (error) {
      console.error('🌐 ❌ Erro no monitor global:', error);
    }
  };

  useEffect(() => {
    if (!enabled || !ownerId) {
      // Limpar monitor
      if (monitorRef.current) {
        clearInterval(monitorRef.current);
        monitorRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    console.log('🌐 Iniciando monitor global de pagamentos para:', ownerId);

    // Verificação inicial
    checkGlobalPayments();

    // Monitor a cada 2 minutos
    monitorRef.current = setInterval(checkGlobalPayments, 120000);

    // Listener realtime para mudanças globais
    const channelName = `global-payment-monitor-${ownerId}-${Date.now()}`;
    const channel = supabase.channel(channelName);
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agendamentos',
          filter: `user_id=eq.${ownerId}`
        },
        (payload) => {
          console.log('🌐 Monitor global detectou mudança no agendamento:', payload);
          if (payload.new && (payload.new as any).status === 'confirmado') {
            if (onPaymentFound) {
              onPaymentFound((payload.new as any).id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pagamentos',
          filter: `user_id=eq.${ownerId}`
        },
        (payload) => {
          console.log('🌐 Monitor global detectou mudança no pagamento:', payload);
          if (payload.new && (payload.new as any).status === 'pago') {
            if (onPaymentFound) {
              onPaymentFound((payload.new as any).agendamento_id);
            }
          }
        }
      );

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (monitorRef.current) {
        clearInterval(monitorRef.current);
        monitorRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, ownerId]);

  return null;
};