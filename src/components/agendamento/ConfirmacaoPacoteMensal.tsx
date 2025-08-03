import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, User, Package, DollarSign, QrCode, Copy, CheckCircle, ArrowLeft, CreditCard } from 'lucide-react';
import MercadoPagoCardForm from '@/components/MercadoPagoCardForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useNavigate } from 'react-router-dom';
import QRCodeLib from 'qrcode';

interface ConfirmacaoPacoteMensalProps {
  selectedDateTimes: Date[];
  selectedServico: string;
  selectedProfissional: string;
  servicos: any[];
  profissionais: any[];
  onConfirmar: () => void;
  loading: boolean;
  clienteNome?: string;
  observacoes: string;
  onObservacoesChange: (value: string) => void;
  ownerId: string;
}

const ConfirmacaoPacoteMensal: React.FC<ConfirmacaoPacoteMensalProps> = ({
  selectedDateTimes,
  selectedServico,
  selectedProfissional,
  servicos,
  profissionais,
  onConfirmar,
  loading,
  clienteNome,
  observacoes,
  onObservacoesChange,
  ownerId
}) => {
  const [establishmentName, setEstablishmentName] = useState('');
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [pacoteAgendamentoId, setPacoteAgendamentoId] = useState<string>('');
  const [showCardForm, setShowCardForm] = useState(false);
  const [pacoteId, setPacoteId] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Hook para monitorar o status do pagamento em tempo real
  const { paymentStatus: realTimePaymentStatus } = usePaymentStatus({
    agendamentoId: pacoteAgendamentoId,
    ownerId: ownerId,
    enabled: showPixPayment && !!pacoteAgendamentoId,
    onPaymentConfirmed: () => {
      console.log('🎉 Pagamento do pacote confirmado! Redirecionando...');
      setShowPixPayment(false);
      toast({
        title: "Pagamento confirmado! 🎉",
        description: "Redirecionando para seus agendamentos...",
      });
      
      setTimeout(() => {
        navigate(`/agendamento?owner=${ownerId}&dashboard&tab=meus-agendamentos`);
      }, 2000);
    }
  });

  const servico = servicos.find(s => s.id === selectedServico);
  const profissional = profissionais.find(p => p.id === selectedProfissional);

  useEffect(() => {
    fetchEstablishmentName();
  }, [ownerId]);

  const fetchEstablishmentName = async () => {
    try {
      const { data: profile } = await supabase
        .from('profissional_profiles')
        .select('empresa, nome')
        .eq('id', ownerId)
        .single();

      if (profile) {
        setEstablishmentName(profile.empresa || profile.nome || 'Estabelecimento');
      }
    } catch (error) {
      console.error('Error fetching establishment name:', error);
    }
  };

  const generateQRCode = async (code: string) => {
    try {
      const qrCodeDataUrl = await QRCodeLib.toDataURL(code, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
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

  const generatePixPayment = async () => {
    try {
      setIsGeneratingPayment(true);
      console.log('💰 Gerando pagamento PIX para pacote mensal');
      
      const valorTotal = servico?.preco || 0;
      setPaymentAmount(valorTotal);
      
      // Gerar código PIX
      const { generateSimplePixCode } = await import('@/utils/pixGenerator');
      
      const pixCodeGenerated = await generateSimplePixCode({
        amount: valorTotal,
        description: `Pacote Mensal ${servico?.nome}`,
        merchantName: establishmentName,
        userId: ownerId
      });

      // Criar registro de pagamento usando o primeiro agendamento do pacote
      if (!pacoteAgendamentoId) {
        toast({
          title: "Erro",
          description: "ID do agendamento não encontrado. Confirme o pacote primeiro.",
          variant: "destructive"
        });
        return;
      }

      const { data: pagamento, error: pagamentoError } = await supabase
        .from('pagamentos')
        .insert({
          agendamento_id: pacoteAgendamentoId,
          valor: valorTotal,
          percentual: 100,
          status: 'pendente',
          user_id: ownerId,
          pix_code: pixCodeGenerated,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        })
        .select('id')
        .single();

      if (pagamentoError) {
        console.error('❌ Erro ao criar pagamento:', pagamentoError);
        throw pagamentoError;
      }

      console.log('✅ Pagamento criado:', pagamento.id);
      setPixCode(pixCodeGenerated);
      await generateQRCode(pixCodeGenerated);
      setShowPixPayment(true);

    } catch (error) {
      console.error("❌ Erro ao gerar pagamento PIX:", error);
      toast({
        title: "Erro no PIX",
        description: "Não foi possível gerar o pagamento PIX.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const handleConfirmarPacote = async () => {
    try {
      await onConfirmar();
      
      // Buscar o primeiro agendamento criado para o pacote e extrair o pacoteId
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('id, observacoes')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && agendamentos && agendamentos.length > 0) {
        setPacoteAgendamentoId(agendamentos[0].id);
        
        // Extrair pacoteId das observações
        const pacoteMatch = agendamentos[0].observacoes?.match(/PACOTE MENSAL (PMT\d+)/);
        if (pacoteMatch) {
          setPacoteId(pacoteMatch[1]);
          console.log('📦 Pacote ID extraído:', pacoteMatch[1]);
        }
      }
    } catch (error) {
      console.error('Erro ao confirmar pacote:', error);
    }
  };

  const handleCardSuccess = () => {
    setShowCardForm(false);
    toast({
      title: "Pagamento aprovado! 🎉",
      description: "Redirecionando para seus agendamentos...",
    });
    
    setTimeout(() => {
      navigate(`/agendamento?owner=${ownerId}&dashboard&tab=meus-agendamentos`);
    }, 2000);
  };

  const sortedDateTimes = [...selectedDateTimes].sort((a, b) => a.getTime() - b.getTime());

  // Mostrar formulário de cartão se solicitado
  if (showCardForm) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <MercadoPagoCardForm
          agendamentoId={pacoteAgendamentoId}
          ownerId={ownerId}
          paymentAmount={servico?.preco || 0}
          pacoteId={pacoteId}
          onSuccess={handleCardSuccess}
          onCancel={() => setShowCardForm(false)}
        />
      </div>
    );
  }

  return (
    <>
      {/* Modal compacto para pagamento PIX */}
      <Dialog open={showPixPayment} onOpenChange={setShowPixPayment}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-purple-500" />
              Pagamento PIX - Pacote Mensal
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status do pagamento em tempo real */}
            {realTimePaymentStatus === 'pago' && (
              <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Pagamento confirmado!</span>
                </div>
                <p className="text-green-300 text-sm mt-1">
                  Redirecionando para seus agendamentos...
                </p>
              </div>
            )}

            {/* Valor do pagamento */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500 mb-2">
                R$ {paymentAmount.toFixed(2)}
              </div>
              <p className="text-gray-400 text-sm">
                Pagamento total do pacote mensal
              </p>
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex flex-col items-center space-y-2">
                <div className="bg-white p-3 rounded-lg">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code PIX" 
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-gray-400 text-xs text-center">
                  Escaneie o QR Code com seu app de pagamentos
                </p>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPixPayment(false)}
                className="flex-1 border-gray-600 text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <Button
                onClick={handleCopyCode}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar PIX
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <Package className="h-5 w-5 text-purple-500" />
          Confirmar Pacote Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Informações do serviço */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
            <Clock className="h-5 w-5 text-purple-400" />
            <div>
              <p className="text-sm text-purple-400">{servico?.nome}</p>
              {servico?.descricao && (
                <p className="text-sm text-gray-400 mt-1">{servico.descricao}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
            <User className="h-5 w-5 text-purple-400" />
            <div>
              <p className="text-sm text-purple-400">PROFISSIONAL</p>
              <p className="font-medium text-gray-400">{profissional?.nome}</p>
              {profissional?.especialidade && (
                <p className="text-xs text-gray-400 mt-1">{profissional.especialidade}</p>
              )}
            </div>
          </div>
        </div>

        {/* Horários selecionados */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-gray-400 mb-5">
            <Calendar className="h-4 w-4 text-purple-400" />
            Datas e Horários (4 sessões)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedDateTimes.map((dateTime, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-purple-300">
                    {format(dateTime, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <p className="text-sm text-gray-400">
                    {format(dateTime, 'HH:mm')} ({servico?.duracao}min)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Valor total */}
        <div className="flex items-center gap-3 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <DollarSign className="h-5 w-5 text-purple-400" />
          <div className="flex-1">
            <p className="text-sm text-gray-400">Valor Total do Pacote</p>
            <p className="text-2xl font-bold text-purple-300">
              R$ {servico?.preco?.toFixed(2)}
            </p>
            <p className="text-sm text-gray-400">
              Pagamento: 100% antecipado (R$ {servico?.preco?.toFixed(2)})
            </p>
          </div>
        </div>
        
        {/* Botões de ação */}
        <div className="space-y-3">
          {/* Botão principal de confirmação */}
          <Button
            onClick={handleConfirmarPacote}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold hover:from-purple-600 hover:to-purple-700"
          >
            {loading ? 'Processando...' : 'Confirmar Pacote Mensal'}
          </Button>

          {/* Botões de pagamento (aparecem apenas depois da confirmação) */}
          {pacoteAgendamentoId && (
            <>
              <Button
                onClick={generatePixPayment}
                disabled={isGeneratingPayment}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
              >
                {isGeneratingPayment ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                {isGeneratingPayment ? 'Gerando PIX...' : 'Pagar com PIX'}
              </Button>
              
              <Button
                onClick={() => setShowCardForm(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar com Cartão
              </Button>
            </>
          )}
        </div>

        <div className="text-center text-sm text-gray-400">
          <p>⚠️ Pacotes mensais não podem ser cancelados após a confirmação</p>
        </div>
      </CardContent>
    </Card>
    </>
  );
};

export default ConfirmacaoPacoteMensal;
