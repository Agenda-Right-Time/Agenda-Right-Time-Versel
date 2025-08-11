
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GlobalThemeProvider } from "@/hooks/useThemeManager";

// Páginas públicas (sem autenticação)
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import PublicDashboard from "./pages/PublicDashboard";
import ClientDashboardPage from "./pages/ClientDashboardPage";
import RoutesDemo from "./pages/RoutesDemo";

// Páginas com autenticação (mantidas para compatibilidade)
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Agendamento from "./pages/Agendamento";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GlobalThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          {/* Página de demonstração de todas as rotas */}
          <Route path="/rotas" element={<RoutesDemo />} />
          
          {/* Páginas públicas - sem autenticação */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard-publico" element={<PublicDashboard />} />
          
          {/* Rotas com slug da empresa */}
          <Route path="/:empresaSlug" element={<Agendamento />} />
          
          {/* Páginas originais - com autenticação */}
          <Route path="/" element={<Index />} />
          <Route path="/agendamento" element={<Agendamento />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </GlobalThemeProvider>
  </QueryClientProvider>
);

export default App;
