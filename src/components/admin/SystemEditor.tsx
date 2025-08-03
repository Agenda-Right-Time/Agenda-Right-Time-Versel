
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Code, 
  Database, 
  Palette, 
  UserCheck,
  Search,
  Filter,
  Save,
  Eye
} from 'lucide-react';
import CodeEditor from './editors/CodeEditor';
import AuthEditor from './editors/AuthEditor';
import SqlEditor from './editors/SqlEditor';
import StyleEditor from './editors/StyleEditor';

const SystemEditor = () => {
  const [activeTab, setActiveTab] = useState('code');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  return (
    <div className="h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-400">Editor Completo do Sistema</h2>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" className="border-green-500 text-green-500">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Salvar Tudo
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar arquivos, funções, componentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white rounded px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="components">Componentes</option>
              <option value="pages">Páginas</option>
              <option value="hooks">Hooks</option>
              <option value="auth">Autenticação</option>
              <option value="styles">Estilos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="bg-gray-800 border-b border-gray-700 w-full justify-start rounded-none">
          <TabsTrigger value="code" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
            <Code className="h-4 w-4 mr-2" />
            Editor de Código
          </TabsTrigger>
          <TabsTrigger value="auth" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
            <UserCheck className="h-4 w-4 mr-2" />
            Autenticações & Associações
          </TabsTrigger>
          <TabsTrigger value="sql" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
            <Database className="h-4 w-4 mr-2" />
            SQL Editor
          </TabsTrigger>
          <TabsTrigger value="styles" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
            <Palette className="h-4 w-4 mr-2" />
            Estilos/CSS
          </TabsTrigger>
        </TabsList>

        <div className="h-[calc(100vh-180px)]">
          <TabsContent value="code" className="h-full m-0">
            <CodeEditor searchTerm={searchTerm} filterCategory={filterCategory} />
          </TabsContent>

          <TabsContent value="auth" className="h-full m-0">
            <AuthEditor searchTerm={searchTerm} />
          </TabsContent>

          <TabsContent value="sql" className="h-full m-0">
            <SqlEditor />
          </TabsContent>

          <TabsContent value="styles" className="h-full m-0">
            <StyleEditor searchTerm={searchTerm} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SystemEditor;
