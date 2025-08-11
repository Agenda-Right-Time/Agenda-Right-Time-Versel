
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  CreditCard, 
  Crown,
  BarChart3,
  LogOut,
  Shield
} from 'lucide-react';
import AdminDashboardStats from '@/components/admin/AdminDashboardStats';
import AdminProfissionaisManager from '@/components/admin/AdminProfissionaisManager';
import AdminAssinaturasManager from '@/components/admin/AdminAssinaturasManager';
import AdminPagamentosManager from '@/components/admin/AdminPagamentosManager';

const AdminMobileView = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate('/admin-login');
  };

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: BarChart3,
      component: <AdminDashboardStats />
    },
    {
      id: 'profissionais',
      title: 'Profissionais',
      icon: Users,
      component: <AdminProfissionaisManager />
    },
    {
      id: 'assinaturas',
      title: 'Assinaturas',
      icon: Crown,
      component: <AdminAssinaturasManager />
    },
    {
      id: 'pagamentos',
      title: 'Pagamentos',
      icon: CreditCard,
      component: <AdminPagamentosManager />
    }
  ];

  const activeMenuItem = menuItems.find(item => item.id === activeTab);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-black text-white">
        <Sidebar className="bg-gray-900 border-gray-700 flex flex-col">
          <SidebarHeader className="border-b border-gray-700 p-3 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-red-500 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <h1 className="text-sm font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent leading-tight">
                  Admin Dashboard
                </h1>
                <span className="text-xs text-gray-400">Right Time</span>
              </div>
            </div>
          </SidebarHeader>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 scrollbar-hide">
            <SidebarContent className="pb-0">
              <SidebarGroup>
                <SidebarGroupLabel className="text-gray-400 text-xs">Menu Administrativo</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveTab(item.id)}
                          isActive={activeTab === item.id}
                          className="w-full text-left hover:bg-gray-800 data-[active=true]:bg-red-500 data-[active=true]:text-white text-sm"
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </div>

          <SidebarFooter className="border-t border-gray-700 p-3 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white text-xs"
            >
              <LogOut className="h-3 w-3 mr-2" />
              Sair
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="bg-gray-900 border-b border-gray-700 p-3 flex items-center gap-3">
            <SidebarTrigger className="text-white hover:bg-gray-800" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{activeMenuItem?.title}</h2>
              <p className="text-xs text-gray-400 truncate">Painel administrativo</p>
            </div>
          </header>

          <main className="flex-1 p-3 space-y-4">
            {activeMenuItem?.component}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminMobileView;
