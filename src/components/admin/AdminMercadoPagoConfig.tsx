
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Key, 
  Save, 
  AlertCircle,
  CheckCircle,
  DollarSign,
  Shield,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Check
} from 'lucide-react';

interface MercadoPagoConfig {
  access_token: string;
  public_key: string;
  webhook_url: string;
  is_test_mode: boolean;
  created_at?: string;
  updated_at?: string;
}

const AdminMercadoPagoConfig = () => {
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [changingAccount, setChangingAccount] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      console.log('Loading Admin Mercado Pago configuration...');
      
      const { data, error } = await supabase
        .from('admin_mercado_pago_config')
        .select('access_token, public_key')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading admin configuration:', error);
        toast.error('Erro ao carregar configuração');
        return;
      }

      if (data) {
        console.log('Admin configuration loaded:', { hasToken: !!data.access_token, hasKey: !!data.public_key });
        setAccessToken(data.access_token || '');
        setPublicKey(data.public_key || '');
        setIsConfigured(!!(data.access_token && data.public_key));
      } else {
        console.log('No admin configuration found');
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Unexpected error loading admin configuration:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const validateAccessToken = (token: string) => {
    const tokenPattern = /^(APP_USR-|TEST-)[a-zA-Z0-9\-_]{20,}$/;
    return tokenPattern.test(token.trim());
  };

  const validatePublicKey = (key: string) => {
    const keyPattern = /^(APP_USR-|TEST-)[a-zA-Z0-9\-_]{20,}$/;
    return keyPattern.test(key.trim());
  };

  const saveConfiguration = async () => {
    if (!accessToken.trim() || !publicKey.trim()) {
      toast.error('Access Token e Public Key são obrigatórios');
      return;
    }

    if (!validateAccessToken(accessToken)) {
      toast.error('Access Token deve ter o formato correto do Mercado Pago');
      return;
    }

    if (!validatePublicKey(publicKey)) {
      toast.error('Public Key deve ter o formato correto do Mercado Pago');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving Admin Mercado Pago configuration...');
      
      const configData = {
        access_token: accessToken.trim(),
        public_key: publicKey.trim(),
        webhook_url: `https://vncehdqqbasjdcszktna.supabase.co/functions/v1/mercado-pago-webhook`,
        is_test_mode: accessToken.startsWith('TEST-'),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('admin_mercado_pago_config')
        .upsert(configData);

      if (error) {
        console.error('Error saving admin configuration:', error);
        toast.error('Erro ao salvar configuração');
        return;
      }

      console.log('Admin configuration saved successfully');
      setIsConfigured(true);
      toast.success('✅ Configuração salva! Esta conta receberá as mensalidades dos profissionais.');
      
    } catch (error) {
      console.error('Error saving admin configuration:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const changeAccount = async () => {
    setChangingAccount(true);
    try {
      console.log('Changing Admin Mercado Pago account...');
      
      // Primeiro, deletar a configuração existente
      const { error: deleteError } = await supabase
        .from('admin_mercado_pago_config')
        .delete()
        .not('id', 'is', null); // Deletar todas as linhas

      if (deleteError) {
        console.error('Error deleting admin configuration:', deleteError);
        throw deleteError;
      }

      setAccessToken('');
      setPublicKey('');
      setIsConfigured(false);

      console.log('Admin account configuration cleared successfully');
      toast.success('✅ Conta removida com sucesso! Configure sua nova conta abaixo.');
    } catch (error) {
      console.error('Error changing admin account:', error);
      toast.error('Erro ao trocar conta');
    } finally {
      setChangingAccount(false);
    }
  };

  const testConfiguration = async () => {
    if (!accessToken.trim()) {
      toast.error('Configure o Access Token antes de testar');
      return;
    }

    setTesting(true);
    try {
      console.log('Testing Admin Mercado Pago connection...');
      
      const response = await fetch('https://api.mercadopago.com/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Admin test response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('Admin connection test successful:', userData);
        toast.success(`✅ Conexão OK! Conta: ${userData.nickname || userData.first_name || userData.email || 'Mercado Pago'}`);
      } else {
        const errorData = await response.text();
        console.error('Admin connection test failed:', response.status, errorData);
        
        let errorMessage = "Verifique se o Access Token está correto.";
        if (response.status === 401) {
          errorMessage = "Token inválido ou expirado. Verifique se copiou corretamente.";
        } else if (response.status === 403) {
          errorMessage = "Token sem permissões necessárias.";
        } else if (response.status === 400) {
          errorMessage = "Formato do token inválido. Verifique se está no formato correto.";
        }
        
        toast.error(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error testing admin connection:', error);
      toast.error('❌ Erro ao testar conexão. Verifique sua internet e o token.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl sm:text-2xl font-bold">Configuração Mercado Pago - Admin</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">
            <CreditCard className="h-3 w-3 mr-1" />
            Conta Principal
          </Badge>
          {isConfigured && (
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
              <Check className="h-3 w-3 mr-1" />
              Configurado
            </Badge>
          )}
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-6 w-6 text-red-400" />
          <h3 className="text-xl font-semibold">Conta Principal do Sistema</h3>
          {isConfigured && (
            <div className="flex items-center gap-1 text-green-400">
              <Check className="h-4 w-4" />
              <span className="text-sm">Ativa</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">
                <p className="font-medium mb-2">⚠️ CONTA PRINCIPAL DO SISTEMA:</p>
                <p className="mb-2">
                  Esta é a <strong>conta ADMIN</strong> que receberá <strong>TODAS as mensalidades</strong> dos profissionais cadastrados no Agenda Right Time.
                </p>
                <p className="mb-2">
                  <strong>DIFERENTE</strong> das contas individuais dos profissionais que recebem pagamentos de agendamentos.
                </p>
                <p className="text-red-300/80">
                  Certifique-se de configurar SUA conta do Mercado Pago aqui.
                </p>
              </div>
            </div>
          </div>

          {isConfigured && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-yellow-400 mb-1">Conta Principal já configurada</h4>
                  <p className="text-sm text-yellow-300">
                    Esta conta está recebendo as mensalidades dos profissionais. Se precisar trocar, configure uma nova conta.
                  </p>
                </div>
                <Button
                  onClick={changeAccount}
                  disabled={changingAccount}
                  variant="outline"
                  className="border-yellow-600 text-yellow-400 hover:bg-yellow-500/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {changingAccount ? 'Trocando...' : 'Trocar Conta'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="accessToken">Access Token *</Label>
              <Input
                id="accessToken"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Ex: APP_USR-1234567890123456-012345-abcdef1234567890abcdef1234567890-12345678"
                className="bg-gray-800 border-gray-600 mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Seu token privado do Mercado Pago (começa com APP_USR- ou TEST-)
              </p>
            </div>

            <div>
              <Label htmlFor="publicKey">Public Key *</Label>
              <Input
                id="publicKey"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Ex: APP_USR-abcd1234-ef56-7890-abcd-123456789012"
                className="bg-gray-800 border-gray-600 mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Sua chave pública do Mercado Pago (começa com APP_USR- ou TEST-)
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={saveConfiguration}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Conta Principal'}
            </Button>

            {accessToken && (
              <Button
                onClick={testConfiguration}
                disabled={testing}
                variant="outline"
                className="border-blue-600 text-blue-400"
              >
                {testing ? 'Testando...' : 'Testar Conexão'}
              </Button>
            )}

            <Button
              onClick={() => window.open('https://www.mercadopago.com.br/developers/panel', '_blank')}
              variant="outline"
              className="border-gray-600"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Obter Chaves
            </Button>
          </div>

          {isConfigured && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-green-400" />
                <span className="font-medium text-green-400">Conta Principal Ativa!</span>
              </div>
              <div className="text-sm text-green-300">
                <p className="mb-2">Sua conta está configurada como conta principal do sistema.</p>
                <ul className="space-y-1">
                  <li>✓ Recebe TODAS as mensalidades dos profissionais</li>
                  <li>✓ Processamento centralizado via SUA conta</li>
                  <li>✓ Controle total das receitas do sistema</li>
                  <li>✓ Independente das contas dos profissionais individuais</li>
                </ul>
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-300 mb-2">Como obter suas chaves:</h4>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Acesse o <strong>Painel de Desenvolvedores</strong> do Mercado Pago</li>
              <li>Faça login na SUA conta (não na dos profissionais)</li>
              <li>Vá em <strong>"Suas integrações" → "Credenciais"</strong></li>
              <li>Copie o <strong>Access Token</strong> e a <strong>Public Key</strong></li>
              <li>Cole aqui e salve como conta principal</li>
            </ol>
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
              <p className="text-xs text-red-300">
                <strong>MUITO IMPORTANTE:</strong> Esta conta receberá as mensalidades de TODOS os profissionais do sistema. Configure SUA conta pessoal/empresarial aqui.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminMercadoPagoConfig;
