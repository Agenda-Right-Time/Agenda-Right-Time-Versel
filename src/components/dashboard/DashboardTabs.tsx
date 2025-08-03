
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Users, 
  Settings,
  CreditCard, 
  Crown,
  Clock,
  UserCheck,
  Image as ImageIcon,
  MapPin,
  Percent,
  Wallet,
  CalendarDays
} from 'lucide-react';
import ServicesManager from './ServicesManager';
import AppointmentsManager from './AppointmentsManager';
import ClientsManager from './ClientsManager';
import MercadoPagoSettings from './MercadoPagoSettings';
import SubscriptionManager from './SubscriptionManager';
import ProfissionaisManager from './ProfissionaisManager';
import SalaoPhotoUpload from './SalaoPhotoUpload';
import AddressSettings from './AddressSettings';
import PixPercentageSettings from './PixPercentageSettings';
import SaldoManager from './SaldoManager';
import CalendarManager from './CalendarManager';

interface DashboardTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DashboardTabs = ({ activeTab, setActiveTab }: DashboardTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="overflow-x-auto">
        <TabsList className="bg-gray-900 border-gray-700 w-full sm:w-auto min-w-full">
          <TabsTrigger value="agendamentos" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            <Calendar className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Agendamentos</span>
            <span className="sm:hidden">Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="servicos" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            <Clock className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
            Serviços
          </TabsTrigger>
          <TabsTrigger value="profissionais" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            <UserCheck className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Profissionais</span>
            <span className="sm:hidden">Equipe</span>
          </TabsTrigger>
          <TabsTrigger value="calendario" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            <CalendarDays className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Calendário</span>
            <span className="sm:hidden">Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="clientes" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            <Users className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="saldo" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            <Wallet className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
            Saldo
          </TabsTrigger>
          <TabsTrigger value="foto-estabelecimento" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            <ImageIcon className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Foto do Estabelecimento</span>
            <span className="sm:hidden">Foto</span>
          </TabsTrigger>
          <TabsTrigger value="assinatura" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            <Crown className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Assinatura</span>
            <span className="sm:hidden">Plano</span>
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            <Settings className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Configurações</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="agendamentos">
        <AppointmentsManager />
      </TabsContent>

      <TabsContent value="servicos">
        <ServicesManager />
      </TabsContent>

      <TabsContent value="profissionais">
        <ProfissionaisManager />
      </TabsContent>

      <TabsContent value="calendario">
        <CalendarManager />
      </TabsContent>

      <TabsContent value="clientes">
        <ClientsManager />
      </TabsContent>

      <TabsContent value="saldo">
        <SaldoManager />
      </TabsContent>

      <TabsContent value="foto-estabelecimento">
        <div className="space-y-6">
          <h3 className="text-xl sm:text-2xl font-bold">Foto do Estabelecimento</h3>
          <p className="text-gray-400 text-sm sm:text-base">
            Faça upload de uma foto do seu estabelecimento que será exibida para os clientes na página de agendamento.
          </p>
          <SalaoPhotoUpload />
        </div>
      </TabsContent>

      <TabsContent value="assinatura">
        <SubscriptionManager />
      </TabsContent>

      <TabsContent value="configuracoes">
        <div className="space-y-6">
          <h3 className="text-xl sm:text-2xl font-bold">Configurações</h3>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h4 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
                <MapPin className="h-4 sm:h-5 w-4 sm:w-5 mr-2 text-gold-400" />
                Endereço
              </h4>
              <AddressSettings />
            </div>
            
            <div>
              <h4 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
                <Percent className="h-4 sm:h-5 w-4 sm:w-5 mr-2 text-gold-400" />
                Configuração PIX
              </h4>
              <PixPercentageSettings />
            </div>
            
            <div>
              <h4 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
                <CreditCard className="h-4 sm:h-5 w-4 sm:w-5 mr-2 text-gold-400" />
                Pagamentos
              </h4>
              <MercadoPagoSettings />
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default DashboardTabs;
