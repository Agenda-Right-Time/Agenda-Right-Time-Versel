
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  UserCheck, 
  Link, 
  Unlink, 
  Search,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface AssociationEditorProps {
  searchTerm: string;
}

interface ClienteAssociation {
  clienteId: string;
  clienteNome: string;
  clienteEmail: string;
  profissionalId: string | null;
  profissionalNome: string | null;
  dashboard: 'cliente' | 'profissional' | null;
  status: 'correto' | 'erro' | 'pendente';
}

interface ProfissionalData {
  id: string;
  nome: string;
  email: string;
  empresa: string;
}

const AssociationEditor = ({ searchTerm }: AssociationEditorProps) => {
  const [selectedAssociation, setSelectedAssociation] = useState<string | null>(null);
  const [searchProfissional, setSearchProfissional] = useState('');

  // Mock data - em produção viria da API
  const [associations, setAssociations] = useState<ClienteAssociation[]>([
    {
      clienteId: '1',
      clienteNome: 'João Silva',
      clienteEmail: 'joao@example.com',
      profissionalId: 'prof1',
      profissionalNome: 'Maria Santos',
      dashboard: 'cliente',
      status: 'correto'
    },
    {
      clienteId: '2',
      clienteNome: 'Ana Costa',
      clienteEmail: 'ana@example.com',
      profissionalId: null,
      profissionalNome: null,
      dashboard: null,
      status: 'pendente'
    },
    {
      clienteId: '3',
      clienteNome: 'Carlos Lima',
      clienteEmail: 'carlos@example.com',
      profissionalId: 'prof2',
      profissionalNome: 'José Oliveira',
      dashboard: 'profissional',
      status: 'erro'
    }
  ]);

  const [profissionais, setProfissionais] = useState<ProfissionalData[]>([
    { id: 'prof1', nome: 'Maria Santos', email: 'maria@salon.com', empresa: 'Salão Maria' },
    { id: 'prof2', nome: 'José Oliveira', email: 'jose@barbershop.com', empresa: 'Barbearia José' },
    { id: 'prof3', nome: 'Ana Paula', email: 'ana@beauty.com', empresa: 'Beauty Ana' }
  ]);

  const associateClient = (clienteId: string, profissionalId: string, dashboard: 'cliente' | 'profissional') => {
    setAssociations(prev => prev.map(assoc => 
      assoc.clienteId === clienteId 
        ? { 
            ...assoc, 
            profissionalId, 
            profissionalNome: profissionais.find(p => p.id === profissionalId)?.nome || null,
            dashboard,
            status: 'correto' 
          }
        : assoc
    ));
    console.log('Associando cliente:', clienteId, 'ao profissional:', profissionalId, 'dashboard:', dashboard);
  };

  const removeAssociation = (clienteId: string) => {
    setAssociations(prev => prev.map(assoc => 
      assoc.clienteId === clienteId 
        ? { 
            ...assoc, 
            profissionalId: null, 
            profissionalNome: null,
            dashboard: null,
            status: 'pendente' 
          }
        : assoc
    ));
    console.log('Removendo associação do cliente:', clienteId);
  };

  const fixAllAssociations = () => {
    // Lógica para corrigir automaticamente associações incorretas
    console.log('Corrigindo todas as associações incorretas...');
  };

  const filteredAssociations = associations.filter(assoc =>
    assoc.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assoc.clienteEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (assoc.profissionalNome && assoc.profissionalNome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProfissionais = profissionais.filter(prof =>
    prof.nome.toLowerCase().includes(searchProfissional.toLowerCase()) ||
    prof.email.toLowerCase().includes(searchProfissional.toLowerCase()) ||
    prof.empresa.toLowerCase().includes(searchProfissional.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'correto': return 'text-green-500';
      case 'erro': return 'text-red-500';
      case 'pendente': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'correto': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'erro': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pendente': return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <div className="h-full bg-gray-900">
      <div className="flex h-full">
        {/* Lista de Associações */}
        <div className="w-1/2 bg-gray-800 border-r border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Associações Cliente-Profissional</h3>
              <Button size="sm" onClick={fixAllAssociations} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="h-4 w-4 mr-1" />
                Corrigir Tudo
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar associações..."
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100%-100px)]">
            <div className="p-2">
              {filteredAssociations.map((assoc) => (
                <Card
                  key={assoc.clienteId}
                  className={`mb-3 cursor-pointer transition-colors ${
                    selectedAssociation === assoc.clienteId ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedAssociation(assoc.clienteId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-white text-sm">{assoc.clienteNome}</h4>
                        <p className="text-xs text-gray-300">{assoc.clienteEmail}</p>
                      </div>
                      {getStatusIcon(assoc.status)}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-400">
                      <span>Cliente</span>
                      <ArrowRight className="h-3 w-3 mx-2" />
                      <span className={getStatusColor(assoc.status)}>
                        {assoc.profissionalNome || 'Não associado'}
                      </span>
                    </div>
                    
                    {assoc.dashboard && (
                      <div className="mt-2 text-xs">
                        <span className="bg-blue-600 px-2 py-1 rounded text-white">
                          Dashboard: {assoc.dashboard}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Editor de Associação */}
        <div className="flex-1">
          {selectedAssociation ? (
            <div className="p-6">
              {(() => {
                const assoc = associations.find(a => a.clienteId === selectedAssociation);
                if (!assoc) return null;

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white">Editar Associação</h2>
                      <Button onClick={() => removeAssociation(assoc.clienteId)} variant="outline">
                        <Unlink className="h-4 w-4 mr-2" />
                        Remover Associação
                      </Button>
                    </div>

                    {/* Informações do Cliente */}
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Cliente
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-white"><strong>Nome:</strong> {assoc.clienteNome}</p>
                          <p className="text-gray-300"><strong>Email:</strong> {assoc.clienteEmail}</p>
                          <p className="text-gray-300">
                            <strong>Status:</strong> 
                            <span className={`ml-2 ${getStatusColor(assoc.status)}`}>
                              {assoc.status}
                            </span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Associação Atual */}
                    {assoc.profissionalId && (
                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center">
                            <Link className="h-5 w-5 mr-2" />
                            Associação Atual
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-white"><strong>Profissional:</strong> {assoc.profissionalNome}</p>
                            <p className="text-gray-300"><strong>Dashboard:</strong> {assoc.dashboard}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Buscar e Associar Profissional */}
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <UserCheck className="h-5 w-5 mr-2" />
                          Associar a Profissional
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Buscar profissional..."
                              value={searchProfissional}
                              onChange={(e) => setSearchProfissional(e.target.value)}
                              className="pl-10 bg-gray-700 border-gray-600 text-white"
                            />
                          </div>

                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {filteredProfissionais.map((prof) => (
                              <div
                                key={prof.id}
                                className="p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer"
                                onClick={() => {
                                  const dashboard = window.confirm('Este cliente deve aparecer no dashboard do cliente (OK) ou profissional (Cancelar)?') 
                                    ? 'cliente' : 'profissional';
                                  associateClient(assoc.clienteId, prof.id, dashboard);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white font-medium">{prof.nome}</p>
                                    <p className="text-gray-300 text-sm">{prof.email}</p>
                                    <p className="text-gray-400 text-xs">{prof.empresa}</p>
                                  </div>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                    <Link className="h-4 w-4 mr-1" />
                                    Associar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-lg mb-2">Selecione uma associação</p>
                <p className="text-sm">Escolha uma associação à esquerda para editar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssociationEditor;
