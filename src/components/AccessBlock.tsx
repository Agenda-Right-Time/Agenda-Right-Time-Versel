
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown, CreditCard, X } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import PaymentPopup from '@/components/PaymentPopup';
import { useNavigate } from 'react-router-dom';

interface AccessBlockProps {
  onUpgrade: () => void;
}

const AccessBlock = ({ onUpgrade }: AccessBlockProps) => {
  const { daysLeftInTrial, isInTrial, subscription } = useSubscription();
  const { signOut } = useAuth();
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const navigate = useNavigate();

  const handlePaymentSuccess = () => {
    // Recarregar a página para atualizar o estado
    window.location.reload();
  };

  const handleExit = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-700 p-8 max-w-md w-full text-center relative">
        <Button
          onClick={handleExit}
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
        <Crown className="h-16 w-16 text-gold-500 mx-auto mb-6" />
        
        {isInTrial ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Teste Grátis</h1>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <p className="text-blue-300 mb-2">
                Restam <strong>{daysLeftInTrial} dias</strong> do seu teste grátis
              </p>
              <p className="text-sm text-blue-300/80">
                Assine agora para continuar usando todas as funcionalidades
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4 text-red-400">Acesso Bloqueado</h1>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-300 mb-2">
                Seu período de teste expirou
              </p>
              <p className="text-sm text-red-300/80">
                Assine o plano para recuperar o acesso ao Right Time
              </p>
            </div>
          </>
        )}

        <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gold-400">
            Plano Right Time
          </h3>
          <div className="text-3xl font-bold text-gold-400 mb-2">
            R$ 35,99<span className="text-sm text-gray-400">/mês</span>
          </div>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>✓ Agendamentos ilimitados</li>
            <li>✓ Gestão de clientes</li>
            <li>✓ Controle de serviços</li>
            <li>✓ Pagamentos PIX automáticos</li>
            <li>✓ Relatórios completos</li>
            <li>✓ Cobrança automática mensal</li>
          </ul>
        </div>

        <Button
          onClick={() => setShowPaymentPopup(true)}
          className="w-full bg-gold-gradient text-black font-semibold hover:opacity-90 mb-4"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Assinar Agora
        </Button>

        <p className="text-xs text-gray-400">
          Pagamento seguro com cobrança automática
        </p>
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

export default AccessBlock;
