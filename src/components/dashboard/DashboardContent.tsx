
import React from 'react';
import TrialBanner from './TrialBanner';
import ServicesManager from './ServicesManager';
import AppointmentsManager from './AppointmentsManager';
import ClientsManager from './ClientsManager';
import MercadoPagoSettings from './MercadoPagoSettings';
import SubscriptionManager from './SubscriptionManager';
import ProfissionaisManager from './ProfissionaisManager';
import AddressSettings from './AddressSettings';
import PixPercentageSettings from './PixPercentageSettings';
import SaldoManager from './SaldoManager';
import EstablishmentPhotoUpload from './EstablishmentPhotoUpload';
import CalendarManager from './CalendarManager';
import { CreditCard, MapPin, Percent, Settings } from 'lucide-react';

interface DashboardContentProps {
  activeTab: string;
}

const DashboardContent = ({ activeTab }: DashboardContentProps) => {
  const renderContent = () => {
    
    switch (activeTab) {
      case 'agendamentos':
        return <AppointmentsManager />;
      case 'servicos':
        return <ServicesManager />;
      case 'profissionais':
        return <ProfissionaisManager />;
      case 'clientes':
        return <ClientsManager />;
      case 'calendario':
        return <CalendarManager />;
      case 'saldo':
        return <SaldoManager />;
      case 'assinatura':
        return <SubscriptionManager />;
      case 'configuracoes':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Configurações</h3>
            
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h4 className="text-base font-semibold mb-4 flex items-center">
                  <Settings className="h-4 w-4 mr-2 text-gold-400" />
                  Configurações do Estabelecimento
                </h4>               
                <div className="space-y-4">
                  <div>
                    <AddressSettings />
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <EstablishmentPhotoUpload />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-base font-semibold mb-3 flex items-center">
                  <Percent className="h-4 w-4 mr-2 text-gold-400" />
                  Configuração PIX
                </h4>
                <PixPercentageSettings />
              </div>
              
              <div>
                <h4 className="text-base font-semibold mb-3 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-gold-400" />
                  Pagamentos
                </h4>
                <MercadoPagoSettings />
              </div>
            </div>
          </div>
        );
      default:
        return <AppointmentsManager />;
    }
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">Dashboard</h2>
        <p className="text-gray-400 text-sm sm:text-base">Gerencie seus agendamentos, clientes e serviços</p>
      </div>
  
      <TrialBanner />
      {renderContent()}
    </div>
  );
  };
  
  export default DashboardContent;
