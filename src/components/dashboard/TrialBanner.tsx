
import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

const TrialBanner = () => {
  const { subscription, isInTrial, daysLeftInTrial, loading } = useSubscription();

  console.log('TrialBanner render:');
  console.log('- Loading:', loading);
  console.log('- Is in trial:', isInTrial);
  console.log('- Days left:', daysLeftInTrial);

  // Não mostrar enquanto carrega
  if (loading) {
    console.log('TrialBanner: Not showing because loading');
    return null;
  }

  // Só mostrar se está no período de trial (status = 'trial') e tem dias restantes
  if (!isInTrial || daysLeftInTrial <= 0 || subscription?.status !== 'trial') {
    console.log('TrialBanner: Not showing because not in trial, no days left, or status is not trial');
    return null;
  }

  console.log('TrialBanner: Showing banner with', daysLeftInTrial, 'days left');

  return (
    <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/30 p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="bg-blue-500/20 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-blue-800 text-sm sm:text-base">Período de Teste Ativo</h3>
            <p className="text-xs sm:text-sm text-blue-700">
              Restam <strong className="text-blue-900">{daysLeftInTrial} dias</strong> do seu teste grátis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 text-blue-800 flex-shrink-0">
          <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm font-medium">Trial Agenda Right Time</span>
        </div>
      </div>
    </Card>
  );
};

export default TrialBanner;
