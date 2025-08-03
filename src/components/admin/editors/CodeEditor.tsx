
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  File, 
  Folder, 
  FolderOpen, 
  Save, 
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Code2
} from 'lucide-react';

interface CodeEditorProps {
  searchTerm: string;
  filterCategory: string;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileItem[];
}

const CodeEditor = ({ searchTerm, filterCategory }: CodeEditorProps) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [fileTree, setFileTree] = useState<FileItem[]>([]);
  const [isModified, setIsModified] = useState(false);

  // Estrutura simulada do projeto (em produção viria de uma API)
  const projectStructure: FileItem[] = [
    {
      name: 'src',
      path: 'src',
      type: 'folder',
      children: [
        {
          name: 'components',
          path: 'src/components',
          type: 'folder',
          children: [
            { name: 'AuthGuard.tsx', path: 'src/components/AuthGuard.tsx', type: 'file' },
            { name: 'ui', path: 'src/components/ui', type: 'folder', children: [
              { name: 'button.tsx', path: 'src/components/ui/button.tsx', type: 'file' },
              { name: 'input.tsx', path: 'src/components/ui/input.tsx', type: 'file' }
            ]},
            { name: 'client', path: 'src/components/client', type: 'folder', children: [
              { name: 'ClientAuth.tsx', path: 'src/components/client/ClientAuth.tsx', type: 'file' },
              { name: 'ClientDashboard.tsx', path: 'src/components/client/ClientDashboard.tsx', type: 'file' }
            ]},
            { name: 'dashboard', path: 'src/components/dashboard', type: 'folder', children: [
              { name: 'DashboardHeader.tsx', path: 'src/components/dashboard/DashboardHeader.tsx', type: 'file' },
              { name: 'DashboardContent.tsx', path: 'src/components/dashboard/DashboardContent.tsx', type: 'file' }
            ]}
          ]
        },
        {
          name: 'pages',
          path: 'src/pages',
          type: 'folder',
          children: [
            { name: 'AdminDashboard.tsx', path: 'src/pages/AdminDashboard.tsx', type: 'file' },
            { name: 'Dashboard.tsx', path: 'src/pages/Dashboard.tsx', type: 'file' },
            { name: 'ClientDashboardPage.tsx', path: 'src/pages/ClientDashboardPage.tsx', type: 'file' }
          ]
        },
        {
          name: 'hooks',
          path: 'src/hooks',
          type: 'folder',
          children: [
            { name: 'useAuth.tsx', path: 'src/hooks/useAuth.tsx', type: 'file' },
            { name: 'useClientOnlyAuth.tsx', path: 'src/hooks/useClientOnlyAuth.tsx', type: 'file' },
            { name: 'useBusinessData.tsx', path: 'src/hooks/useBusinessData.tsx', type: 'file' }
          ]
        }
      ]
    }
  ];

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const selectFile = async (filePath: string) => {
    setSelectedFile(filePath);
    // Em produção, aqui faria uma requisição para buscar o conteúdo do arquivo
    setFileContent(`// Conteúdo do arquivo: ${filePath}\n// Aqui estaria o código real do arquivo`);
    setIsModified(false);
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    
    // Em produção, aqui faria uma requisição para salvar o arquivo
    console.log('Salvando arquivo:', selectedFile, fileContent);
    setIsModified(false);
  };

  const handleContentChange = (content: string) => {
    setFileContent(content);
    setIsModified(true);
  };

  const filterFiles = (items: FileItem[]): FileItem[] => {
    return items.filter(item => {
      if (filterCategory !== 'all') {
        if (filterCategory === 'components' && !item.path.includes('/components/')) return false;
        if (filterCategory === 'pages' && !item.path.includes('/pages/')) return false;
        if (filterCategory === 'hooks' && !item.path.includes('/hooks/')) return false;
        if (filterCategory === 'auth' && !item.path.toLowerCase().includes('auth')) return false;
      }
      
      if (searchTerm) {
        return item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (item.children && item.children.some(child => 
                 child.name.toLowerCase().includes(searchTerm.toLowerCase())
               ));
      }
      
      return true;
    }).map(item => ({
      ...item,
      children: item.children ? filterFiles(item.children) : undefined
    }));
  };

  const renderFileTree = (items: FileItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.path}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer ${
            selectedFile === item.path ? 'bg-red-500 text-white' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.path);
            } else {
              selectFile(item.path);
            }
          }}
        >
          {item.type === 'folder' ? (
            <>
              {expandedFolders.has(item.path) ? (
                <ChevronDown className="h-4 w-4 mr-1" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1" />
              )}
              {expandedFolders.has(item.path) ? (
                <FolderOpen className="h-4 w-4 mr-2 text-yellow-500" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-yellow-600" />
              )}
            </>
          ) : (
            <File className="h-4 w-4 mr-2 ml-5 text-blue-400" />
          )}
          <span className="text-sm">{item.name}</span>
          {item.type === 'file' && item.path === selectedFile && isModified && (
            <span className="ml-auto text-orange-400 text-xs">●</span>
          )}
        </div>
        {item.type === 'folder' && expandedFolders.has(item.path) && item.children && (
          <div>
            {renderFileTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const filteredFileTree = filterFiles(projectStructure);

  return (
    <div className="flex h-full">
      {/* File Tree */}
      <div className="w-1/3 bg-gray-800 border-r border-gray-700">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Arquivos do Projeto</h3>
          <Input
            placeholder="Buscar arquivos..."
            className="bg-gray-700 border-gray-600 text-white text-sm"
          />
        </div>
        <ScrollArea className="h-[calc(100%-80px)]">
          <div className="p-2">
            {renderFileTree(filteredFileTree)}
          </div>
        </ScrollArea>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            {/* Editor Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
              <div className="flex items-center">
                <Code2 className="h-4 w-4 mr-2 text-blue-400" />
                <span className="text-sm font-medium">{selectedFile}</span>
                {isModified && <span className="ml-2 text-orange-400 text-xs">● Modificado</span>}
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" disabled={!isModified}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reverter
                </Button>
                <Button size="sm" onClick={saveFile} disabled={!isModified} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 p-4">
              <textarea
                value={fileContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-full bg-gray-900 text-white font-mono text-sm p-4 rounded border border-gray-600 resize-none focus:outline-none focus:border-red-500"
                placeholder="Edite o código aqui..."
                spellCheck={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Code2 className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p className="text-lg mb-2">Selecione um arquivo para editar</p>
              <p className="text-sm">Escolha um arquivo na árvore à esquerda para começar a editar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
