import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GlobalPaymentListenerProps {
  ownerId: string;
  onPaymentConfirmed?: () => void;
}

const GlobalPaymentListener = ({ ownerId, onPaymentConfirmed }: GlobalPaymentListenerProps) => {
  const { toast } = useToast();
  const intervalRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  // MESMA LÓGICA do usePaymentStatus que funciona na tela PIX
  const checkGlobalPayments = async () => {
    try {
      // Evitar verificações muito frequentes
      const agora = Date.now();
      if (agora - lastCheckRef.current < 2000) {
        return;
      }
      lastCheckRef.current = agora;

      console.log('🌐 Verificação GLOBAL de pagamentos pendentes...');
      
      // Buscar agendamentos pendentes do usuário
      const { data: agendamentosPendentes, error } = await supabase
        .from('agendamentos')
        .select('id, status')
        .eq('user_id', ownerId)
        .eq('status', 'pendente');

      if (error) {
        console.error('❌ Erro ao buscar agendamentos pendentes:', error);
        return;
      }

      if (!agendamentosPendentes || agendamentosPendentes.length === 0) {
        return;
      }

      console.log(`🔍 Encontrados ${agendamentosPendentes.length} agendamentos pendentes`);

      // Verificar cada agendamento pendente na API do MP
      for (const agendamento of agendamentosPendentes) {
        try {
          console.log(`🔍 Verificando pagamento para agendamento: ${agendamento.id}`);
          
          const { data: apiResponse, error: apiError } = await supabase.functions.invoke('check-payment-status', {
            body: {
              agendamentoId: agendamento.id,
              userId: ownerId
            }
          });

          if (apiError) {
            console.error('❌ Erro ao verificar via API MP:', apiError);
            continue;
          }

          console.log('📊 Resposta API MP:', apiResponse);
          
          if (apiResponse?.status === 'confirmed') {
            console.log('✅ PAGAMENTO CONFIRMADO GLOBALMENTE!');
            toast({
              title: "💰 Pagamento Confirmado!",
              description: "Seu agendamento foi confirmado automaticamente.",
              duration: 5000
            });
            onPaymentConfirmed?.();
          }
        } catch (error) {
          console.error('❌ Erro na verificação individual:', error);
        }
      }
    } catch (error) {
      console.error('❌ Erro na verificação global:', error);
    }
  };

  useEffect(() => {
    if (!ownerId) {
      console.log('🚫 GlobalPaymentListener desabilitado - sem ownerId');
      return;
    }
    
    console.log('🌐 LISTENER GLOBAL ATIVO - verificando a cada 2 segundos!');
    
    // Verificação imediata
    checkGlobalPayments();
    
    // Polling a cada 2 segundos (igual ao PIX mas global)
    if (!intervalRef.current) {
      intervalRef.current = setInterval(checkGlobalPayments, 2000);
    }

    // Realtime listener para qualquer mudança de pagamento do usuário
    if (!channelRef.current || !isSubscribedRef.current) {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('Erro ao remover canal anterior:', error);
        }
      }

      const channelName = `global-payment-realtime-${ownerId}-${Date.now()}`;
      console.log('🔗 Criando canal global:', channelName);
      
      const realtimeChannel = supabase.channel(channelName);
      
      realtimeChannel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'pagamentos',
            filter: `user_id=eq.${ownerId}`
          },
          (payload) => {
            console.log('💰 PAGAMENTO ATUALIZADO GLOBALMENTE:', payload);
            
            if (payload.new && (payload.new as any).status === 'pago') {
              console.log('✅ PAGAMENTO CONFIRMADO VIA REALTIME!');
              toast({
                title: "💰 Pagamento Confirmado!",
                description: "Seu agendamento foi confirmado automaticamente.",
                duration: 5000
              });
              onPaymentConfirmed?.();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agendamentos',
            filter: `user_id=eq.${ownerId}`
          },
          (payload) => {
            console.log('📅 AGENDAMENTO ATUALIZADO GLOBALMENTE:', payload);
            
            if (payload.new && (payload.new as any).status === 'confirmado') {
              console.log('✅ AGENDAMENTO CONFIRMADO VIA REALTIME!');
              toast({
                title: "✅ Agendamento Confirmado!",
                description: "Seu agendamento foi confirmado automaticamente.",
                duration: 5000
              });
              onPaymentConfirmed?.();
            }
          }
        );

      realtimeChannel.subscribe((status) => {
        console.log('📡 Status da conexão global:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          console.log('✅ Conectado ao sistema global de tempo real');
        }
      });

      channelRef.current = realtimeChannel;
    }

    return () => {
      console.log('🛑 Limpando listener global');
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (channelRef.current && isSubscribedRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
          isSubscribedRef.current = false;
        } catch (error) {
          console.warn('Erro ao remover canal global:', error);
        }
        channelRef.current = null;
      }
    };
  }, [ownerId, toast, onPaymentConfirmed]);

  return null;
};

export default GlobalPaymentListener;