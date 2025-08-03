
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import PaymentPopup from "@/components/PaymentPopup";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface CTASectionProps {
  onStartTrial: () => void;
}

const CTASection = ({ onStartTrial }: CTASectionProps) => {
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleStartTrial = () => {
    if (user && !authLoading) {
      // Se está logado, redirecionar para dashboard
      navigate('/dashboard');
    } else {
      // Se não está logado, mostrar modal de signup/login
      onStartTrial();
    }
  };

  const handlePaymentSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <section className="py-12 px-4 bg-gradient-to-t from-gold-900/20 to-transparent">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Pronto para agendar o <span className="text-gold-500">sucesso?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Transforme sua rotina e aumente sua produtividade com o Agenda Right Time
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Button 
              size="lg" 
              onClick={handleStartTrial}
              className="bg-gold-gradient hover:opacity-90 text-black font-semibold px-12 py-6 text-xl group transition-all duration-300 hover:scale-105"
            >
              Começar Teste Grátis
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black px-12 py-6 text-xl transition-all duration-300"
            >
              Fale Conosco
            </Button>
          </div>
          
          <p className="text-gray-500">
            📲 Comece hoje mesmo
          </p>
        </div>
      </div>

      <PaymentPopup
        isOpen={showPaymentPopup}
        onClose={() => setShowPaymentPopup(false)}
        onSuccess={handlePaymentSuccess}
        isSignup={true}
      />
    </section>
  );
};

export default CTASection;
