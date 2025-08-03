
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Play, 
  Save, 
  History, 
  Table, 
  Eye,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle
} from 'lucide-react';

const SqlEditor = () => {
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([
    'SELECT * FROM profiles WHERE tipo_usuario = \'profissional\';',
    'SELECT * FROM cliente_profiles WHERE profissional_vinculado IS NULL;',
    'SELECT a.*, p.nome FROM agendamentos a JOIN profiles p ON a.user_id = p.id;'
  ]);

  const [tables] = useState([
    { name: 'profiles', type: 'table', columns: ['id', 'nome', 'email', 'empresa', 'tipo_usuario'] },
    { name: 'cliente_profiles', type: 'table', columns: ['id', 'nome', 'email', 'profissional_vinculado'] },
    { name: 'agendamentos', type: 'table', columns: ['id', 'user_id', 'cliente_id', 'data_hora', 'status'] },
    { name: 'assinaturas', type: 'table', columns: ['id', 'user_id', 'status', 'trial_ate'] },
    { name: 'servicos', type: 'table', columns: ['id', 'user_id', 'nome', 'preco', 'duracao'] }
  ]);

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    setIsExecuting(true);
    try {
      // Em produção, aqui faria a requisição real para executar a query
      console.log('Executando query:', sqlQuery);
      
      // Simular resultado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock result baseado no tipo de query
      if (sqlQuery.toLowerCase().includes('select')) {
        setQueryResult([
          { id: '1', nome: 'João Silva', email: 'joao@example.com', tipo: 'cliente' },
          { id: '2', nome: 'Maria Santos', email: 'maria@salon.com', tipo: 'profissional' }
        ]);
      } else {
        setQueryResult([{ message: 'Query executada com sucesso', rows_affected: 1 }]);
      }
      
      // Adicionar à história
      if (!queryHistory.includes(sqlQuery)) {
        setQueryHistory(prev => [sqlQuery, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Erro ao executar query:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const loadTableData = (tableName: string) => {
    setSqlQuery(`SELECT * FROM ${tableName} LIMIT 10;`);
  };

  const loadFromHistory = (query: string) => {
    setSqlQuery(query);
  };

  const clearQuery = () => {
    setSqlQuery('');
    setQueryResult([]);
  };

  const exportResult = () => {
    const csv = queryResult.map(row => Object.values(row).join(',')).join('\n');
    const headers = queryResult.length > 0 ? Object.keys(queryResult[0]).join(',') : '';
    const fullCsv = headers + '\n' + csv;
    
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_result.csv';
    a.click();
  };

  return (
    <div className="h-full bg-gray-900">
      <div className="flex h-full">
        {/* Sidebar com Schema */}
        <div className="w-1/4 bg-gray-800 border-r border-gray-700">
          <Tabs defaultValue="schema" className="h-full">
            <TabsList className="bg-gray-700 w-full justify-start rounded-none">
              <TabsTrigger value="schema" className="data-[state=active]:bg-red-500">
                <Table className="h-4 w-4 mr-2" />
                Schema
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-red-500">
                <History className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schema" className="h-[calc(100%-50px)] m-0">
              <div className="p-3 border-b border-gray-700">
                <h3 className="font-semibold text-white text-sm">Tabelas do Banco</h3>
              </div>
              <ScrollArea className="h-[calc(100%-50px)]">
                <div className="p-2">
                  {tables.map((table) => (
                    <Card key={table.name} className="mb-2 bg-gray-700 border-gray-600">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white text-sm">{table.name}</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadTableData(table.name)}
                            className="h-6 px-2 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {table.columns.map((column) => (
                            <div key={column} className="text-xs text-gray-300 pl-2">
                              • {column}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="history" className="h-[calc(100%-50px)] m-0">
              <div className="p-3 border-b border-gray-700">
                <h3 className="font-semibold text-white text-sm">Histórico de Queries</h3>
              </div>
              <ScrollArea className="h-[calc(100%-50px)]">
                <div className="p-2">
                  {queryHistory.map((query, index) => (
                    <div
                      key={index}
                      className="p-2 mb-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => loadFromHistory(query)}
                    >
                      <p className="text-xs text-gray-300 truncate">{query}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Editor Principal */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button 
                onClick={executeQuery} 
                disabled={isExecuting || !sqlQuery.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isExecuting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Executar
              </Button>
              <Button variant="outline" onClick={clearQuery}>
                Limpar
              </Button>
              <Button variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Ctrl+Enter para executar</span>
              {queryResult.length > 0 && (
                <Button size="sm" variant="outline" onClick={exportResult}>
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
              )}
            </div>
          </div>

          {/* SQL Editor */}
          <div className="flex-1 flex flex-col">
            <div className="h-1/2 border-b border-gray-700">
              <div className="h-full p-4">
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Digite sua query SQL aqui..."
                  className="w-full h-full bg-gray-900 text-white font-mono text-sm p-4 rounded border border-gray-600 resize-none focus:outline-none focus:border-red-500"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                      executeQuery();
                    }
                  }}
                />
              </div>
            </div>

            {/* Results */}
            <div className="h-1/2">
              <div className="bg-gray-800 border-b border-gray-700 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Resultado</h3>
                  {queryResult.length > 0 && (
                    <span className="text-sm text-gray-400">{queryResult.length} registros</span>
                  )}
                </div>
              </div>
              
              <ScrollArea className="h-[calc(100%-50px)]">
                <div className="p-4">
                  {queryResult.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700">
                            {Object.keys(queryResult[0]).map((key) => (
                              <th key={key} className="text-left p-2 text-gray-300 font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.map((row, index) => (
                            <tr key={index} className="border-b border-gray-800 hover:bg-gray-800">
                              {Object.values(row).map((value, colIndex) => (
                                <td key={colIndex} className="p-2 text-gray-300">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                        <p className="text-lg mb-2">Execute uma query para ver os resultados</p>
                        <p className="text-sm">Digite uma query SQL e clique em Executar</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SqlEditor;
