import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CreditCard, Check, AlertCircle, ExternalLink, Save, RefreshCw } from 'lucide-react';
import { useTheme } from '@/hooks/useThemeManager';

const MercadoPagoSettings = () => {
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [changingAccount, setChangingAccount] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isLightTheme } = useTheme();

  useEffect(() => {
    if (user?.id) {
      loadConfiguration();
    }
  }, [user?.id]);

  // Carregar valores temporários salvos ao montar o componente (ANTES do loadConfiguration)
  useEffect(() => {
    const savedPublicKey = localStorage.getItem('mp_public_key_temp');
    const savedAccessToken = localStorage.getItem('mp_access_token_temp');
    
    if (savedPublicKey) {
      setPublicKey(savedPublicKey);
    }
    if (savedAccessToken) {
      setAccessToken(savedAccessToken);
    }
  }, []);

  const loadConfiguration = async () => {
    if (!user?.id) return;

    try {
      console.log('Loading Mercado Pago configuration...');
      
      const { data, error } = await supabase
        .from('configuracoes')
        .select('mercado_pago_access_token, mercado_pago_public_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading configuration:', error);
        throw error;
      }

      // Verificar se há valores temporários salvos - NÃO sobrescrever se existirem
      const savedPublicKey = localStorage.getItem('mp_public_key_temp');
      const savedAccessToken = localStorage.getItem('mp_access_token_temp');

      if (data) {
        console.log('Configuration loaded:', { hasToken: !!data.mercado_pago_access_token, hasKey: !!data.mercado_pago_public_key });
        
        // Só usar os dados do banco se NÃO houver valores temporários
        if (!savedAccessToken) {
          setAccessToken(data.mercado_pago_access_token || '');
        }
        if (!savedPublicKey) {
          setPublicKey(data.mercado_pago_public_key || '');
        }
        
        setIsConfigured(!!(data.mercado_pago_access_token && data.mercado_pago_public_key));
      } else {
        console.log('No configuration found');
        
        // Só limpar se NÃO houver valores temporários
        if (!savedAccessToken) {
          setAccessToken('');
        }
        if (!savedPublicKey) {
          setPublicKey('');
        }
        
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Unexpected error loading configuration:', error);
      toast({
        title: "Erro ao carregar configuração",
        description: "Não foi possível carregar as configurações do Mercado Pago.",
        variant: "destructive"
      });
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
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para salvar as configurações.",
        variant: "destructive"
      });
      return;
    }

    if (!accessToken.trim() || !publicKey.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Access Token e a Public Key.",
        variant: "destructive"
      });
      return;
    }

    if (!validateAccessToken(accessToken)) {
      toast({
        title: "Access Token inválido",
        description: "O Access Token deve ter o formato correto do Mercado Pago.",
        variant: "destructive"
      });
      return;
    }

    if (!validatePublicKey(publicKey)) {
      toast({
        title: "Public Key inválida",
        description: "A Public Key deve ter o formato correto do Mercado Pago.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      console.log('Saving Mercado Pago configuration...');

      const { data, error } = await supabase
        .from('configuracoes')
        .upsert({
          user_id: user.id,
          mercado_pago_access_token: accessToken.trim(),
          mercado_pago_public_key: publicKey.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('❌ Erro ao salvar configuração:', error);
        throw error;
      }

      console.log('Configuration saved successfully:', data);
      setIsConfigured(true);
      
      // Limpar os valores temporários do localStorage após salvar com sucesso
      localStorage.removeItem('mp_access_token_temp');
      localStorage.removeItem('mp_public_key_temp');
      
      toast({
        title: "Configuração salva! 🎉",
        description: "Sua conta do Mercado Pago foi configurada com sucesso."
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Erro ao salvar",
        description: `Não foi possível salvar a configuração: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const changeAccount = async () => {
    if (!user?.id) return;

    setChangingAccount(true);
    try {
      console.log('Changing Mercado Pago account...');

      const { error } = await supabase
        .from('configuracoes')
        .upsert({
          user_id: user.id,
          mercado_pago_access_token: null,
          mercado_pago_public_key: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error clearing configuration:', error);
        throw error;
      }

      setAccessToken('');
      setPublicKey('');
      setIsConfigured(false);

      console.log('Account configuration cleared successfully');
      toast({
        title: "Conta removida com sucesso! 🔄",
        description: "Configure uma nova conta do Mercado Pago abaixo."
      });
    } catch (error) {
      console.error('Error changing account:', error);
      toast({
        title: "Erro ao trocar conta",
        description: "Não foi possível remover a configuração atual. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setChangingAccount(false);
    }
  };

  const testConfiguration = async () => {
    if (!accessToken.trim()) {
      toast({
        title: "Token necessário",
        description: "Configure o Access Token antes de testar.",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      console.log('Testing Mercado Pago connection...');
      
      const response = await fetch('https://api.mercadopago.com/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Test response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('Connection test successful:', userData);
        toast({
          title: "Conexão bem-sucedida! ✅",
          description: `Conta conectada: ${userData.nickname || userData.first_name || userData.email || 'Mercado Pago'}`
        });
      } else {
        const errorData = await response.text();
        console.error('Connection test failed:', response.status, errorData);
        
        let errorMessage = "Verifique se o Access Token está correto.";
        if (response.status === 401) {
          errorMessage = "Token inválido ou expirado. Verifique se copiou corretamente.";
        } else if (response.status === 403) {
          errorMessage = "Token sem permissões necessárias.";
        } else if (response.status === 400) {
          errorMessage = "Formato do token inválido. Verifique se está no formato correto.";
        }
        
        toast({
          title: "Erro de conexão",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Erro ao testar",
        description: "Não foi possível testar a conexão. Verifique sua internet e o token.",
        variant: "destructive"
      });
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
    <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800 text-gray-400' : 'bg-gray-900 border-gray-700 text-gray-400'} p-6`}>




      <div className="flex items-center gap-3 mb-6">
        <CreditCard className={`${isLightTheme ? 'text-blue-600' : 'text-blue-400'} h-6 w-6`} />
        <h3 className={`${isLightTheme ? 'text-blue-600' : 'text-blue-400'} text-xl font-semibold`}>Sua Conta Mercado Pago</h3>
        {isConfigured && (
          <div className={`${isLightTheme ? 'text-green-500' : 'text-green-400'} flex items-center gap-1`}>
            <Check className="h-4 w-4" />
            <span className="text-sm">Configurado</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className={`${isLightTheme ? 'text-blue-500' : 'text-blue-400'} h-5 w-5 flex-shrink-0 mt-0.5`} />
            <div className={`${isLightTheme ? 'text-blue-500' : 'text-blue-300'} text-sm`}>



              <p className="font-medium mb-2">Configure sua conta do Mercado Pago:</p>
              <p className="mb-2">
                Recebeba de <strong>10 a 100%</strong> dos agendamentos via Pix ou Cartão.
              </p>
              <p className="mb-2">
                Cadastre seu <strong>EMAIL</strong> Agenda Right Time como chave PIX.
              </p>
            </div>
          </div>
        </div>

        {isConfigured && (
          <div className={`${isLightTheme ? 'bg-yellow-900/5 border-gold-800' : 'bg-yellow-600/5 border-gold-600/30'} border rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`${isLightTheme ? 'text-yellow-700' : 'text-yellow-400'} font-medium mb-1`}>Conta já configurada</h4>
                <p className={`${isLightTheme ? 'text-yellow-600' : 'text-yellow-300'} text-sm`}>



                  Se os pagamentos não funcionarem corretamente, tente trocar as chaves da API.
                </p>
              </div>
              <Button
                onClick={changeAccount}
                disabled={changingAccount}
                variant="outline"
                className="border-yellow-600 text-gray-900 hover:bg-yellow-500/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {changingAccount ? 'Trocando...' : 'Trocar Conta'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className={`${isLightTheme ? 'text-blue-600' : 'text-blue-400'}`} htmlFor="publicKey">Public Key *</Label>
            <Input
              id="publicKey"
              value={publicKey}
              onChange={(e) => {
                const value = e.target.value;
                setPublicKey(value);
                // Salvar temporariamente no localStorage
                if (value) {
                  localStorage.setItem('mp_public_key_temp', value);
                } else {
                  localStorage.removeItem('mp_public_key_temp');
                }
              }}
              placeholder="Ex: APP_USR-abcd1234-ef56-7890-abcd-123456789012"
              className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-white'} mt-1`}
            />
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-xs mt-1`}>
              Sua chave pública do Mercado Pago (começa com APP_USR- ou TEST-)
            </p>
          </div>

          <div>
            <Label className={`${isLightTheme ? 'text-blue-600' : 'text-blue-400'}`} htmlFor="accessToken">Access Token *</Label>
            <Input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => {
                const value = e.target.value;
                setAccessToken(value);
                // Salvar temporariamente no localStorage
                if (value) {
                  localStorage.setItem('mp_access_token_temp', value);
                } else {
                  localStorage.removeItem('mp_access_token_temp');
                }
              }}
              placeholder="Ex: APP_USR-1234567890123456-012345-abcdef1234567890abcdef1234567890-12345678"
              className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-white'} mt-1`}
            />
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-xs mt-1`}>
              Seu token privado do Mercado Pago (começa com APP_USR- ou TEST-)
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
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>

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
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-500">Conta Configurada!</span>
            </div>
            <div className="text-sm text-green-500">
              <p className="mb-2">Sua conta está pronta para receber pagamentos dos agendamentos.</p>
            </div>
          </div>
        )}

        <div className={`${isLightTheme ? 'bg-gray-200' : 'bg-gray-800'} rounded-lg p-4`}>
          <h4 className={`${isLightTheme ? 'text-black' : 'text-white'} font-medium mb-2`}>Como obter suas chaves:</h4>
          <ol className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-sm space-y-1 list-decimal list-inside`}>
            <li>Acesse o <strong>Painel de Desenvolvedores</strong> do Mercado Pago</li>
            <li>Faça login na sua conta</li>
            <li><strong>Crie uma nova aplicação</strong></li>
            <li>Vá em <strong>"Suas integrações"</strong></li>
            <li>Depois <strong>"Credenciais de produção"</strong></li>
            <li>Copie o <strong>Public Key</strong> e a <strong>Access Token</strong></li>
            <li>Cole aqui e salve a configuração</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
            <p className="text-xs text-blue-500">
              <strong>Formato das chaves:</strong> Devem começar com APP_USR chaves de (produção)
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MercadoPagoSettings;
