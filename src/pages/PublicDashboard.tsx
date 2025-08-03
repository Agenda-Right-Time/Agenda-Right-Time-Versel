
import React, { useState } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardContent from '@/components/dashboard/DashboardContent';

const PublicDashboard = () => {
  const [activeTab, setActiveTab] = useState('agendamentos');

  const handleViewPublicBooking = () => {
    window.location.href = '/agendamento-publico';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader 
        onViewPublicBooking={handleViewPublicBooking} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <DashboardContent activeTab={activeTab} />
    </div>
  );
};

export default PublicDashboard;
