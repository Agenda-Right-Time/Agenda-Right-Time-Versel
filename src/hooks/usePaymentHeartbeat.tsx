import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePaymentHeartbeatProps {
  enabled: boolean;
  agendamentoId?: string;
  ownerId?: string;
  onPaymentFound?: () => void;
}

export const usePaymentHeartbeat = ({ 
  enabled, 
  agendamentoId, 
  ownerId, 
  onPaymentFound 
}: UsePaymentHeartbeatProps) => {
  const heartbeatRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const lastCheckRef = useRef<number>(0);

  const performHeartbeat = async () => {
    if (!agendamentoId || !ownerId) return;

    // Evitar verificações muito frequentes
    const agora = Date.now();
    if (agora - lastCheckRef.current < 10000) { // 10 segundos mínimo
      return;
    }
    lastCheckRef.current = agora;

    try {
      console.log('💓 Payment heartbeat - checking status...');
      
      // Verificar se agendamento ainda está pendente
      const { data: agendamento } = await supabase
        .from('agendamentos')
        .select('status')
        .eq('id', agendamentoId)
        .single();

      if (!agendamento || agendamento.status === 'cancelado') {
        console.log('🛑 Agendamento cancelado - parando heartbeat');
        return;
      }

      if (agendamento.status === 'confirmado') {
        console.log('✅ Agendamento confirmado - PARANDO HEARTBEAT');
        
        // PARAR completamente o heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        
        if (onPaymentFound) {
          onPaymentFound();
        }
        return;
      }

      // Verificar pagamentos
      const { data: pagamentos } = await supabase
        .from('pagamentos')
        .select('status')
        .eq('agendamento_id', agendamentoId)
        .eq('status', 'pago');

      if (pagamentos && pagamentos.length > 0) {
        console.log('✅ Pagamento encontrado via heartbeat - PARANDO HEARTBEAT');
        
        // PARAR completamente o heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        
        if (onPaymentFound) {
          onPaymentFound();
        }
      }
    } catch (error) {
      console.error('❌ Erro no heartbeat:', error);
    }
  };

  useEffect(() => {
    if (!enabled || !agendamentoId || !ownerId) {
      // Limpar heartbeat
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    console.log('💓 Iniciando heartbeat para agendamento:', agendamentoId);

    // Configurar heartbeat a cada 30 segundos (mais conservador para funcionar fora da tela)
    heartbeatRef.current = setInterval(performHeartbeat, 30000);

    // Configurar listener realtime para mudanças globais
    const channelName = `heartbeat-${agendamentoId}-${Date.now()}`;
    const channel = supabase.channel(channelName);
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agendamentos',
          filter: `id=eq.${agendamentoId}`
        },
        (payload) => {
          console.log('💓 Heartbeat detectou mudança no agendamento:', payload);
          if (payload.new && (payload.new as any).status === 'confirmado') {
            if (onPaymentFound) {
              onPaymentFound();
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
          filter: `agendamento_id=eq.${agendamentoId}`
        },
        (payload) => {
          console.log('💓 Heartbeat detectou mudança no pagamento:', payload);
          if (payload.new && (payload.new as any).status === 'pago') {
            if (onPaymentFound) {
              onPaymentFound();
            }
          }
        }
      );

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, agendamentoId, ownerId]);

  return null;
};