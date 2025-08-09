
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { usePendingAppointments } from '@/hooks/usePendingAppointments';

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao?: string;
}

interface Profissional {
  id: string;
  nome: string;
  especialidade?: string;
  foto_url?: string;
}

interface ConfirmacaoAgendamentoProps {
  selectedDate?: Date;
  selectedTime: string;
  selectedServico: string;
  selectedProfissional: string;
  servicos: Servico[];
  profissionais: Profissional[];
  onConfirmar: () => void;
  loading: boolean;
  clienteNome?: string;
  observacoes?: string;
  onObservacoesChange?: (value: string) => void;
  ownerId: string;
  clienteId?: string;
}

const ConfirmacaoAgendamento: React.FC<ConfirmacaoAgendamentoProps> = ({
  selectedDate,
  selectedTime,
  selectedServico,
  selectedProfissional,
  servicos,
  profissionais,
  onConfirmar,
  loading,
  clienteNome,
  ownerId,
  clienteId
}) => {
  const [percentualAntecipado, setPercentualAntecipado] = useState<number>(50);
  
  console.log('🔍 [CONFIRMACAO DEBUG] ConfirmacaoAgendamento - dados recebidos:', { 
    clienteId, 
    ownerId, 
    selectedProfissional,
    hasClienteId: !!clienteId,
    clienteIdType: typeof clienteId,
    clienteIdValue: clienteId
  });
  
  const { hasPendingAppointments, pendingAppointmentIds } = usePendingAppointments({
    clienteId: clienteId || '',
    ownerId,
    profissionalId: selectedProfissional,
    enabled: !!clienteId && !!selectedProfissional
  });

  console.log('🎯 [CONFIRMACAO DEBUG] ConfirmacaoAgendamento - resultado do hook:', { 
    hasPendingAppointments, 
    pendingAppointmentIds,
    enabled: !!clienteId && !!selectedProfissional,
    hookParams: {
      clienteId: clienteId || '',
      ownerId,
      profissionalId: selectedProfissional,
      enabled: !!clienteId && !!selectedProfissional
    }
  });
  
  const selectedServicoData = servicos.find(s => s.id === selectedServico);
  const selectedProfissionalData = profissionais.find(p => p.id === selectedProfissional);

  useEffect(() => {
    fetchPercentualAntecipado();
  }, [ownerId]);

  const fetchPercentualAntecipado = async () => {
    try {
      const { data: configuracao, error } = await supabase
        .from('configuracoes')
        .select('percentual_antecipado')
        .eq('user_id', ownerId)
        .single();

      if (error) {
        console.error('Erro ao buscar configuração:', error);
        return;
      }

      if (configuracao) {
        setPercentualAntecipado(configuracao.percentual_antecipado || 50);
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  if (!selectedDate || !selectedTime || !selectedServico || !selectedProfissional) {
    return null;
  }

  const valorTotal = selectedServicoData?.preco || 0;
  const valorAntecipado = valorTotal * (percentualAntecipado / 100);

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-4">Confirmar Agendamento</h3>
            
            <div className="bg-gray-800 rounded-lg p-4 space-y-3 mb-4">
              {clienteNome && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Cliente:</span>
                  <span className="text-white font-medium">{clienteNome}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Serviço:</span>
                <span className="text-white font-medium">{selectedServicoData?.nome}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Profissional:</span>
                <span className="text-white font-medium">{selectedProfissionalData?.nome}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Data:</span>
                <span className="text-white font-medium">
                  {selectedDate && format(selectedDate, "dd/MM/yyyy")}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Horário:</span>
                <span className="text-white font-medium">{selectedTime}</span>
              </div>
              
              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Valor total:</span>
                  <span className="text-white font-bold text-lg">
                    R$ {valorTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Pagamento antecipado ({percentualAntecipado}%):</span>
                  <span className="text-yellow-500 font-semibold">
                    R$ {valorAntecipado.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {hasPendingAppointments ? (
            <div className="space-y-3">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm font-medium mb-1">
                  ⚠️ Agendamentos Pendentes
                </p>
                <p className="text-gray-300 text-sm">
                  Você possui agendamentos pendentes com este profissional. 
                  Faça o pagamento ou cancele para continuar agendando.
                </p>
              </div>
              <Button 
                disabled={true}
                className="w-full bg-gray-600 text-gray-400 cursor-not-allowed"
              >
                Confirmar Agendamento
              </Button>
            </div>
          ) : (
            <Button 
              onClick={onConfirmar}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold hover:opacity-90"
            >
              {loading ? 'Processando...' : 'Confirmar Agendamento'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfirmacaoAgendamento;
