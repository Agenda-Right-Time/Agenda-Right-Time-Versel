
import { useState } from "react";
import TrialSignup from "@/components/TrialSignup";
import HeroSection from "@/components/landing/HeroSection";
import TargetAudienceSection from "@/components/landing/TargetAudienceSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PaymentSection from "@/components/landing/PaymentSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  const [showTrialSignup, setShowTrialSignup] = useState(false);
  const [showLoginMode, setShowLoginMode] = useState(false);

  const handleStartTrial = () => {
    setShowLoginMode(false);
    setShowTrialSignup(true);
  };

  const handleLogin = () => {
    setShowLoginMode(true);
    setShowTrialSignup(true);
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <HeroSection onStartTrial={handleStartTrial} onLogin={handleLogin} />
      <TargetAudienceSection />
      <FeaturesSection />
      <PaymentSection />
      <BenefitsSection />
      <CTASection onStartTrial={handleStartTrial} />
      <Footer />

      {showTrialSignup && (
        <TrialSignup 
          onClose={() => setShowTrialSignup(false)} 
          initialLoginMode={showLoginMode}
        />
      )}
    </div>
  );
};

export default LandingPage;
