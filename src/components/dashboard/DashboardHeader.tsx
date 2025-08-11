import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, ExternalLink, LogOut, Copy, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useBusinessData } from '@/hooks/useBusinessData';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
// Importação do hook de tema e componente de alternância
import { useTheme } from '@/hooks/useThemeManager';
import ThemeToggle from '@/components/ui/theme-toggle';

interface DashboardHeaderProps {
  onViewPublicBooking: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const DashboardHeader = ({ onViewPublicBooking, activeTab, setActiveTab }: DashboardHeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { businessData } = useBusinessData(user?.id || null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Hook para gerenciar o tema do dashboard profissional
  const { isLightTheme, toggleTheme } = useTheme();

  const menuItems = [
    { id: 'agendamentos', label: 'Agendamentos' },
    { id: 'servicos', label: 'Serviços' },
    { id: 'profissionais', label: 'Profissionais' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'calendario', label: 'Calendário' },
    { id: 'saldo', label: 'Saldo' },
    { id: 'assinatura', label: 'Assinatura' },
    { id: 'configuracoes', label: 'Configurações' },
  ];

  const generatePublicLink = () => {
    if (businessData?.businessInfo?.empresa_slug) {
      return `https://agendarighttime.com.br/${businessData.businessInfo.empresa_slug}`;
    }
    return `https://agendarighttime.com.br/agendamento?owner=${user?.id}`;
  };

  const handleCopyLink = async () => {
    const link = generatePublicLink();
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copiado!",
        description: "O link da sua página de agendamento foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('Tentando fazer logout...');
      
      // Fazer logout
      await signOut();
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      
      // Redirecionar para home e recarregar
      window.location.href = '/';
      
    } catch (error) {
      console.error('Erro inesperado no logout:', error);
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado.",
      });
      
      // Mesmo com erro, redirecionar
      window.location.href = '/';
    }
  };

  const handleTabClick = (tabId: string) => {
    if (setActiveTab) {
      setActiveTab(tabId);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className={`border-b p-4 transition-colors duration-300 ${
      isLightTheme 
        ? 'bg-white border-gold-500' // Tema claro - fundo branco com borda dourada
        : 'bg-gray-900 border-gray-800' // Tema escuro - mantém o original
    }`}>
      <div className="container mx-auto">
        {/* Header principal */}
        <div className="flex items-center justify-between mb-4">
          {/* Menu mobile - Sheet centralizado */}
          <div className="flex items-center space-x-3 lg:hidden">
            <div className="absolute left-4">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="border-gray-600 text-gray-900 bg-white hover:bg-gray-100">
                    <Menu className="h-4 w-4 text-gray-900" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className={`w-80 transition-colors duration-300 ${
                  isLightTheme 
                    ? 'bg-white border-gold-500 text-black' // Tema claro - fundo branco com borda dourada
                    : 'bg-white border-gray-300 text-black' // Tema escuro - mantém branco como estava
                }`}>
                  <SheetHeader className="border-b border-gray-300 pb-4">
                    <SheetTitle className="text-left text-black flex items-center space-x-3">
                      <Crown className="h-6 w-6 text-gold-500" />
                      <span className="text-lg font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
                        Agenda Right Time
                      </span>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="flex-1 h-[calc(100vh-100px)] overflow-y-auto scrollbar-hide bg-background">
                    <div className="mt-6 space-y-6 p-4">
                      {/* Abas do menu */}
                      <div></div>

                      <h3 className="text-sm font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent mb-3">DASHBOARD</h3>
                      <div className="space-y-2">
                        {menuItems.map((item) => (
                          <Button
                            key={item.id}
                            variant={activeTab === item.id ? "default" : "ghost"}
                            className={`w-full justify-start text-left ${
                              activeTab === item.id 
                                ? 'bg-gold-500 text-black hover:bg-gold-600' 
                                : 'text-gray-700 hover:bg-gray-100 hover:text-black'
                            }`}
                            onClick={() => handleTabClick(item.id)}
                          >
                            {item.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Links úteis */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3">LINKS ÚTEIS</h3>
                      <div className="space-y-2">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => {
                            onViewPublicBooking();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Página Pública
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={handleCopyLink}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Link
                        </Button>
                      </div>
                    </div>

                    {/* Controle de tema */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3">TEMA</h3>
                      <div className="flex items-center justify-between">
                        <ThemeToggle isLightTheme={isLightTheme} onToggle={toggleTheme} />
                      </div>
                    </div>

                    {/* User info e logout */}
                    <div className="border-t border-gray-300 pt-4">
                      <div className="text-sm text-gray-600 mb-3 truncate">{user?.email}</div>
                      <Button 
                        variant="outline" 
                        className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            <div className="flex items-center space-x-3">
              <Crown className="h-6 sm:h-8 w-6 sm:w-8 text-gold-500" />
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
                Agenda Right Time
              </h1>
            </div>
          </div>

          {/* Desktop - Logo */}
          <div className="hidden lg:flex items-center space-x-3">
            <Crown className="h-6 sm:h-8 w-6 sm:w-8 text-gold-500" />
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
              Agenda Right Time
            </h1>
          </div>

          {/* Desktop - controle de tema, user info e logout */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Controle de tema */}
            <div className="flex items-center space-x-2">
              <ThemeToggle isLightTheme={isLightTheme} onToggle={toggleTheme} />
            </div>
            
            <span className={`text-sm truncate ${isLightTheme ? 'text-gray-700' : 'text-gray-300'}`}>
              {user?.email}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              <LogOut className="h-3 sm:h-4 w-3 sm:w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {/* Menu desktop - abas e botões */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                size="sm"
                className={`text-xs ${
                  activeTab === item.id 
                    ? 'bg-gold-500 text-black hover:bg-gold-600' 
                    : isLightTheme 
                      ? 'text-gray-700 hover:bg-gray-100 hover:text-black' // Tema claro - texto escuro
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white' // Tema escuro - mantém original
                }`}
                onClick={() => handleTabClick(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewPublicBooking}
              className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Página Pública
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyLink}
              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white text-xs"
            >
              <Copy className="h-3 w-3 mr-2" />
              Copiar Link
            </Button>
          </div>
        </div>

        {/* Menu tablet - abas em scroll horizontal */}
        <div className="hidden md:flex lg:hidden overflow-x-auto scrollbar-hide">
          <div className="flex items-center space-x-1 min-w-max pb-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                size="sm"
                className={`text-xs whitespace-nowrap ${
                  activeTab === item.id 
                    ? 'bg-gold-500 text-black hover:bg-gold-600' 
                    : isLightTheme 
                      ? 'text-gray-700 hover:bg-gray-100 hover:text-black' // Tema claro - texto escuro
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white' // Tema escuro - mantém original
                }`}
                onClick={() => handleTabClick(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Botões para tablet */}
        <div className="hidden md:flex lg:hidden items-center justify-center space-x-2 mt-2">
          {/* Controle de tema para tablet */}
          <ThemeToggle isLightTheme={isLightTheme} onToggle={toggleTheme} />
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewPublicBooking}
            className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Página Pública
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopyLink}
            className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white text-xs"
          >
            <Copy className="h-3 w-3 mr-2" />
            Copiar Link
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs"
          >
            <LogOut className="h-3 w-3 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
