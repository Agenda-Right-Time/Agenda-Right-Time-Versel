import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Loader, X, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';

// Extend window interface para o MercadoPago
declare global {
  interface Window {
    MercadoPago: any;
    mp?: any;
  }
}

interface MercadoPagoCardFormProps {
  agendamentoId: string;
  ownerId: string;
  paymentAmount: number;
  pacoteId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const MercadoPagoCardForm: React.FC<MercadoPagoCardFormProps> = ({
  agendamentoId,
  ownerId,
  paymentAmount,
  pacoteId,
  onSuccess,
  onCancel
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] = useState<'pendente' | 'pago' | 'rejeitado'>('pendente');
  const [userWantsToRetry, setUserWantsToRetry] = useState(false);
  const [holderName, setHolderName] = useState('');
  const [email, setEmail] = useState('');
  const [docType, setDocType] = useState('CPF');
  const [docNumber, setDocNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [installments, setInstallments] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Usar o mesmo hook de status que o PIX
  const { paymentStatus, isChecking } = usePaymentStatus({
    agendamentoId,
    ownerId,
    onPaymentConfirmed: () => {
      console.log('🎉 Payment confirmed! Redirecting to dashboard...');
      setLocalPaymentStatus('pago');
      toast({
        title: "Pagamento confirmado! 🎉",
        description: "Redirecionando para seus agendamentos...",
      });
      
      onSuccess();
      
      // Redirecionar para o dashboard do cliente com aba de agendamentos após 2 segundos
      setTimeout(() => {
        navigate(`/agendamento?owner=${ownerId}&dashboard&tab=meus-agendamentos`);
      }, 2000);
    },
    enabled: localPaymentStatus === 'pendente'
  });

  // Lógica do status: 
  // 1. Se usuário quer tentar novamente, forçar pendente
  // 2. Se não, usar status local quando rejeitado, senão usar status do hook
  const currentPaymentStatus = userWantsToRetry ? 'pendente' : 
    (localPaymentStatus === 'rejeitado' ? 'rejeitado' : paymentStatus);

  useEffect(() => {
    const loadMercadoPagoScript = async () => {
      try {
        console.log('🔄 Iniciando configuração do Mercado Pago para owner:', ownerId);
        
        // Buscar a configuração do Mercado Pago
        const { data: config, error } = await supabase
          .from('configuracoes')
          .select('mercado_pago_public_key')
          .eq('user_id', ownerId)
          .single();

        console.log('📋 Config encontrada:', config);

        if (error || !config?.mercado_pago_public_key) {
          console.error('❌ Erro ao buscar configuração do Mercado Pago:', error);
          toast({
            title: "Erro",
            description: "Configuração do Mercado Pago não encontrada. Verifique se as chaves estão configuradas no dashboard.",
            variant: "destructive"
          });
          return;
        }
        
        console.log('🔑 Carregando SDK do Mercado Pago...');
        
        // Remover script existente se houver
        const existingScript = document.querySelector('script[src*="mercadopago"]');
        if (existingScript) {
          existingScript.remove();
        }
        
        // Carregar o script do Mercado Pago
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        
        script.onload = () => {
          console.log('📦 Script do Mercado Pago carregado');
          
          // Aguardar um pouco e inicializar
          setTimeout(() => {
            try {
              if (window.MercadoPago) {
                console.log('🚀 Inicializando MercadoPago com chave:', config.mercado_pago_public_key.substring(0, 20) + '...');
                
                // Usar a nova API do MercadoPago
                const mp = new window.MercadoPago(config.mercado_pago_public_key, {
                  locale: 'pt-BR'
                });
                
                // Armazenar a instância para uso posterior
                window.mp = mp;
                
                console.log('✅ Mercado Pago SDK inicializado com sucesso');
                setIsInitialized(true);
              } else {
                console.error('❌ window.MercadoPago ainda não está disponível');
                throw new Error('SDK não carregou corretamente');
              }
            } catch (initError) {
              console.error('❌ Erro na inicialização:', initError);
              toast({
                title: "Erro",
                description: "Erro ao inicializar o SDK do Mercado Pago.",
                variant: "destructive"
              });
            }
          }, 500);
        };
        
        script.onerror = () => {
          console.error('❌ Erro ao carregar script do Mercado Pago');
          toast({
            title: "Erro",
            description: "Erro ao carregar o SDK do Mercado Pago.",
            variant: "destructive"
          });
        };
        
        document.head.appendChild(script);
        
      } catch (error) {
        console.error('❌ Erro geral ao inicializar Mercado Pago:', error);
        toast({
          title: "Erro",
          description: "Erro ao inicializar o pagamento.",
          variant: "destructive"
        });
      }
    };

    loadMercadoPagoScript();
    
    // Cleanup function
    return () => {
      const script = document.querySelector('script[src*="mercadopago"]');
      if (script) {
        script.remove();
      }
    };
  }, [ownerId, toast]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpirationDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handleCardTokenization = async () => {
    console.log('🔄 Iniciando tokenização do cartão...');
    
    if (!window.mp) {
      console.error('❌ window.mp (instância do MercadoPago) não encontrado');
      toast({
        title: "Erro",
        description: "SDK do Mercado Pago não inicializado.",
        variant: "destructive"
      });
      return;
    }

    try {
      const expDate = expirationDate.split('/');
      console.log('📋 Dados do cartão para tokenização:', {
        cardNumber: cardNumber.replace(/\s/g, '').substring(0, 6) + '****',
        cardholderName: holderName,
        cardExpirationMonth: expDate[0],
        cardExpirationYear: `20${expDate[1]}`,
        identificationType: docType,
        identificationNumber: docNumber.substring(0, 3) + '****'
      });

      const response = await window.mp.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardholderName: holderName,
        cardExpirationMonth: expDate[0],
        cardExpirationYear: `20${expDate[1]}`,
        securityCode: securityCode,
        identificationType: docType,
        identificationNumber: docNumber
      });

      console.log('📤 Resposta da tokenização:', response);

      if (response.error) {
        console.error('❌ Erro na resposta da tokenização:', response.error);
        throw new Error(response.error);
      }

      if (!response.id) {
        console.error('❌ Token não foi gerado');
        throw new Error('Token não foi gerado');
      }

      console.log('✅ Token gerado com sucesso:', response.id);
      return response.id;
    } catch (error) {
      console.error('❌ Erro ao tokenizar cartão:', error);
      throw error;
    }
  };

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!holderName || !email || !docNumber || !cardNumber || !expirationDate || !securityCode) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setUserWantsToRetry(false); // Resetar flag quando inicia novo pagamento

    try {
      console.log('🔄 Iniciando processo de pagamento...');
      
      // Tokenizar o cartão
      console.log('💳 Tokenizando cartão...');
      const token = await handleCardTokenization();
      
      if (!token) {
        throw new Error('Erro ao processar dados do cartão');
      }

      console.log('✅ Token criado com sucesso:', token);

      // Enviar pagamento para o backend
      console.log('📤 Enviando dados para edge function...');
      const requestData = {
        agendamento_id: agendamentoId,
        owner_id: ownerId,
        payment_amount: paymentAmount,
        card_token: token,
        payer_email: email,
        holder_name: holderName,
        identification_type: docType,
        identification_number: docNumber,
        installments: installments,
        ...(pacoteId && { pacote_id: pacoteId })
      };
      
      console.log('📋 Dados enviados:', {
        ...requestData,
        card_token: '[HIDDEN]'
      });
      const { data, error } = await supabase.functions.invoke('process-card-payment', {
        body: requestData
      });

      console.log('📥 Resposta da edge function:', { data, error });

      if (error) {
        console.error('❌ Erro na edge function:', error);
        throw new Error(error.message || 'Erro ao processar pagamento');
      }

      console.log('✅ Edge function executada com sucesso');

      if (data.success) {
        toast({
          title: "Pagamento processado! 💳",
          description: "Aguardando confirmação do Mercado Pago...",
        });
        
        console.log('✅ Pagamento enviado com sucesso, aguardando confirmação...');
        // NÃO confirmar automaticamente - aguardar a confirmação via hook usePaymentStatus
      } else {
        // Mensagem específica para rejeição
        let errorMsg = data.message || 'Pagamento rejeitado';
        
        // Personalizar mensagem baseada no erro
        if (errorMsg.includes('high_risk') || errorMsg.includes('insufficient_funds')) {
          errorMsg = 'Seu banco recusou o pagamento. Verifique os dados do cartão ou tente outro método.';
        } else if (errorMsg.includes('invalid_card')) {
          errorMsg = 'Dados do cartão inválidos. Verifique as informações e tente novamente.';
        } else if (errorMsg.includes('card_disabled')) {
          errorMsg = 'Cartão bloqueado ou desabilitado. Entre em contato com seu banco.';
        } else if (errorMsg.includes('expired_card')) {
          errorMsg = 'Cartão expirado. Verifique a data de validade.';
        }
        
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('❌ Erro no pagamento:', error);
      
      // Marcar como rejeitado quando há erro
      setLocalPaymentStatus('rejeitado');
      
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar pagamento';
      toast({
        title: "Erro no pagamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Se o pagamento foi rejeitado, mostrar tela de erro
  if (currentPaymentStatus === 'rejeitado') {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <X className="h-12 w-12 text-red-500" />
            <CardTitle className="text-white text-2xl">
              Pagamento Rejeitado
            </CardTitle>
          </div>
          <p className="text-red-400 text-lg font-semibold">
            Seu banco recusou o pagamento
          </p>
          <p className="text-gray-300 mt-2">
            Verifique os dados do cartão ou tente outro método de pagamento
          </p>
          <div className="mt-4 space-y-2">
            <Button
              onClick={() => {
                console.log('🔄 Reset: Voltando para formulário de pagamento');
                setUserWantsToRetry(true);
                setLocalPaymentStatus('pendente');
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Voltar ao PIX
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Se o pagamento foi confirmado, mostrar tela de sucesso
  if (currentPaymentStatus === 'pago') {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <CardTitle className="text-white text-2xl">
              Pagamento Confirmado!
            </CardTitle>
          </div>
          <p className="text-green-400 text-lg font-semibold">
            Seu agendamento foi confirmado com sucesso!
          </p>
          <p className="text-gray-300 mt-2">
            Redirecionando para seus agendamentos em instantes...
          </p>
          <div className="mt-4">
            <RefreshCw className="h-6 w-6 animate-spin text-yellow-500 mx-auto" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!isInitialized) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6 text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-300">Carregando formulário de pagamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-3x1 text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Pagamento Cartão
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500 mb-2">
            {installments === 1 ? (
              `R$ ${paymentAmount.toFixed(2)}`
            ) : (
              <>
                <div>R$ {paymentAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-400">
                  {installments}x de R$ {(paymentAmount / installments).toFixed(2)}
                </div>
              </>
            )}
          </div>
          
          {/* Status de monitoramento após processamento */}
          {isProcessing && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium text-blue-500">
                  Processando pagamento...
                </span>
              </div>
            </div>
          )}
          
          {/* Status do agendamento após envio */}
          {!isProcessing && currentPaymentStatus === 'pendente' && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                {isChecking ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-yellow-500 animate-pulse" />
                )}
                <span className="text-sm font-medium text-yellow-500">
                  Aguardando confirmação do pagamento...
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Verificamos automaticamente a confirmação do Mercado Pago
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handlePayment} className="space-y-4">
          {/* Dados pessoais */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="holderName" className="text-gray-300">
                Nome do portador *
              </Label>
              <Input
                id="holderName"
                type="text"
                placeholder="Nome completo"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-300">
                E-mail *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-300">Tipo de documento *</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="docNumber" className="text-gray-300">
                  CPF *
                </Label>
                <Input
                  id="docNumber"
                  type="text"
                  placeholder={docType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Seletor de parcelas */}
          <div>
            <Label className="text-gray-300">Parcelas *</Label>
            <Select value={installments.toString()} onValueChange={(value) => setInstallments(parseInt(value))}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  1x de R$ {paymentAmount.toFixed(2)} (à vista)
                </SelectItem>
                <SelectItem value="2">
                  2x de R$ {(paymentAmount / 2).toFixed(2)}
                </SelectItem>
                <SelectItem value="3">
                  3x de R$ {(paymentAmount / 3).toFixed(2)}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dados do cartão */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="cardNumber" className="text-gray-300">
                Número do cartão *
              </Label>
              <Input
                id="cardNumber"
                type="text"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                className="bg-gray-800 border-gray-600 text-white"
                maxLength={19}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="expirationDate" className="text-gray-300">
                  Data de expiração *
                </Label>
                <Input
                  id="expirationDate"
                  type="text"
                  placeholder="MM/AA"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(formatExpirationDate(e.target.value))}
                  className="bg-gray-800 border-gray-600 text-white"
                  maxLength={5}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="securityCode" className="text-gray-300">
                  CVV *
                </Label>
                <Input
                  id="securityCode"
                  type="text"
                  placeholder="123"
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ''))}
                  className="bg-gray-800 border-gray-600 text-white"
                  maxLength={4}
                  required
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-gray-600 text-gray-900 hover:bg-gray-800"
              disabled={isProcessing}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
            </Button>
            
            <Button
              type="submit"
              disabled={isProcessing}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {installments === 1 ? (
                    `Pagar R$ ${paymentAmount.toFixed(2)}`
                  ) : (
                    `Pagar ${installments}x R$ ${(paymentAmount / installments).toFixed(2)}`
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MercadoPagoCardForm;