import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, QrCode, CheckCircle, ArrowLeft, Plus, AlertCircle, RefreshCw, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validatePixCode } from '@/utils/pixGenerator';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { usePaymentHeartbeat } from '@/hooks/usePaymentHeartbeat';
import { useGlobalPaymentMonitor } from '@/hooks/useGlobalPaymentMonitor';
import QRCodeLib from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import MercadoPagoCardForm from '@/components/MercadoPagoCardForm';

interface PagamentoPixProps {
  pixCode: string;
  paymentAmount: number;
  agendamentoId: string;
  ownerId: string;
  onPaymentConfirmed: () => void;
  onNewAppointment: () => void;
  onBackToAppointment: () => void;
}

const PagamentoPix: React.FC<PagamentoPixProps> = ({
  pixCode,
  paymentAmount,
  agendamentoId,
  ownerId,
  onPaymentConfirmed,
  onNewAppointment,
  onBackToAppointment
}) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [pixValid, setPixValid] = useState(false);
  const [percentualAntecipado, setPercentualAntecipado] = useState<number>(50);
  const [showCardForm, setShowCardForm] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePaymentConfirmed = () => {
    console.log('🎉 Payment confirmed! Redirecting to dashboard...');
    toast({
      title: "Pagamento confirmado! 🎉",
      description: "Redirecionando para seus agendamentos...",
    });
    
    // Redirecionar para o dashboard do cliente com aba de agendamentos após 2 segundos
    setTimeout(() => {
      navigate(`/agendamento?owner=${ownerId}&dashboard&tab=meus-agendamentos`);
    }, 2000);
    
    onPaymentConfirmed();
  };

  const { paymentStatus, isChecking } = usePaymentStatus({
    agendamentoId,
    ownerId,
    onPaymentConfirmed: handlePaymentConfirmed,
    enabled: true
  });

  // Heartbeat específico para este agendamento
  usePaymentHeartbeat({
    enabled: true,
    agendamentoId,
    ownerId,
    onPaymentFound: handlePaymentConfirmed
  });

  // Monitor global de pagamentos (funciona mesmo fora da tela)
  useGlobalPaymentMonitor({
    enabled: true,
    ownerId,
    onPaymentFound: (foundAgendamentoId) => {
      if (foundAgendamentoId === agendamentoId) {
        handlePaymentConfirmed();
      }
    }
  });

  useEffect(() => {
    fetchPaymentPercentage();
  }, [agendamentoId]);

  const fetchPaymentPercentage = async () => {
    try {
      const { data: pagamento, error } = await supabase
        .from('pagamentos')
        .select('percentual')
        .eq('agendamento_id', agendamentoId)
        .single();

      if (error) {
        console.error('Erro ao buscar porcentagem do pagamento:', error);
        return;
      }

      if (pagamento) {
        setPercentualAntecipado(pagamento.percentual || 50);
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  useEffect(() => {
    if (pixCode) {
      console.log('PIX Code received:', pixCode);
      
      const isValid = validatePixCode(pixCode);
      setPixValid(isValid);
      
      if (isValid) {
        console.log('PIX Code validation: PASSED');
        generateQRCode();
      } else {
        console.log('PIX Code validation: FAILED');
        generateQRCode();
      }
    }
  }, [pixCode]);

  const generateQRCode = async () => {
    try {
      console.log('Generating QR Code for PIX:', pixCode.substring(0, 50) + '...');
      
      const qrCodeDataUrl = await QRCodeLib.toDataURL(pixCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeUrl(qrCodeDataUrl);
      console.log('QR Code generated successfully');
      
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o QR code.",
        variant: "destructive"
      });
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast({
        title: "Código PIX copiado! 📋",
        description: "Cole no seu app de pagamentos para finalizar."
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = pixCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied(true);
      toast({
        title: "Código PIX copiado! 📋",
        description: "Cole no seu app de pagamentos para finalizar."
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatPixCode = (code: string) => {
    const chunks = code.match(/.{1,50}/g) || [];
    return chunks.join('\n');
  };

  const handleCardSuccess = () => {
    setShowCardForm(false);
    onPaymentConfirmed();
  };

  // Se o pagamento foi rejeitado, mostrar tela de erro
  if (paymentStatus === 'rejeitado') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <CardTitle className="text-white text-2xl">
                Pagamento Rejeitado
              </CardTitle>
            </div>
            <p className="text-red-400 text-lg font-semibold">
              Seu banco recusou o pagamento
            </p>
            <p className="text-gray-300 mt-2">
              Tente novamente com outro método de pagamento
            </p>
            <div className="mt-4 space-y-2">
              <Button
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold mr-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button
                variant="outline"
                onClick={onBackToAppointment}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'pago') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
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
      </div>
    );
  }

  // Mostrar formulário de cartão se solicitado
  if (showCardForm) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <MercadoPagoCardForm
          agendamentoId={agendamentoId}
          ownerId={ownerId}
          paymentAmount={paymentAmount}
          onSuccess={handleCardSuccess}
          onCancel={() => setShowCardForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header de confirmação */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <CardTitle className="text-white text-2xl">
              Agendamento Criado!
            </CardTitle>
          </div>
          <p className="text-gray-300">
            Complete o pagamento PIX para confirmar seu horário
          </p>
          
          {/* Status do pagamento com mais detalhes */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              {isChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />
              )}
              <span className="text-sm font-medium text-yellow-500">
                Status: Aguardando pagamento PIX...
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Card do pagamento PIX */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base text-white">Pagamento PIX</CardTitle>
              {pixValid ? (
                <div className="flex items-center gap-1 ml-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-500">Formato válido</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 ml-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-yellow-500">Verificando formato...</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Valor do pagamento */}
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500 mb-2">
              R$ {paymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-gray-400 text-sm">
              Pagamento antecipado ({percentualAntecipado}% do valor total)
            </p>
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="w-72 h-72"
                />
              </div>
              <p className="text-gray-400 text-sm text-center max-w-md">
                <strong>Opção 1:</strong> Escaneie o QR Code com a câmera do seu banco ou app de pagamentos
              </p>
            </div>
          )}

          {/* Código PIX Copia e Cola */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-300 text-sm">
                <strong>Opção 2:</strong> Código PIX Copia e Cola:
              </p>
              <span className={`text-xs flex items-center gap-1 ${pixValid ? 'text-green-500' : 'text-yellow-500'}`}>
                <CheckCircle className="h-3 w-3" />
                {pixValid ? 'Formato válido' : 'Código gerado'}
              </span>
            </div>
            <div className="bg-gray-700 p-3 rounded border border-gray-600">
              <pre className="text-white text-xs break-all font-mono whitespace-pre-wrap">
                {formatPixCode(pixCode)}
              </pre>
            </div>
          </div>

          {/* Botão copiar */}
          <Button
            onClick={handleCopyCode}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold hover:opacity-90 transition-opacity"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Código Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código PIX
              </>
            )}
          </Button>

          {/* Divisor */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="text-gray-400 text-sm font-medium">OU</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          {/* Botão pagamento com cartão */}
          <Button
            onClick={() => setShowCardForm(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Pagar com Cartão de Crédito/Débito
          </Button>

          {/* Instruções */}
          <div className="text-center text-sm text-gray-400 space-y-3 border-t border-gray-700 pt-4">
            <div className="space-y-2">
              <p className="font-medium text-gray-300">Como pagar:</p>
              <div className="space-y-1">
                <p>1. Abra o app do seu banco ou carteira digital</p>
                <p>2. Escolha a opção <strong>PIX</strong></p>
                <p>3. Selecione <strong>QR Code</strong> ou <strong>Copia e Cola</strong></p>
                <p>4. Escaneie o código ou cole o texto copiado</p>
                <p>5. Confirme o pagamento de <strong>R$ {paymentAmount.toFixed(2)}</strong></p>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mt-4">
              <p>⚡ Pagamento instantâneo via PIX</p>
              <p>🔒 Seguro e reconhecido pelo Banco Central</p>
              <p>📱 Funciona 24h, todos os dias</p>
              <p>🔄 Verificamos seu pagamento automaticamente</p>
              <p>💰 Restante ({100 - percentualAntecipado}%) pago presencialmente</p>
              <p>📊 ID do Agendamento: {agendamentoId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onBackToAppointment}
          className="flex-1 border-gray-600 text-gray-900 hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <Button
          onClick={onNewAppointment}
          className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>
    </div>
  );
};

export default PagamentoPix;
