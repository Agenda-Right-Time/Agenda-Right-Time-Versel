import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePaymentStatusProps {
  agendamentoId: string;
  ownerId: string;
  onPaymentConfirmed?: () => void;
  enabled?: boolean;
}

type PaymentStatus = 'pendente' | 'pago' | 'expirado' | 'rejeitado';

export const usePaymentStatus = ({ 
  agendamentoId, 
  ownerId,
  onPaymentConfirmed, 
  enabled = true 
}: UsePaymentStatusProps) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente');
  const [isChecking, setIsChecking] = useState(false);
  const channelRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const callbackExecutedRef = useRef(false);
  const isSubscribedRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  // Função para verificar status no banco local e chamar API do MP
  const checkPaymentStatus = async () => {
    try {
      // Evitar verificações muito frequentes (mínimo 1.5 segundos entre chamadas)
      const agora = Date.now();
      if (agora - lastCheckRef.current < 1500) {
        return false;
      }
      lastCheckRef.current = agora;

      setIsChecking(true);
      console.log('🔄 Checking payment status...');
      
      // Verificar no banco local primeiro
      const { data: agendamento, error: agendamentoError } = await supabase
        .from('agendamentos')
        .select('id, status, valor_pago')
        .eq('id', agendamentoId)
        .single();

      if (agendamentoError) {
        console.error('❌ Error fetching agendamento:', agendamentoError);
        return false;
      }

      console.log('📅 Agendamento status:', agendamento.status);

      // Se já está confirmado, marcar como pago e PARAR monitoramento
      if (agendamento.status === 'confirmado') {
        console.log('✅ Agendamento já confirmado no banco - PARANDO MONITORAMENTO');
        setPaymentStatus('pago');
        
        // PARAR completamente o monitoramento
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        if (channelRef.current && isSubscribedRef.current) {
          try {
            supabase.removeChannel(channelRef.current);
          } catch (error) {
            console.warn('Error removing channel:', error);
          }
          channelRef.current = null;
          isSubscribedRef.current = false;
        }
        
        if (onPaymentConfirmed && !callbackExecutedRef.current) {
          console.log('🎉 Calling onPaymentConfirmed callback');
          callbackExecutedRef.current = true;
          onPaymentConfirmed();
        }
        return true;
      }

      // Verificar pagamentos locais
      const { data: pagamentos, error: pagamentosError } = await supabase
        .from('pagamentos')
        .select('id, status, expires_at, valor, created_at')
        .eq('agendamento_id', agendamentoId)
        .order('created_at', { ascending: false });

      if (pagamentosError) {
        console.error('❌ Error fetching payments:', pagamentosError);
        return false;
      }

      const pagamentoPago = pagamentos?.find(p => p.status === 'pago');
      const pagamentoRejeitado = pagamentos?.find(p => p.status === 'rejeitado');
      
      if (pagamentoPago) {
        console.log('✅ Payment found as PAID locally - PARANDO MONITORAMENTO');
        setPaymentStatus('pago');
        
        // PARAR completamente o monitoramento
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        if (channelRef.current && isSubscribedRef.current) {
          try {
            supabase.removeChannel(channelRef.current);
          } catch (error) {
            console.warn('Error removing channel:', error);
          }
          channelRef.current = null;
          isSubscribedRef.current = false;
        }
        
        if (onPaymentConfirmed && !callbackExecutedRef.current) {
          console.log('🎉 Calling onPaymentConfirmed callback');
          callbackExecutedRef.current = true;
          onPaymentConfirmed();
        }
        return true;
      }

      // Verificar se há pagamento rejeitado
      if (pagamentoRejeitado) {
        console.log('❌ Payment found as REJECTED locally');
        setPaymentStatus('rejeitado');
        return true;
      }

      // Verificar se expirou
      const pagamentoPendente = pagamentos?.find(p => p.status === 'pendente');
      if (pagamentoPendente) {
        const now = new Date();
        const expiresAt = new Date(pagamentoPendente.expires_at);
        
        if (now > expiresAt) {
          console.log('⏰ Payment expired');
          setPaymentStatus('expirado');
          return true;
        } else {
          setPaymentStatus('pendente');
          
          // SEMPRE chamar API do Mercado Pago para buscar pagamentos dos últimos 5 minutos
          console.log('🔍 Calling MP API to check for payments in last 5 minutes...');
          
          try {
            const { data: apiResponse, error: apiError } = await supabase.functions.invoke('check-payment-status', {
              body: {
                agendamentoId: agendamentoId,
                userId: ownerId
              }
            });

            if (apiError) {
              console.error('❌ Error calling MP API:', apiError);
            } else {
              console.log('📊 MP API Response:', apiResponse);
              
              if (apiResponse?.status === 'confirmed') {
                console.log('✅ Payment confirmed by MP API!');
                // A função já atualizou o banco, aguardar um pouco e verificar novamente
                setTimeout(() => checkPaymentStatus(), 500);
              } else {
                console.log('⏳ No payment found in last 5 minutes, continuing to monitor...');
              }
            }
          } catch (error) {
            console.error('❌ Error calling MP check function:', error);
          }
          
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!enabled || !agendamentoId || !ownerId) {
      console.log('🚫 Payment monitoring disabled');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (channelRef.current && isSubscribedRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('Error removing channel:', error);
        }
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
      
      callbackExecutedRef.current = false;
      return;
    }

    console.log('🔍 Starting payment status monitoring for agendamento:', agendamentoId);

    // Verificar imediatamente
    checkPaymentStatus();

    // Configurar verificação CONSTANTE a cada 2 segundos para não perder confirmação
    if (!intervalRef.current) {
      intervalRef.current = setInterval(checkPaymentStatus, 2000);
    }

    // Configurar listener em tempo real
    if (!channelRef.current || !isSubscribedRef.current) {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('Error removing previous channel:', error);
        }
      }

      const channelName = `payment-monitor-${agendamentoId}-${Date.now()}`;
      console.log('🔗 Creating realtime channel:', channelName);
      
      const realtimeChannel = supabase.channel(channelName);
      
      realtimeChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pagamentos',
            filter: `agendamento_id=eq.${agendamentoId}`
          },
          (payload) => {
            console.log('🔄 Real-time payment update:', payload);
            setTimeout(checkPaymentStatus, 500);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agendamentos',
            filter: `id=eq.${agendamentoId}`
          },
          (payload) => {
            console.log('🔄 Real-time agendamento update:', payload);
            setTimeout(checkPaymentStatus, 500);
          }
        );

      realtimeChannel.subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          console.log('✅ Successfully subscribed to realtime updates');
        }
      });

      channelRef.current = realtimeChannel;
    }

    return () => {
      console.log('🛑 Cleaning up payment status monitoring');
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (channelRef.current && isSubscribedRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
          isSubscribedRef.current = false;
        } catch (error) {
          console.warn('Error removing channel during cleanup:', error);
        }
        channelRef.current = null;
      }
      
      callbackExecutedRef.current = false;
    };
  }, [agendamentoId, ownerId, enabled]);

  return {
    paymentStatus,
    isChecking
  };
};
