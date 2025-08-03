
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, X, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscriptionId?: string;
  isSignup?: boolean;
}

// Payment Form Component
const PaymentForm: React.FC<{
  email: string;
  onSuccess: () => void;
  onClose: () => void;
  subscriptionId?: string;
}> = ({ email, onSuccess, onClose, subscriptionId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Criando payment intent...');
      
      // Create payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-intent', {
        body: { 
          email: email.trim(),
          subscriptionId 
        }
      });

      if (paymentError || !paymentData?.clientSecret) {
        throw new Error(paymentError?.message || 'Erro ao criar payment intent');
      }

      console.log('✅ Payment intent criado');

      // Confirm payment
      const { error: confirmError } = await stripe.confirmCardPayment(paymentData.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: email,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Erro ao confirmar pagamento');
      }

      console.log('✅ Pagamento confirmado');
      
      // Verificar se a assinatura foi ativada no Stripe e sincronizar
      console.log('🔄 Verificando status da assinatura no Stripe...');
      
      try {
        const { data: checkData, error: checkError } = await supabase.functions.invoke('check-stripe-payment');
        
        if (checkError) {
          console.warn('⚠️ Erro ao verificar assinatura:', checkError);
        } else if (checkData?.success) {
          console.log('✅ Assinatura sincronizada com sucesso!');
        }
      } catch (syncError) {
        console.warn('⚠️ Erro na sincronização:', syncError);
      }
      
      toast({
        title: "Pagamento realizado!",
        description: "Sua assinatura foi ativada com sucesso.",
      });

      // Pequeno delay para garantir que o webhook processou
      setTimeout(() => {
        // Fechar o popup
        onClose();
        
        // Chamar onSuccess para atualizar os dados
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error('❌ Erro no pagamento:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-800 p-4 rounded-lg">
        <Label className="text-white mb-2 block">Dados do Cartão</Label>
        <div className="p-3 bg-white rounded border">
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
              disableLink: true,
            }}
          />
        </div>
      </div>
      
      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-gold-gradient text-black font-semibold hover:opacity-90 py-3"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
            Processando pagamento...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Pagar R$ 35,99/mês
          </div>
        )}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        <Lock className="inline h-3 w-3 mr-1" />
        Pagamento seguro processado pela Stripe
      </p>
    </form>
  );
};

const PaymentPopup: React.FC<PaymentPopupProps> = ({
  isOpen,
  onClose,
  onSuccess,
  subscriptionId,
  isSignup = false
}) => {
  const [email, setEmail] = useState('');
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load Stripe
  useEffect(() => {
    const loadStripeConfig = async () => {
      try {
        const { data } = await supabase
          .from('admin_stripe_config')
          .select('publishable_key')
          .single();
        
        if (data?.publishable_key) {
          setStripePromise(loadStripe(data.publishable_key));
        }
      } catch (error) {
        console.error('Error loading Stripe config:', error);
        toast({
          title: "Erro de configuração",
          description: "Não foi possível carregar a configuração do Stripe.",
          variant: "destructive"
        });
      }
    };

    if (isOpen) {
      loadStripeConfig();
    }
  }, [isOpen, toast]);

  // Preencher email do usuário logado automaticamente
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  if (!stripePromise) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
            <span className="ml-2">Carregando...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="h-6 w-6 text-gold-500" />
            Pagamento da Assinatura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-gold-400 mb-2">Plano Agenda Right Time</h3>
            <div className="text-2xl font-bold text-gold-400">
              R$ 35,99<span className="text-sm text-gray-400">/mês</span>
            </div>
            <p className="text-sm text-gray-300 mt-2">
              Acesso completo + cobrança automática mensal
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">
                Email do Profissional *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-gray-800 border-gray-600 text-white"
                required
                disabled={!!user?.email}
              />
              <p className="text-xs text-gray-400 mt-1">
                {user?.email ? 'Email do usuário logado' : 'Para identificação do pagamento'}
              </p>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-300 text-sm">
              🔒 <strong>Pagamento Direto e Seguro</strong><br />
              Seus dados de cartão são processados diretamente pela Stripe sem passar pelos nossos servidores.
            </p>
          </div>

          <Elements stripe={stripePromise}>
            <PaymentForm 
              email={email} 
              onSuccess={onSuccess} 
              onClose={onClose}
              subscriptionId={subscriptionId}
            />
          </Elements>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentPopup;
