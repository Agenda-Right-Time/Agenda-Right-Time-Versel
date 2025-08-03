
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

const EmptyAppointments = () => {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardContent className="p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">
          Nenhum agendamento encontrado
        </h3>
        <p className="text-gray-500">
          Você ainda não possui agendamentos neste estabelecimento.
        </p>
      </CardContent>
    </Card>
  );
};

export default EmptyAppointments;
