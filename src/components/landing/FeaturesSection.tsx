
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  BarChart3, 
  Users, 
  Smartphone
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Calendar,
      title: "Agenda Online 24h",
      description: "Seus clientes marcam quando quiserem, mesmo fora do expediente"
    },
    {
      icon: MessageSquare,
      title: "Confirmações Automáticas",
      description: "WhatsApp, SMS ou e-mail - nunca perca um agendamento"
    },
    {
      icon: CreditCard,
      title: "Pagamentos Integrados",
      description: "Receba 50% antecipadamente para garantir o compromisso"
    },
    {
      icon: BarChart3,
      title: "Painel Inteligente",
      description: "Acompanhe horários, fluxo de caixa e relatórios completos"
    },
    {
      icon: Users,
      title: "Multiusuário",
      description: "Perfeito para equipes com controle de permissões"
    },
    {
      icon: Smartphone,
      title: "App + Web",
      description: "Design responsivo e clean em todas as plataformas"
    }
  ];

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <Badge className="bg-gold-500/20 text-gold-400 border-gold-500/30 mb-4">
            Funcionalidades
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Que fazem a <span className="text-gold-500">diferença</span>
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700 p-8 hover:border-gold-500/50 transition-all duration-300 group hover:scale-105">
              <feature.icon className="h-12 w-12 text-gold-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
