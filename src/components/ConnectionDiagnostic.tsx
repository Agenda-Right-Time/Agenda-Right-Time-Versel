
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  details?: any;
}

const ConnectionDiagnostic = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];
    
    // Teste 1: Conexão básica
    diagnostics.push({
      test: 'Conexão básica com Supabase',
      status: 'loading',
      message: 'Testando...'
    });
    setResults([...diagnostics]);
    
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      diagnostics[0] = {
        test: 'Conexão básica com Supabase',
        status: 'success',
        message: 'Conexão estabelecida com sucesso',
        details: { hasSession: !!data.session }
      };
    } catch (error: any) {
      diagnostics[0] = {
        test: 'Conexão básica com Supabase',
        status: 'error',
        message: error.message || 'Erro desconhecido',
        details: error
      };
    }
    
    // Teste 2: Query na database
    diagnostics.push({
      test: 'Query na database',
      status: 'loading',
      message: 'Testando...'
    });
    setResults([...diagnostics]);
    
    try {
      const { data, error } = await supabase
        .from('profissional_profiles')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      diagnostics[1] = {
        test: 'Query na database',
        status: 'success',
        message: 'Query executada com sucesso',
        details: { queryResult: data }
      };
    } catch (error: any) {
      diagnostics[1] = {
        test: 'Query na database',
        status: 'error',
        message: error.message || 'Erro desconhecido',
        details: error
      };
    }
    
    // Teste 3: Teste de função RPC
    diagnostics.push({
      test: 'Função RPC',
      status: 'loading',
      message: 'Testando...'
    });
    setResults([...diagnostics]);
    
    try {
      const { data, error } = await supabase
        .rpc('get_professional_by_slug', { slug: 'test' });
      
      diagnostics[2] = {
        test: 'Função RPC',
        status: 'success',
        message: 'Função RPC executada (resultado pode ser null)',
        details: { result: data }
      };
    } catch (error: any) {
      diagnostics[2] = {
        test: 'Função RPC',
        status: 'error',
        message: error.message || 'Erro desconhecido',
        details: error
      };
    }
    
    // Teste 4: Tentativa de login
    diagnostics.push({
      test: 'Teste de autenticação',
      status: 'loading',
      message: 'Testando...'
    });
    setResults([...diagnostics]);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@test.com',
        password: 'test123'
      });
      
      // Esperamos que falhe, mas não com erro de CORS
      if (error && error.message.includes('CORS')) {
        diagnostics[3] = {
          test: 'Teste de autenticação',
          status: 'error',
          message: 'ERRO DE CORS DETECTADO!',
          details: error
        };
      } else {
        diagnostics[3] = {
          test: 'Teste de autenticação',
          status: 'success',
          message: 'Sem erro de CORS (credenciais inválidas é esperado)',
          details: { errorMessage: error?.message }
        };
      }
    } catch (error: any) {
      diagnostics[3] = {
        test: 'Teste de autenticação',
        status: 'error',
        message: error.message || 'Erro desconhecido',
        details: error
      };
    }
    
    setResults(diagnostics);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'loading':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gold-500 text-2xl">
              🔍 Diagnóstico de Conexão Supabase
            </CardTitle>
            <p className="text-gray-400">
              Domínio atual: {window.location.origin}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="bg-gold-gradient text-black font-semibold"
            >
              {isRunning ? 'Executando...' : 'Executar Diagnóstico'}
            </Button>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-gray-800 p-4 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(result.status)}
                    <h3 className="text-lg font-semibold">{result.test}</h3>
                  </div>
                  
                  <p className={`mb-2 ${
                    result.status === 'error' ? 'text-red-400' : 
                    result.status === 'success' ? 'text-green-400' : 
                    'text-blue-400'
                  }`}>
                    {result.message}
                  </p>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-gray-400 cursor-pointer hover:text-white">
                        Ver detalhes
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-gold-500">
                🔧 Informações do Sistema
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <strong>User Agent:</strong> {navigator.userAgent}
                </div>
                <div>
                  <strong>Cookies Habilitados:</strong> {navigator.cookieEnabled ? 'Sim' : 'Não'}
                </div>
                <div>
                  <strong>Protocol:</strong> {window.location.protocol}
                </div>
                <div>
                  <strong>Host:</strong> {window.location.host}
                </div>
                <div>
                  <strong>LocalStorage:</strong> {typeof Storage !== 'undefined' ? 'Disponível' : 'Não disponível'}
                </div>
                <div>
                  <strong>Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConnectionDiagnostic;
