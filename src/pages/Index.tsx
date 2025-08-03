import LandingPage from "./LandingPage";
import DebugInfo from "@/components/DebugInfo";

// Página inicial redireciona para a landing page
const Index = () => {
  return (
    <>
      <DebugInfo />
      <LandingPage />
    </>
  );
};

export default Index;