
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Plus } from 'lucide-react';

interface PaymentSuccessProps {
  onNewAppointment: () => void;
  onBackToAppointments: () => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ 
  onNewAppointment, 
  onBackToAppointments 
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Card de sucesso */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-green-500/20 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-white text-3xl mb-2">
            Pagamento Confirmado!
          </CardTitle>
          <p className="text-gray-300 text-lg">
            Seu agendamento foi finalizado com sucesso
          </p>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Calendar className="h-6 w-6 text-gold-500" />
              <h3 className="text-xl font-semibold text-white">
                Agendamento Confirmado
              </h3>
            </div>
            <p className="text-gray-300">
              Você receberá uma confirmação por email/WhatsApp com todos os detalhes do seu agendamento.
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-gray-400 text-sm space-y-2">
              <p>✅ Pagamento processado com sucesso</p>
              <p>✅ Agendamento confirmado</p>
              <p>✅ Notificação enviada</p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={onBackToAppointments}
              variant="outline"
              className="flex-1 border-gray-600 text-white hover:bg-gray-800"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Ver Agendamentos
            </Button>
            
            <Button
              onClick={onNewAppointment}
              className="flex-1 bg-gold-gradient text-black font-semibold hover:opacity-90"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Agendamento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
