
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

const TargetAudienceSection = () => {
  const targetAudience = [
    "Profissionais de beleza e estética",
    "Profissionais da saúde",
    "Coaches e consultores",
    "Pequenos negócios",
    "Espaços compartilhados",
    "Empresas de atendimento"
  ];

  return (
    <section className="py-12 px-4 bg-gradient-to-b from-transparent to-gray-900/20">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <Badge className="bg-gold-500/20 text-gold-400 border-gold-500/30 mb-4">
            Para Quem É
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Perfeito para <span className="text-gold-500">Profissionais</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Ideal para quem busca excelência no atendimento e gestão de tempo
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {targetAudience.map((audience, index) => (
            <Card key={index} className="bg-gray-900/50 border-gray-800 p-6 hover:border-gold-500/50 transition-all duration-300 hover:scale-105">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-gold-500 flex-shrink-0" />
                <span className="text-gray-200 font-medium">{audience}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TargetAudienceSection;
