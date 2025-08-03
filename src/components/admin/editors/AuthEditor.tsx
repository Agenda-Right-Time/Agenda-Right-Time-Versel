
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Settings, 
  Route, 
  Key,
  UserCheck,
  UserX,
  Edit3,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Link,
  Code2,
  UserPlus
} from 'lucide-react';

interface AuthEditorProps {
  searchTerm: string;
}

interface AuthFlow {
  id: string;
  name: string;
  type: 'login' | 'signup' | 'reset';
  redirectTo: string;
  userType: 'cliente' | 'profissional' | 'admin';
  enabled: boolean;
  pageFile: string;
  associatedUsers: string[];
  dashboardType: 'cliente' | 'profissional' | 'both';
}

interface UserData {
  id: string;
  email: string;
  name: string;
  type: 'cliente' | 'profissional' | 'admin';
  status: 'active' | 'inactive' | 'blocked';
  lastLogin: string;
}

const AuthEditor = ({ searchTerm }: AuthEditorProps) => {
  const [activeAuthTab, setActiveAuthTab] = useState('flows');
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [pageEditorOpen, setPageEditorOpen] = useState(false);

  // Mock data - em produção viria da API
  const [authFlows, setAuthFlows] = useState<AuthFlow[]>([
    {
      id: '1',
      name: 'Login Cliente',
      type: 'login',
      redirectTo: '/cliente-dashboard',
      userType: 'cliente',
      enabled: true,
      pageFile: 'src/components/client/ClientAuth.tsx',
      associatedUsers: ['cliente1', 'cliente2'],
      dashboardType: 'cliente'
    },
    {
      id: '2',
      name: 'Login Profissional',
      type: 'login',
      redirectTo: '/dashboard',
      userType: 'profissional',
      enabled: true,
      pageFile: 'src/pages/LoginPage.tsx',
      associatedUsers: ['prof1', 'prof2'],
      dashboardType: 'profissional'
    },
    {
      id: '3',
      name: 'Cadastro Cliente',
      type: 'signup',
      redirectTo: '/agendamento',
      userType: 'cliente',
      enabled: true,
      pageFile: 'src/components/client/ClientAuth.tsx',
      associatedUsers: [],
      dashboardType: 'cliente'
    },
    {
      id: '4',
      name: 'Cadastro Profissional',
      type: 'signup',
      redirectTo: '/dashboard',
      userType: 'profissional',
      enabled: true,
      pageFile: 'src/pages/LoginPage.tsx',
      associatedUsers: [],
      dashboardType: 'profissional'
    }
  ]);

  const [users, setUsers] = useState<UserData[]>([
    {
      id: '1',
      email: 'cliente@example.com',
      name: 'Cliente Teste',
      type: 'cliente',
      status: 'active',
      lastLogin: '2024-06-16 10:30'
    },
    {
      id: '2',
      email: 'profissional@example.com',
      name: 'Profissional Teste',
      type: 'profissional',
      status: 'active',
      lastLogin: '2024-06-16 09:15'
    }
  ]);

  const [availableUsers, setAvailableUsers] = useState([
    { id: 'cliente1', name: 'João Silva', email: 'joao@example.com', type: 'cliente' },
    { id: 'cliente2', name: 'Maria Santos', email: 'maria@example.com', type: 'cliente' },
    { id: 'prof1', name: 'Dr. Carlos', email: 'carlos@clinic.com', type: 'profissional' },
    { id: 'prof2', name: 'Dra. Ana', email: 'ana@clinic.com', type: 'profissional' }
  ]);

  const saveAuthFlow = (flow: AuthFlow) => {
    setAuthFlows(prev => prev.map(f => f.id === flow.id ? flow : f));
    console.log('Salvando fluxo de autenticação:', flow);
  };

  const deleteAuthFlow = (id: string) => {
    setAuthFlows(prev => prev.filter(f => f.id !== id));
  };

  const addNewFlow = () => {
    const newFlow: AuthFlow = {
      id: Date.now().toString(),
      name: 'Novo Fluxo',
      type: 'login',
      redirectTo: '/',
      userType: 'cliente',
      enabled: true,
      pageFile: 'src/pages/LoginPage.tsx',
      associatedUsers: [],
      dashboardType: 'cliente'
    };
    setAuthFlows(prev => [...prev, newFlow]);
    setSelectedFlow(newFlow.id);
  };

  const updateUserStatus = (userId: string, status: UserData['status']) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    console.log('Atualizando status do usuário:', userId, status);
  };

  const resetUserPassword = (userId: string) => {
    console.log('Resetando senha do usuário:', userId);
  };

  const associateUserToFlow = (flowId: string, userId: string) => {
    setAuthFlows(prev => prev.map(flow => 
      flow.id === flowId 
        ? { ...flow, associatedUsers: [...flow.associatedUsers.filter(id => id !== userId), userId] }
        : flow
    ));
  };

  const removeUserFromFlow = (flowId: string, userId: string) => {
    setAuthFlows(prev => prev.map(flow => 
      flow.id === flowId 
        ? { ...flow, associatedUsers: flow.associatedUsers.filter(id => id !== userId) }
        : flow
    ));
  };

  const filteredFlows = authFlows.filter(flow =>
    flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flow.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flow.userType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-gray-900">
      <Tabs value={activeAuthTab} onValueChange={setActiveAuthTab} className="h-full">
        <TabsList className="bg-gray-800 w-full justify-start rounded-none border-b border-gray-700">
          <TabsTrigger value="flows" className="data-[state=active]:bg-red-500">
            <Route className="h-4 w-4 mr-2" />
            Fluxos & Associações
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-red-500">
            <Users className="h-4 w-4 mr-2" />
            Gerenciar Usuários
          </TabsTrigger>
          <TabsTrigger value="routes" className="data-[state=active]:bg-red-500">
            <Settings className="h-4 w-4 mr-2" />
            Rotas Protegidas
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-red-500">
            <Key className="h-4 w-4 mr-2" />
            Permissões
          </TabsTrigger>
        </TabsList>

        <div className="h-[calc(100%-50px)]">
          <TabsContent value="flows" className="h-full m-0">
            <div className="flex h-full">
              {/* Lista de Fluxos */}
              <div className="w-1/3 bg-gray-800 border-r border-gray-700">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">Fluxos de Autenticação</h3>
                    <Button size="sm" onClick={addNewFlow} className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Novo
                    </Button>
                  </div>
                  <Input
                    placeholder="Buscar fluxos..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <ScrollArea className="h-[calc(100%-100px)]">
                  <div className="p-2">
                    {filteredFlows.map((flow) => (
                      <Card
                        key={flow.id}
                        className={`mb-2 cursor-pointer transition-colors ${
                          selectedFlow === flow.id ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        onClick={() => setSelectedFlow(flow.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-white text-sm">{flow.name}</h4>
                              <p className="text-xs text-gray-300">{flow.type} → {flow.userType}</p>
                              <p className="text-xs text-gray-400">{flow.associatedUsers.length} usuários associados</p>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${flow.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Editor do Fluxo */}
              <div className="flex-1">
                {selectedFlow ? (
                  <div className="p-6">
                    {(() => {
                      const flow = authFlows.find(f => f.id === selectedFlow);
                      if (!flow) return null;

                      return (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Editar Fluxo: {flow.name}</h2>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => deleteAuthFlow(flow.id)}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Deletar
                              </Button>
                              <Button size="sm" onClick={() => saveAuthFlow(flow)} className="bg-green-600 hover:bg-green-700">
                                <Save className="h-4 w-4 mr-1" />
                                Salvar
                              </Button>
                            </div>
                          </div>

                          {/* Configurações Básicas */}
                          <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                              <CardTitle className="text-white">Configurações do Fluxo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Fluxo</label>
                                  <Input
                                    value={flow.name}
                                    onChange={(e) => {
                                      const updatedFlow = { ...flow, name: e.target.value };
                                      setAuthFlows(prev => prev.map(f => f.id === flow.id ? updatedFlow : f));
                                    }}
                                    className="bg-gray-700 border-gray-600 text-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Autenticação</label>
                                  <select
                                    value={flow.type}
                                    onChange={(e) => {
                                      const updatedFlow = { ...flow, type: e.target.value as AuthFlow['type'] };
                                      setAuthFlows(prev => prev.map(f => f.id === flow.id ? updatedFlow : f));
                                    }}
                                    className="w-full bg-gray-700 border-gray-600 text-white rounded px-3 py-2"
                                  >
                                    <option value="login">Login</option>
                                    <option value="signup">Cadastro</option>
                                    <option value="reset">Reset de Senha</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Usuário</label>
                                  <select
                                    value={flow.userType}
                                    onChange={(e) => {
                                      const updatedFlow = { ...flow, userType: e.target.value as AuthFlow['userType'] };
                                      setAuthFlows(prev => prev.map(f => f.id === flow.id ? updatedFlow : f));
                                    }}
                                    className="w-full bg-gray-700 border-gray-600 text-white rounded px-3 py-2"
                                  >
                                    <option value="cliente">Cliente</option>
                                    <option value="profissional">Profissional</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">Dashboard de Destino</label>
                                  <select
                                    value={flow.dashboardType}
                                    onChange={(e) => {
                                      const updatedFlow = { ...flow, dashboardType: e.target.value as AuthFlow['dashboardType'] };
                                      setAuthFlows(prev => prev.map(f => f.id === flow.id ? updatedFlow : f));
                                    }}
                                    className="w-full bg-gray-700 border-gray-600 text-white rounded px-3 py-2"
                                  >
                                    <option value="cliente">Dashboard Cliente</option>
                                    <option value="profissional">Dashboard Profissional</option>
                                    <option value="both">Ambos</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Rota de Redirecionamento</label>
                                <Input
                                  value={flow.redirectTo}
                                  onChange={(e) => {
                                    const updatedFlow = { ...flow, redirectTo: e.target.value };
                                    setAuthFlows(prev => prev.map(f => f.id === flow.id ? updatedFlow : f));
                                  }}
                                  className="bg-gray-700 border-gray-600 text-white"
                                  placeholder="/dashboard"
                                />
                              </div>

                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={flow.enabled}
                                  onChange={(e) => {
                                    const updatedFlow = { ...flow, enabled: e.target.checked };
                                    setAuthFlows(prev => prev.map(f => f.id === flow.id ? updatedFlow : f));
                                  }}
                                  className="mr-2"
                                />
                                <label className="text-sm text-gray-300">Fluxo Ativo</label>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Editor da Página */}
                          <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                              <CardTitle className="text-white flex items-center justify-between">
                                <span>Página de Autenticação</span>
                                <Button size="sm" onClick={() => setPageEditorOpen(!pageEditorOpen)}>
                                  <Code2 className="h-4 w-4 mr-1" />
                                  {pageEditorOpen ? 'Fechar Editor' : 'Editar Página'}
                                </Button>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Arquivo da Página</label>
                                <Input
                                  value={flow.pageFile}
                                  onChange={(e) => {
                                    const updatedFlow = { ...flow, pageFile: e.target.value };
                                    setAuthFlows(prev => prev.map(f => f.id === flow.id ? updatedFlow : f));
                                  }}
                                  className="bg-gray-700 border-gray-600 text-white"
                                  placeholder="src/pages/LoginPage.tsx"
                                />
                              </div>

                              {pageEditorOpen && (
                                <div className="border border-gray-600 rounded">
                                  <div className="bg-gray-700 px-3 py-2 border-b border-gray-600">
                                    <span className="text-sm font-medium text-gray-300">Editor: {flow.pageFile}</span>
                                  </div>
                                  <textarea
                                    className="w-full h-64 bg-gray-900 text-white font-mono text-sm p-4 resize-none focus:outline-none"
                                    placeholder={`// Código da página ${flow.pageFile}
import React, { useState } from 'react';

const AuthPage = () => {
  return (
    <div>
      <h1>${flow.name}</h1>
      {/* Componente de ${flow.type} para ${flow.userType} */}
    </div>
  );
};

export default AuthPage;`}
                                  />
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Associações de Usuários */}
                          <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                              <CardTitle className="text-white flex items-center">
                                <Link className="h-5 w-5 mr-2" />
                                Usuários Associados a este Fluxo
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-300 mb-2">Usuários Disponíveis</h4>
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {availableUsers
                                      .filter(user => user.type === flow.userType && !flow.associatedUsers.includes(user.id))
                                      .map(user => (
                                        <div key={user.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                                          <div>
                                            <p className="text-white text-sm">{user.name}</p>
                                            <p className="text-gray-400 text-xs">{user.email}</p>
                                          </div>
                                          <Button 
                                            size="sm" 
                                            onClick={() => associateUserToFlow(flow.id, user.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-sm font-medium text-gray-300 mb-2">Usuários Associados</h4>
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {flow.associatedUsers.map(userId => {
                                      const user = availableUsers.find(u => u.id === userId);
                                      if (!user) return null;
                                      return (
                                        <div key={userId} className="flex items-center justify-between p-2 bg-red-500/20 rounded">
                                          <div>
                                            <p className="text-white text-sm">{user.name}</p>
                                            <p className="text-gray-400 text-xs">{user.email}</p>
                                          </div>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => removeUserFromFlow(flow.id, userId)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
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
                      <Route className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                      <p className="text-lg mb-2">Selecione um fluxo de autenticação</p>
                      <p className="text-sm">Escolha um fluxo à esquerda para editar</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="h-full m-0 p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Gerenciar Usuários</h2>
                <div className="flex space-x-2">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Profissional
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            user.status === 'active' ? 'bg-green-500' : 
                            user.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <h3 className="font-medium text-white">{user.name}</h3>
                            <p className="text-sm text-gray-400">{user.email}</p>
                            <p className="text-xs text-gray-500">Tipo: {user.type} | Último login: {user.lastLogin}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => resetUserPassword(user.id)}>
                            <Key className="h-4 w-4 mr-1" />
                            Reset Senha
                          </Button>
                          {user.status === 'active' ? (
                            <Button size="sm" variant="outline" onClick={() => updateUserStatus(user.id, 'blocked')}>
                              <UserX className="h-4 w-4 mr-1" />
                              Bloquear
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => updateUserStatus(user.id, 'active')} className="bg-green-600 hover:bg-green-700">
                              <UserCheck className="h-4 w-4 mr-1" />
                              Ativar
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="routes" className="h-full m-0 p-6">
            <div className="text-white">
              <h2 className="text-xl font-bold mb-4">Rotas Protegidas</h2>
              <p className="text-gray-400">Configuração de rotas protegidas em desenvolvimento...</p>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="h-full m-0 p-6">
            <div className="text-white">
              <h2 className="text-xl font-bold mb-4">Permissões</h2>
              <p className="text-gray-400">Sistema de permissões em desenvolvimento...</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AuthEditor;
