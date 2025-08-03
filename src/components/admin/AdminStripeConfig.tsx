import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface StripeConfig {
  secret_key: string;
  publishable_key: string;
  is_test_mode: boolean;
  created_at?: string;
  updated_at?: string;
}

const AdminStripeConfig = () => {
  const [secretKey, setSecretKey] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
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
      console.log('Loading Admin Stripe configuration...');
      
      const { data, error } = await supabase
        .from('admin_stripe_config')
        .select('secret_key, publishable_key, is_test_mode')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading admin stripe configuration:', error);
        toast.error('Erro ao carregar configuração');
        return;
      }

      if (data) {
        console.log('Admin Stripe configuration loaded:', { hasSecret: !!data.secret_key, hasPublic: !!data.publishable_key });
        setSecretKey(data.secret_key || '');
        setPublishableKey(data.publishable_key || '');
        setIsConfigured(!!(data.secret_key && data.publishable_key));
      } else {
        console.log('No admin Stripe configuration found');
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Unexpected error loading admin stripe configuration:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const validateSecretKey = (key: string) => {
    const keyPattern = /^(sk_test_|sk_live_)[a-zA-Z0-9]{48,}$/;
    return keyPattern.test(key.trim());
  };

  const validatePublishableKey = (key: string) => {
    const keyPattern = /^(pk_test_|pk_live_)[a-zA-Z0-9]{48,}$/;
    return keyPattern.test(key.trim());
  };

  const saveConfiguration = async () => {
    if (!secretKey.trim() || !publishableKey.trim()) {
      toast.error('Secret Key e Publishable Key são obrigatórios');
      return;
    }

    if (!validateSecretKey(secretKey)) {
      toast.error('Secret Key deve ter o formato correto do Stripe (sk_test_ ou sk_live_)');
      return;
    }

    if (!validatePublishableKey(publishableKey)) {
      toast.error('Publishable Key deve ter o formato correto do Stripe (pk_test_ ou pk_live_)');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving Admin Stripe configuration...');
      
      const configData = {
        secret_key: secretKey.trim(),
        publishable_key: publishableKey.trim(),
        is_test_mode: secretKey.startsWith('sk_test_'),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('admin_stripe_config')
        .upsert(configData);

      if (error) {
        console.error('Error saving admin stripe configuration:', error);
        toast.error('Erro ao salvar configuração');
        return;
      }

      console.log('Admin Stripe configuration saved successfully');
      setIsConfigured(true);
      toast.success('✅ Configuração Stripe salva! Esta conta receberá as mensalidades dos profissionais.');
      
    } catch (error) {
      console.error('Error saving admin stripe configuration:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const changeAccount = async () => {
    setChangingAccount(true);
    try {
      console.log('Changing Admin Stripe account...');
      
      const { error: deleteError } = await supabase
        .from('admin_stripe_config')
        .delete()
        .not('id', 'is', null);

      if (deleteError) {
        console.error('Error deleting admin stripe configuration:', deleteError);
        throw deleteError;
      }

      setSecretKey('');
      setPublishableKey('');
      setIsConfigured(false);

      console.log('Admin Stripe account configuration cleared successfully');
      toast.success('✅ Conta removida com sucesso! Configure sua nova conta Stripe abaixo.');
    } catch (error) {
      console.error('Error changing admin stripe account:', error);
      toast.error('Erro ao trocar conta');
    } finally {
      setChangingAccount(false);
    }
  };

  const testConfiguration = async () => {
    if (!secretKey.trim()) {
      toast.error('Configure o Secret Key antes de testar');
      return;
    }

    setTesting(true);
    try {
      console.log('Testing Admin Stripe connection...');
      
      const { data, error } = await supabase.functions.invoke('test-stripe-connection', {
        body: { secret_key: secretKey.trim() }
      });

      if (error) {
        console.error('Admin Stripe connection test failed:', error);
        toast.error('❌ Erro ao testar conexão Stripe');
        return;
      }

      if (data?.success) {
        console.log('Admin Stripe connection test successful');
        toast.success(`✅ Conexão OK! Conta: ${data.account_name || 'Stripe'}`);
      } else {
        toast.error('❌ Falha na conexão. Verifique se a chave está correta.');
      }
    } catch (error) {
      console.error('Error testing admin stripe connection:', error);
      toast.error('❌ Erro ao testar conexão. Verifique sua internet e as chaves.');
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
        <h3 className="text-xl sm:text-2xl font-bold">Configuração Stripe - Admin</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
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
          <CreditCard className="h-6 w-6 text-blue-400" />
          <h3 className="text-xl font-semibold">Conta Principal Stripe do Sistema</h3>
          {isConfigured && (
            <div className="flex items-center gap-1 text-green-400">
              <Check className="h-4 w-4" />
              <span className="text-sm">Ativa</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-2">⚠️ CONTA PRINCIPAL DO SISTEMA:</p>
                <p className="mb-2">
                  Esta é a <strong>conta ADMIN</strong> que receberá <strong>TODAS as mensalidades</strong> dos profissionais cadastrados no Agenda Right Time.
                </p>
                <p className="mb-2">
                  <strong>DIFERENTE</strong> das contas individuais dos profissionais que recebem pagamentos de agendamentos.
                </p>
                <p className="text-blue-300/80">
                  Certifique-se de configurar SUA conta do Stripe aqui.
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
              <Label htmlFor="secretKey">Secret Key *</Label>
              <Input
                id="secretKey"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Ex: sk_test_51234567890abcdef..."
                className="bg-gray-800 border-gray-600 mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Sua chave secreta do Stripe (começa com sk_test_ ou sk_live_)
              </p>
            </div>

            <div>
              <Label htmlFor="publishableKey">Publishable Key *</Label>
              <Input
                id="publishableKey"
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder="Ex: pk_test_51234567890abcdef..."
                className="bg-gray-800 border-gray-600 mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Sua chave pública do Stripe (começa com pk_test_ ou pk_live_)
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={saveConfiguration}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Conta Principal'}
            </Button>

            {secretKey && (
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
              onClick={() => window.open('https://dashboard.stripe.com/apikeys', '_blank')}
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
                <p className="mb-2">Sua conta Stripe está configurada como conta principal do sistema.</p>
                <ul className="space-y-1">
                  <li>✓ Recebe TODAS as mensalidades dos profissionais</li>
                  <li>✓ Processamento centralizado via SUA conta</li>
                  <li>✓ Controle total das receitas do sistema</li>
                  <li>✓ Pagamentos recorrentes automáticos</li>
                  <li>✓ Independente das contas dos profissionais individuais</li>
                </ul>
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-300 mb-2">Como obter suas chaves Stripe:</h4>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Acesse o <strong>Dashboard do Stripe</strong></li>
              <li>Faça login na SUA conta (não na dos profissionais)</li>
              <li>Vá em <strong>"Developers" → "API keys"</strong></li>
              <li>Copie a <strong>Secret Key</strong> e a <strong>Publishable Key</strong></li>
              <li>Cole aqui e salve como conta principal</li>
            </ol>
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
              <p className="text-xs text-blue-300">
                <strong>MUITO IMPORTANTE:</strong> Esta conta receberá as mensalidades de TODOS os profissionais do sistema. Configure SUA conta pessoal/empresarial aqui.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminStripeConfig;