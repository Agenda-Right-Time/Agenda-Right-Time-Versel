


import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, Target, Star, Crown, Check } from "lucide-react";

const BenefitsSection = () => {
  const benefits = [
    {
      icon: Shield,
      title: "Segurança Garantida",
      description: "Pagamento antecipado reduz no-shows em 90%"
    },
    {
      icon: Zap,
      title: "Eficiência Máxima",
      description: "Automatize processos e foque no que importa"
    },
    {
      icon: Target,
      title: "Resultados Comprovados",
      description: "Aumente sua produtividade e faturamento"
    }
  ];

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto">
        
        {/* Seção de Informações do Plano Mensal */}
        <div className="max-w-md mx-auto bg-gray-900/50 backdrop-blur-sm border border-gold-500/20 rounded-2xl p-4 sm:p-6 md:p-8 mb-16">
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gold-gradient rounded-full mb-3 sm:mb-4">
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-black" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gold-500 mb-2">Plano Premium</h3>
            <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
              <span className="text-gray-400 text-base sm:text-lg">Apenas</span>
              <span className="text-2xl sm:text-3xl font-bold text-white">R$ 35,99</span>
              <span className="text-gray-400 text-sm sm:text-base">/mês</span>
            </div>
            <div className="bg-gray-800 rounded-md p-2 sm:p-3 mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-blue-400 text-center font-normal">
                💳 Sistema de pagamento antecipado integrado
              </p>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-gold-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs sm:text-sm">Agendamentos ilimitados</span>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-gold-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs sm:text-sm">Dashboard completo</span>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-gold-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs sm:text-sm">Gestão de clientes</span>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-gold-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs sm:text-sm">Relatórios detalhados</span>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-gold-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs sm:text-sm">Pagamento antecipado via PIX</span>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-gold-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs sm:text-sm">Suporte prioritário</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              💳 Cancele quando quiser • Sem taxas de cancelamento
            </p>
          </div>
        </div>

        <div className="text-center mb-16">
          <Badge className="bg-gold-500/20 text-gold-400 border-gold-500/30 mb-4">
            Por Que Escolher
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-gold-500">Agenda Right Time?</span>
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <Card key={index} className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700 p-8 text-center hover:border-gold-500/50 transition-all duration-300 group hover:scale-105">
              <benefit.icon className="h-16 w-16 text-gold-500 mx-auto mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-4 text-white">{benefit.title}</h3>
              <p className="text-gray-400">{benefit.description}</p>
            </Card>
          ))}
        </div>
        
        <div className="max-w-2xl mx-auto text-center">
          <ul className="space-y-4 text-lg">
            <li className="flex items-center justify-center space-x-3">
              <Star className="h-6 w-6 text-gold-500" />
              <span className="text-gray-300">Visual clean, elegante e profissional</span>
            </li>
            <li className="flex items-center justify-center space-x-3">
              <Star className="h-6 w-6 text-gold-500" />
              <span className="text-gray-300">Mais organização, menos no-shows</span>
            </li>
            <li className="flex items-center justify-center space-x-3">
              <Star className="h-6 w-6 text-gold-500" />
              <span className="text-gray-300">Sistema completo com suporte dedicado</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;


