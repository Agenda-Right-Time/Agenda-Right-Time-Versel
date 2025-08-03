
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Subscription } from '@/types/database';

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasValidAccess, setHasValidAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setSubscription(null);
      setHasValidAccess(false);
      setInitialLoadComplete(true);
      
      // Cleanup channel if user logs out
      if (channelRef.current && isSubscribedRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
          isSubscribedRef.current = false;
        } catch (error) {
          console.warn('Error removing channel during user logout:', error);
        }
        channelRef.current = null;
      }
      
      return;
    }

    fetchSubscription();

    // Configurar listener em tempo real apenas se não existe um canal ativo
    if (!channelRef.current || !isSubscribedRef.current) {
      // Limpar canal anterior se existir
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('Error removing previous subscription channel:', error);
        }
      }

      // Criar canal com nome único baseado no user ID e timestamp
      const channelName = `subscription-updates-${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔗 Creating subscription channel:', channelName);
      
      const channel = supabase.channel(channelName);
      
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assinaturas',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Atualização em tempo real da assinatura:', payload);
          fetchSubscription(); // Recarregar dados da assinatura
        }
      );

      // Subscribe apenas uma vez
      channel.subscribe((status) => {
        console.log('📡 Subscription channel status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          console.log('✅ Successfully subscribed to subscription channel:', channelName);
        }
      });

      channelRef.current = channel;
    }

    return () => {
      if (channelRef.current && isSubscribedRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
          isSubscribedRef.current = false;
        } catch (error) {
          console.warn('Error removing subscription channel during cleanup:', error);
        }
        channelRef.current = null;
      }
    };
  }, [user?.id]); // Dependência apenas do user.id para evitar recriações desnecessárias

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      console.log('Fetching subscription for user:', user.id);
      
      // Buscar assinatura do usuário
      const { data: subscriptionData, error: subError } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription:', subError);
        throw subError;
      }

      console.log('Raw subscription data:', subscriptionData);
      
      if (subscriptionData) {
        // Converter para o tipo correto
        const typedSubscription: Subscription = {
          ...subscriptionData,
          status: subscriptionData.status as 'trial' | 'ativa' | 'suspensa' | 'cancelada'
        };
        setSubscription(typedSubscription);
      } else {
        setSubscription(null);
      }

      // Se não tem assinatura, criar uma nova com trial de 7 dias
      if (!subscriptionData) {
        console.log('No subscription found, creating new one...');
        const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const subscriptionEnd = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000);
        
        const newSubscription = {
          user_id: user.id,
          status: 'trial' as const,
          preco: 35.99,
          data_inicio: new Date().toISOString(),
          data_vencimento: subscriptionEnd.toISOString(),
          trial_ate: trialEnd.toISOString()
        };

        const { data: createdSub, error: createError } = await supabase
          .from('assinaturas')
          .insert(newSubscription)
          .select()
          .single();

        if (createError) {
          console.error('Error creating subscription:', createError);
        } else {
          console.log('Created new subscription:', createdSub);
          const typedCreatedSub: Subscription = {
            ...createdSub,
            status: createdSub.status as 'trial' | 'ativa' | 'suspensa' | 'cancelada'
          };
          setSubscription(typedCreatedSub);
        }
      }

      // Verificar acesso válido
      const userCreated = new Date(user.created_at);
      const sevenDaysAfterCreation = new Date(userCreated.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      
      let hasAccess = false;
      
      if (subscriptionData) {
        const trialEnd = new Date(subscriptionData.trial_ate);
        const isTrialActive = trialEnd > now;
        const isActiveSubscription = subscriptionData.status === 'ativa' && new Date(subscriptionData.data_vencimento) > now;
        hasAccess = isTrialActive || isActiveSubscription;
        
        console.log('Trial end:', trialEnd.toISOString());
        console.log('Is trial active:', isTrialActive);
        console.log('Is active subscription:', isActiveSubscription);
      } else {
        // Se não tem assinatura, verificar baseado na data de criação do usuário
        hasAccess = sevenDaysAfterCreation > now;
        console.log('User created:', userCreated.toISOString());
        console.log('Seven days after creation:', sevenDaysAfterCreation.toISOString());
        console.log('Has access based on creation date:', hasAccess);
      }
      
      console.log('Final hasValidAccess:', hasAccess);
      setHasValidAccess(hasAccess);

    } catch (error) {
      console.error('Error fetching subscription:', error);
      // Em caso de erro, dar acesso temporário para evitar bloqueios durante login
      setHasValidAccess(true);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  };

  const isInTrial = () => {
    if (!user) return false;
    
    if (!subscription) {
      // Se não tem assinatura, verificar baseado na data de criação do usuário
      const userCreated = new Date(user.created_at);
      const sevenDaysAfterCreation = new Date(userCreated.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      return sevenDaysAfterCreation > now;
    }
    
    const now = new Date();
    const trialEnd = new Date(subscription.trial_ate);
    return trialEnd > now;
  };

  const isExpired = () => {
    if (!user) return true;
    
    if (!subscription) {
      // Se não tem assinatura, verificar se o usuário foi criado há mais de 7 dias
      const userCreated = new Date(user.created_at);
      const sevenDaysAfterCreation = new Date(userCreated.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      return sevenDaysAfterCreation <= now;
    }
    
    return new Date(subscription.data_vencimento) < new Date() && !isInTrial();
  };

  const getDaysLeftInTrial = () => {
    if (!user) return 0;
    
    if (!subscription) {
      // Se não tem assinatura, calcular baseado na data de criação do usuário
      const userCreated = new Date(user.created_at);
      const sevenDaysAfterCreation = new Date(userCreated.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      
      if (sevenDaysAfterCreation <= now) return 0;
      
      const diffTime = sevenDaysAfterCreation.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      console.log('Days calculation - User created:', userCreated.toISOString());
      console.log('Days calculation - Trial end:', sevenDaysAfterCreation.toISOString());
      console.log('Days calculation - Days left:', diffDays);
      
      return Math.max(0, diffDays);
    }
    
    const now = new Date();
    const trialEnd = new Date(subscription.trial_ate);
    
    if (trialEnd <= now) return 0;
    
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('Days calculation - Trial end:', trialEnd.toISOString());
    console.log('Days calculation - Days left:', diffDays);
    
    return Math.max(0, diffDays);
  };

  const inTrialPeriod = isInTrial();
  const daysLeft = getDaysLeftInTrial();

  console.log('Hook return values:');
  console.log('- User:', user?.email);
  console.log('- Subscription:', subscription);
  console.log('- Is in trial:', inTrialPeriod);
  console.log('- Days left in trial:', daysLeft);
  console.log('- Has valid access:', hasValidAccess);
  console.log('- Loading:', loading);
  console.log('- Initial load complete:', initialLoadComplete);

  return {
    subscription,
    hasValidAccess,
    loading,
    isInTrial: inTrialPeriod,
    isExpired: isExpired(),
    daysLeftInTrial: daysLeft,
    refetch: fetchSubscription
  };
};
