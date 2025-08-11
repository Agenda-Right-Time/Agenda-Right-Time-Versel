
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { CreditCard, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PaymentPopup from '@/components/PaymentPopup';
import { useTheme } from '@/hooks/useThemeManager';

const SubscriptionManager = () => {
  const { subscription, hasValidAccess, isInTrial, isExpired, daysLeftInTrial, refetch } = useSubscription();
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const { toast } = useToast();
  const { isLightTheme } = useTheme();

  const handlePaymentSuccess = () => {
    // Atualizar dados da assinatura
    refetch();
    toast({
      title: "Assinatura ativada! 🎉",
      description: "Sua mensalidade foi paga e a cobrança automática foi configurada."
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativa': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'trial': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'suspensa': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'cancelada': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativa': return <CheckCircle className={`${isLightTheme ? 'text-green-600' : 'text-green-400'} h-5 w-5`} />;
      case 'trial': return <Clock className={`${isLightTheme ? 'text-blue-600' : 'text-blue-400'} h-5 w-5`} />;
      case 'suspensa': return <AlertTriangle className={`${isLightTheme ? 'text-red-600' : 'text-red-400'} h-5 w-5`} />;
      case 'cancelada': return <AlertTriangle className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} h-5 w-5`} />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  // Mostrar informações mesmo sem assinatura cadastrada
  const displayStatus = subscription?.status || 'trial';
  const displayPrice = subscription?.preco || 35.99;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Minha Assinatura</h3>
        <Button onClick={refetch} variant="outline" className="border-gray-600">
          Atualizar
        </Button>
      </div>

      <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'} p-6`}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            {getStatusIcon(displayStatus)}
            <div>
              <h4 className={`${isLightTheme ? 'text-gold-700' : 'text-gold-400'} text-md font-semibold mb-6`}>Plano Agenda Right Time</h4>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(displayStatus)}`}>
                {displayStatus === 'trial' ? 'PERÍODO DE TESTE' :
                 displayStatus === 'ativa' ? 'ATIVA' :
                 displayStatus === 'suspensa' ? 'SUSPENSA' : 'CANCELADA'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`${isLightTheme ? 'text-gold-700' : 'text-gold-400'} text-2xl font-bold`}>
              R$ {displayPrice.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">por mês</div>
          </div>
        </div>

        {subscription && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} h-4 w-4`} />
                <span className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-sm`}>Data de início:</span>
                <span className={`${isLightTheme ? 'text-black' : 'text-white'}`}>
                  {format(new Date(subscription.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} h-4 w-4`} />
                <span className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-sm`}>Próximo vencimento:</span>
                <span className={`${isLightTheme ? 'text-black' : 'text-white'}`}>
                  {format(new Date(subscription.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            </div>

            {isInTrial && subscription?.status === 'trial' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span className="font-medium text-blue-500">Período de Teste</span>
                </div>
                <p className="text-sm text-blue-500">
                  Restam <strong>{daysLeftInTrial} dias</strong> do seu teste grátis
                </p>
                {subscription && (
                  <p className="text-xs text-blue-500/80 mt-1">
                    Teste válido até {format(new Date(subscription.trial_ate), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!hasValidAccess && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="font-medium text-red-400">Acesso Bloqueado</span>
            </div>
            <p className="text-sm text-red-300">
              Seu período de teste expirou. Realize o pagamento para continuar usando o Agenda Right Time.
            </p>
          </div>
        )}

        {(displayStatus === 'trial' || displayStatus === 'cancelada' || displayStatus === 'suspensa') && (
          <div className="flex gap-3">
            <Button
              onClick={() => setShowPaymentPopup(true)}
              className="bg-gold-gradient text-black font-semibold hover:opacity-90"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar Mensalidade - R$ 35,99
            </Button>
          </div>
        )}

        {subscription?.status === 'ativa' && hasValidAccess && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-500">Assinatura Ativa</span>
            </div>
            <p className="text-sm text-green-500">
              Sua assinatura está ativa com cobrança automática. Próximo vencimento em {format(new Date(subscription.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}.
            </p>
          </div>
        )}
      </Card>

      <PaymentPopup
        isOpen={showPaymentPopup}
        onClose={() => setShowPaymentPopup(false)}
        onSuccess={handlePaymentSuccess}
        subscriptionId={subscription?.id}
      />
    </div>
  );
};

export default SubscriptionManager;
