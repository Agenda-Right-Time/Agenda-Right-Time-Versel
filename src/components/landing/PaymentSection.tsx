
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Smartphone, Percent, CreditCard } from "lucide-react";

const PaymentSection = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <Badge className="bg-gold-500/20 text-gold-400 border-gold-500/30 mb-4">
            Sistema de Pagamentos
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Pagamento <span className="text-gold-500">Antecipado</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Revolucione seu negócio com nosso sistema de pagamento antecipado que elimina no-shows e garante sua renda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gold-500/20 p-3 rounded-lg">
                <Percent className="h-6 w-6 text-gold-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Porcentagem Flexível</h3>
            </div>
            <p className="text-gray-300 text-sm mb-3">Configure como quiser</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-gold-500 flex-shrink-0" />
                <span>Integração completa com Mercado Pago</span>
              </li>
            </ul>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-500/20 p-3 rounded-lg">
                <Smartphone className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-white">PIX Instantâneo</h3>
            </div>
            <p className="text-green-400 text-sm mb-3">Receba na hora</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-gold-500 flex-shrink-0" />
                <span>Pagamentos via PIX instantâneos</span>
              </li>
            </ul>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Sistema Antecipado</h3>
            </div>
            <p className="text-blue-400 text-sm mb-3">10, 20, 30, 40, 50 ou 100%</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-gold-500 flex-shrink-0" />
                <span>Sistema de pagamento antecipado</span>
              </li>
            </ul>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-500/20 p-3 rounded-lg">
                <Check className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Interface Moderna</h3>
            </div>
            <p className="text-red-400 text-sm mb-3">Redução de 90% nos no-shows</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-gold-500 flex-shrink-0" />
                <span>Interface moderna e intuitiva</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PaymentSection;
