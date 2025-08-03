
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Download,
  Upload,
  Pipette,
  Type,
  Layout
} from 'lucide-react';

interface StyleEditorProps {
  searchTerm: string;
}

const StyleEditor = ({ searchTerm }: StyleEditorProps) => {
  const [cssContent, setCssContent] = useState(
    `/* Estilos Personalizados do Sistema */
    
/* Cores principais */
:root {
  --primary-color: #dc2626;
  --secondary-color: #fbbf24;
  --background-dark: #111827;
  --surface-dark: #1f2937;
}

/* Dashboard */
.dashboard-header {
  background: linear-gradient(135deg, var(--primary-color), #ef4444);
}

/* Botões */
.btn-primary {
  background: var(--primary-color);
  color: white;
  border-radius: 8px;
  padding: 12px 24px;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: #b91c1c;
  transform: translateY(-2px);
}

/* Cards */
.card-custom {
  background: var(--surface-dark);
  border: 1px solid #374151;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

/* Animações */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.5s ease-out;
}`
  );

  const [previewMode, setPreviewMode] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState('global');
  const [customColors, setCustomColors] = useState({
    primary: '#dc2626',
    secondary: '#fbbf24',
    accent: '#3b82f6',
    background: '#111827',
    surface: '#1f2937'
  });

  const components = [
    { id: 'global', name: 'Estilos Globais', description: 'Variáveis CSS e estilos base' },
    { id: 'dashboard', name: 'Dashboard', description: 'Estilos do painel administrativo' },
    { id: 'client', name: 'Cliente', description: 'Área do cliente e agendamentos' },
    { id: 'auth', name: 'Autenticação', description: 'Páginas de login e cadastro' },
    { id: 'components', name: 'Componentes', description: 'Botões, cards, modais' }
  ];

  const colorSchemes = [
    { name: 'Vermelho (Atual)', primary: '#dc2626', secondary: '#fbbf24' },
    { name: 'Azul Profissional', primary: '#1e40af', secondary: '#0ea5e9' },
    { name: 'Verde Natureza', primary: '#059669', secondary: '#10b981' },
    { name: 'Roxo Elegante', primary: '#7c3aed', secondary: '#a855f7' },
    { name: 'Rosa Moderno', primary: '#e11d48', secondary: '#f43f5e' }
  ];

  const applyStyles = () => {
    // Em produção, aqui aplicaria os estilos no sistema
    console.log('Aplicando estilos:', cssContent);
    
    // Criar um elemento style temporário para preview
    const existingStyle = document.getElementById('custom-preview-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'custom-preview-styles';
    styleElement.textContent = cssContent;
    document.head.appendChild(styleElement);
  };

  const removePreviewStyles = () => {
    const existingStyle = document.getElementById('custom-preview-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
  };

  const exportStyles = () => {
    const blob = new Blob([cssContent], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-styles.css';
    a.click();
  };

  const applyColorScheme = (scheme: typeof colorSchemes[0]) => {
    const newCss = cssContent.replace(
      /--primary-color: #[a-fA-F0-9]{6};/,
      `--primary-color: ${scheme.primary};`
    ).replace(
      /--secondary-color: #[a-fA-F0-9]{6};/,
      `--secondary-color: ${scheme.secondary};`
    );
    setCssContent(newCss);
    setCustomColors(prev => ({ ...prev, primary: scheme.primary, secondary: scheme.secondary }));
  };

  const togglePreview = () => {
    if (previewMode) {
      removePreviewStyles();
    } else {
      applyStyles();
    }
    setPreviewMode(!previewMode);
  };

  return (
    <div className="h-full bg-gray-900">
      <div className="flex h-full">
        {/* Sidebar com Componentes */}
        <div className="w-1/4 bg-gray-800 border-r border-gray-700">
          <Tabs defaultValue="components" className="h-full">
            <TabsList className="bg-gray-700 w-full justify-start rounded-none">
              <TabsTrigger value="components" className="data-[state=active]:bg-red-500">
                <Layout className="h-4 w-4 mr-2" />
                Componentes
              </TabsTrigger>
              <TabsTrigger value="colors" className="data-[state=active]:bg-red-500">
                <Pipette className="h-4 w-4 mr-2" />
                Cores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="components" className="h-[calc(100%-50px)] m-0">
              <div className="p-3 border-b border-gray-700">
                <h3 className="font-semibold text-white text-sm">Componentes</h3>
              </div>
              <ScrollArea className="h-[calc(100%-50px)]">
                <div className="p-2">
                  {components
                    .filter(comp => 
                      comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      comp.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((component) => (
                      <Card
                        key={component.id}
                        className={`mb-2 cursor-pointer transition-colors ${
                          selectedComponent === component.id ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        onClick={() => setSelectedComponent(component.id)}
                      >
                        <CardContent className="p-3">
                          <h4 className="font-medium text-white text-sm">{component.name}</h4>
                          <p className="text-xs text-gray-300 mt-1">{component.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="colors" className="h-[calc(100%-50px)] m-0">
              <div className="p-3 border-b border-gray-700">
                <h3 className="font-semibold text-white text-sm">Paleta de Cores</h3>
              </div>
              <ScrollArea className="h-[calc(100%-50px)]">
                <div className="p-3 space-y-4">
                  {/* Cores Personalizadas */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Cores Principais</h4>
                    <div className="space-y-3">
                      {Object.entries(customColors).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <div
                            className="w-6 h-6 rounded border border-gray-600"
                            style={{ backgroundColor: value }}
                          />
                          <Input
                            type="color"
                            value={value}
                            onChange={(e) => setCustomColors(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-12 h-8 p-0 border-0 bg-transparent"
                          />
                          <span className="text-xs text-gray-400 capitalize">{key}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Esquemas Predefinidos */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Esquemas Predefinidos</h4>
                    <div className="space-y-2">
                      {colorSchemes.map((scheme, index) => (
                        <div
                          key={index}
                          className="p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                          onClick={() => applyColorScheme(scheme)}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: scheme.primary }}
                            />
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: scheme.secondary }}
                            />
                          </div>
                          <p className="text-xs text-gray-300">{scheme.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
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
              <Button onClick={togglePreview} className={previewMode ? 'bg-green-600' : 'bg-blue-600'}>
                {previewMode ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Parar Preview
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
              <Button onClick={applyStyles} className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                Aplicar Estilos
              </Button>
              <Button variant="outline" onClick={exportStyles}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSS
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">
                Editando: {components.find(c => c.id === selectedComponent)?.name || 'Global'}
              </span>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Resetar
              </Button>
            </div>
          </div>

          {/* CSS Editor */}
          <div className="flex-1 p-4">
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Editor CSS - {components.find(c => c.id === selectedComponent)?.name}
                </h3>
                <p className="text-sm text-gray-400">
                  {components.find(c => c.id === selectedComponent)?.description}
                </p>
              </div>

              <div className="flex-1">
                <textarea
                  value={cssContent}
                  onChange={(e) => setCssContent(e.target.value)}
                  className="w-full h-full bg-gray-900 text-white font-mono text-sm p-4 rounded border border-gray-600 resize-none focus:outline-none focus:border-red-500"
                  placeholder="Digite seu CSS aqui..."
                  spellCheck={false}
                />
              </div>

              {previewMode && (
                <div className="mt-4 p-3 bg-green-900 border border-green-700 rounded">
                  <div className="flex items-center text-green-400">
                    <Eye className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Modo Preview Ativo</span>
                  </div>
                  <p className="text-xs text-green-300 mt-1">
                    Os estilos estão sendo aplicados em tempo real. Você pode navegar pelo sistema para ver as mudanças.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleEditor;
