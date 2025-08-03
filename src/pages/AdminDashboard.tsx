
import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminProfissionaisManager from '@/components/admin/AdminProfissionaisManager';
import AdminAssinaturasManager from '@/components/admin/AdminAssinaturasManager';
import AdminPagamentosManager from '@/components/admin/AdminPagamentosManager';
import AdminDashboardStats from '@/components/admin/AdminDashboardStats';
import AdminMobileView from '@/components/admin/AdminMobileView';
import AdminStripeConfig from '@/components/admin/AdminStripeConfig';
import SystemEditor from '@/components/admin/SystemEditor';
import { 
  Users, 
  CreditCard, 
  Crown,
  BarChart3,
  LogOut,
  Shield,
  Settings,
  Code
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const isAuthenticated = localStorage.getItem('admin-authenticated');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!isAuthenticated || !user) {
        navigate('/admin-login');
        return;
      }

      // Verificar se o usuário logado é admin
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('tipo_usuario')
        .eq('id', user.id)
        .single();

      if (error || profile?.tipo_usuario !== 'admin') {
        localStorage.removeItem('admin-authenticated');
        await supabase.auth.signOut();
        toast.error('Acesso negado. Você não tem permissão de administrador.');
        navigate('/admin-login');
        return;
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem('admin-authenticated');
    toast.success('Logout realizado com sucesso!');
    navigate('/admin-login');
  };

  // Usar versão mobile se for dispositivo móvel
  if (isMobile) {
    return <AdminMobileView />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 sm:h-8 w-6 sm:w-8 text-red-500" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                Admin Dashboard - Agenda Right Time
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Gerenciamento Completo do Sistema
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">Hudson Cruz - Administrador</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Painel Administrativo</h2>
          <p className="text-gray-400 text-sm sm:text-base">Gerencie e edite todo o sistema Agenda Right Time</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="bg-gray-900 border-gray-700 w-full sm:w-auto min-w-full">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="editor" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                <Code className="h-4 w-4 mr-2" />
                Editor Sistema
              </TabsTrigger>
              <TabsTrigger value="profissionais" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                <Users className="h-4 w-4 mr-2" />
                Profissionais
              </TabsTrigger>
              <TabsTrigger value="assinaturas" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                <Crown className="h-4 w-4 mr-2" />
                Assinaturas
              </TabsTrigger>
              <TabsTrigger value="pagamentos" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                <CreditCard className="h-4 w-4 mr-2" />
                Pagamentos
              </TabsTrigger>
              <TabsTrigger value="stripe" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                <Settings className="h-4 w-4 mr-2" />
                Stripe
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <AdminDashboardStats />
          </TabsContent>

          <TabsContent value="editor">
            <SystemEditor />
          </TabsContent>

          <TabsContent value="profissionais">
            <AdminProfissionaisManager />
          </TabsContent>

          <TabsContent value="assinaturas">
            <AdminAssinaturasManager />
          </TabsContent>

          <TabsContent value="pagamentos">
            <AdminPagamentosManager />
          </TabsContent>

          <TabsContent value="stripe">
            <AdminStripeConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
