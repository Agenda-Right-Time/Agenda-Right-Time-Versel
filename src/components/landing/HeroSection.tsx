import { Button } from "@/components/ui/button";
import { Crown, ArrowRight } from "lucide-react";
import { useState } from "react";
import PaymentPopup from "@/components/PaymentPopup";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface HeroSectionProps {
  onStartTrial: () => void;
  onLogin: () => void;
}

const HeroSection = ({ onStartTrial, onLogin }: HeroSectionProps) => {
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleStartTrial = () => {
    if (user && !authLoading) {
      // Se está logado, redirecionar para dashboard
      // A verificação de acesso será feita no próprio dashboard
      navigate('/dashboard');
    } else {
      // Se não está logado, mostrar modal de signup/login
      onStartTrial();
    }
  };

  const handleLogin = () => {
    if (user && !authLoading) {
      // Se já está logado, redirecionar para dashboard
      navigate('/dashboard');
    } else {
      // Se não está logado, mostrar modal de login
      onLogin();
    }
  };

  const handlePaymentSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <section className="relative min-h-[60vh] sm:min-h-[70vh] flex items-center justify-center px-4 pt-6 sm:pt-8 overflow-visible">
      <div className="absolute inset-0 bg-gradient-radial from-gold-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,191,71,0.1),transparent_50%)]"></div>
      
      <div className="container mx-auto text-center relative z-20 overflow-visible max-w-4xl">
        <div className="animate-float">
          <Crown className="h-12 w-12 sm:h-16 sm:w-16 text-gold-500 mx-auto mb-6 sm:mb-8" />
        </div>
        
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-transparent bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text [-webkit-background-clip:text] [background-clip:text] relative z-50 overflow-visible pb-2 sm:pb-4 leading-tight">
          Agenda Right Time
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-3 sm:mb-4 max-w-3xl mx-auto px-2">
          Seu tempo, no momento certo.
        </p>
        
        <p className="text-sm sm:text-base md:text-lg text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto px-2">
          Onde elegância encontra eficiência. O sistema de agendamentos profissional que valoriza o seu tempo e o da sua clientela.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0">
          <Button 
            size="lg" 
            onClick={handleStartTrial}
            className="bg-gold-gradient hover:opacity-90 text-black font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg group transition-all duration-300 hover:scale-105 w-full sm:w-auto"
          >
            Comece Grátis - 7 Dias
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleLogin}
            className="border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg transition-all duration-300 w-full sm:w-auto"
          >
            Fazer Login
          </Button>
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

export default HeroSection;
