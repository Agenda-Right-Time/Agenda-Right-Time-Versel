
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, DollarSign, Package, Sparkles } from 'lucide-react';

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao: string;
  tipo?: string;
}

interface ServicoSelectorProps {
  servicos: Servico[];
  selectedServico: string;
  onSelectServico: (servicoId: string) => void;
}

const ServicoSelector: React.FC<ServicoSelectorProps> = ({
  servicos,
  selectedServico,
  onSelectServico
}) => {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-600" />
          Escolha o Serviço
        </CardTitle>
        <p className="text-gray-400">Selecione o serviço que você deseja agendar</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {servicos.map((servico) => {
            const isPacoteMensal = servico.tipo === 'pacote_mensal' || servico.nome.includes('[PACOTE MENSAL]');
            const isSelected = selectedServico === servico.id;
            
            return (
              <div
                key={servico.id}
                onClick={() => onSelectServico(servico.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-yellow-500 bg-yellow-500/10' 
                    : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-750'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isPacoteMensal ? (
                        <Package className="h-4 w-4 text-purple-400" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className={`font-semibold ${isPacoteMensal ? 'text-purple-200' : 'text-yellow-200'}`}>
                        {servico.nome.replace('[PACOTE MENSAL] ', '')}
                      </span>
                      {isPacoteMensal && (
                        <span className="px-2 py-1 bg-purple-600 text-white rounded-full text-xs">
                          PACOTE MENSAL
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-300 mb-2">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>R$ {servico.preco.toFixed(2)} {isPacoteMensal ? '(4 sessões)' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{servico.duracao}min {isPacoteMensal ? 'cada sessão' : ''}</span>
                      </div>
                    </div>
                    
                    {servico.descricao && (
                      <p className="text-sm text-gray-400">{servico.descricao}</p>
                    )}
                    
                    {isPacoteMensal && (
                      <div className="text-sm text-purple-300 mt-2 font-medium">
                        📦 Pacote com 4 sessões • Pagamento antecipado 100% • Não reembolsável
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServicoSelector;
