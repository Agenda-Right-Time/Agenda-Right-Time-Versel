import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, User, DollarSign, MessageSquare, X, Package, CreditCard, QrCode, Copy, CheckCircle, ArrowLeft } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useNavigate } from 'react-router-dom';
import QRCodeLib from 'qrcode';
import MercadoPagoCardForm from '@/components/MercadoPagoCardForm';

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  valor: number;
  observacoes?: string;
  servicos: {
    nome: string;
    duracao: number;
  };
  profissionais: {
    nome: string;
    especialidade: string;
  };
  pagamentos: {
    status: string;
    valor: number;
  }[];
  isPacoteMensal?: boolean;
  pacoteInfo?: {
    sequencia: number;
    pacoteId: string;
    valorTotal: number;
    sessoesCanceladas?: number;
    sessoesConcluidas?: number;
    sessoesPendentes?: number;
    agendamentosPacote?: Agendamento[];
  };
}

interface AppointmentCardProps {
  agendamento: Agendamento;
  onCancel: (appointmentId: string) => void;
  isCancelling: boolean;
  ownerId: string;
  onPaymentSuccess?: () => void;
}

const AppointmentCard = ({ agendamento, onCancel, isCancelling, ownerId, onPaymentSuccess }: AppointmentCardProps) => {
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [valorAntecipado, setValorAntecipado] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Calcular valor antecipado para agendamentos normais
  useEffect(() => {
    if (!agendamento.isPacoteMensal) {
      const calcularValorAntecipado = async () => {
        try {
          const { data: configuracao } = await supabase
            .from('configuracoes')
            .select('percentual_antecipado')
            .eq('user_id', ownerId)
            .single();
          
          const percentualAntecipado = configuracao?.percentual_antecipado || 50;
          const valor = (agendamento.valor || 0) * (percentualAntecipado / 100);
          setValorAntecipado(valor);
        } catch (error) {
          console.error('Erro ao calcular valor antecipado:', error);
          setValorAntecipado((agendamento.valor || 0) * 0.5); // Fallback para 50%
        }
      };
      
      calcularValorAntecipado();
    }
  }, [agendamento.isPacoteMensal, agendamento.valor, ownerId]);

  // Hook para monitorar o status do pagamento em tempo real
  const { paymentStatus: realTimePaymentStatus } = usePaymentStatus({
    agendamentoId: agendamento.id,
    ownerId: ownerId,
    enabled: showPixPayment, // Monitora apenas quando o modal PIX está aberto
    onPaymentConfirmed: () => {
      // Quando o pagamento for confirmado
      console.log('🎉 Pagamento confirmado! Atualizando dados...');
      setShowPixPayment(false);
      toast({
        title: "Pagamento confirmado! 🎉",
        description: "Agendamento atualizado com sucesso!",
      });
      
      // Notificar o componente pai para atualizar os dados
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    }
  });
  
  const canCancelAppointment = (dataHora: string) => {
    const appointmentDate = new Date(dataHora);
    const now = new Date();
    const hoursUntilAppointment = differenceInHours(appointmentDate, now);
    return hoursUntilAppointment >= 48; // 48 horas = 2 dias
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

  const getStatusBadge = (status: string, pagamentos: Agendamento['pagamentos']) => {
    // Determinar status real baseado no pagamento e status do agendamento
    let realStatus = status;
    
    // Verificar se há pagamento pago
    const hasPaidPayment = Array.isArray(pagamentos) && pagamentos.some(p => p.status === 'pago');
    const hasPendingPayment = Array.isArray(pagamentos) && pagamentos.some(p => p.status === 'pendente');
    
    // Se tem pagamento pago e status é confirmado, mostrar como confirmado
    if (hasPaidPayment && status === 'confirmado') {
      realStatus = 'confirmado';
    }
    // Se tem pagamento pago mas status ainda é agendado, forçar confirmado
    else if (hasPaidPayment && status === 'agendado') {
      realStatus = 'confirmado';
    }
    // Se tem pagamento pendente e status não é cancelado, mostrar como pendente
    else if (hasPendingPayment && status !== 'cancelado' && status !== 'confirmado') {
      realStatus = 'pendente';
    }

    const statusConfig = {
      agendado: { label: 'Agendado', variant: 'default' as const },
      confirmado: { label: 'Confirmado', variant: 'secondary' as const },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const },
      concluido: { label: 'Concluído', variant: 'outline' as const },
      pendente: { label: 'Pendente', variant: 'outline' as const }
    };

    const config = statusConfig[realStatus as keyof typeof statusConfig] || { label: realStatus, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatus = (pagamentos: Agendamento['pagamentos']) => {
    const pagamentosArray = Array.isArray(pagamentos) ? pagamentos : (pagamentos ? [pagamentos] : []);
    if (!pagamentosArray || pagamentosArray.length === 0) {
      return { status: 'Pendente', color: 'text-yellow-500' };
    }

    // Para pacotes mensais, verificar se há pagamento pago em qualquer sessão ativa
    const hasPaidPayment = pagamentosArray.some(p => p.status === 'pago');
    const hasPendingPayment = pagamentosArray.some(p => p.status === 'pendente');
    
    if (hasPaidPayment) {
      return { status: 'Pago', color: 'text-green-500' };
    } else if (hasPendingPayment) {
      return { status: 'Pendente', color: 'text-yellow-500' };
    } else {
      return { status: 'Pendente', color: 'text-yellow-500' };
    }
  };

  const generatePixPayment = async () => {
    try {
      setIsGeneratingPayment(true);
      console.log('💰 Gerando pagamento PIX para agendamento:', agendamento.id);
      
      let valorAntecipado;
      
      if (agendamento.isPacoteMensal) {
        // Para pacotes mensais, usar o valor total
        valorAntecipado = agendamento.valor || 0;
      } else {
        // Para agendamentos normais, usar o percentual configurado
        const { data: configuracao, error: configError } = await supabase
          .from('configuracoes')
          .select('percentual_antecipado')
          .eq('user_id', ownerId)
          .single();

        if (configError) {
          console.error('⚠️ Erro ao buscar configuração:', configError);
        }

        const percentualAntecipado = configuracao?.percentual_antecipado || 50;
        valorAntecipado = (agendamento.valor || 0) * (percentualAntecipado / 100);
      }
      
      console.log('💸 Valor antecipado:', valorAntecipado);
      setPaymentAmount(valorAntecipado);

      console.log('🎯 GERANDO PIX VIA MERCADO PAGO - 100% SEGURO');
      
      // Gerar código PIX via Mercado Pago diretamente
      const { data: response, error: pixError } = await supabase.functions.invoke('create-pix-preference', {
        body: {
          amount: valorAntecipado,
          description: `Agendamento ${agendamento.id}`,
          userId: ownerId,
          agendamentoId: agendamento.id
        }
      });

      if (pixError) {
        console.error('❌ ERRO CRÍTICO na geração PIX:', pixError);
        throw new Error(`Erro ao gerar PIX: ${pixError.message}`);
      }
      
      if (!response?.pixCode) {
        console.error('❌ ERRO CRÍTICO: Resposta sem PIX code');
        throw new Error('Mercado Pago não conseguiu gerar código PIX. Verifique suas configurações.');
      }

      console.log('✅ PIX Code gerado via Mercado Pago com sucesso!');
      console.log('🎯 External Reference garantido:', agendamento.id);

      setPixCode(response.pixCode);
      await generateQRCode(response.pixCode);
      setShowPixPayment(true);

    } catch (error) {
      console.error("❌ Erro ao gerar pagamento PIX:", error);
      
      let errorMessage = "Não foi possível gerar o pagamento PIX.";
      
      if (error instanceof Error) {
        if (error.message.includes('verificações do Mercado Pago')) {
          errorMessage = 'Configure suas credenciais do Mercado Pago no dashboard.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro no PIX",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const handleCardPayment = () => {
    setShowCardForm(true);
  };

  const handleCardSuccess = () => {
    setShowCardForm(false);
    toast({
      title: "Pagamento confirmado! 🎉",
      description: "Agendamento atualizado com sucesso!",
    });
    
    // Notificar o componente pai para atualizar os dados
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  const paymentStatus = getPaymentStatus(agendamento.pagamentos);
  
  // Lógica de cancelamento para agendamentos confirmados (mantém regra de 2 dias)
  const canCancel = !agendamento.isPacoteMensal && canCancelAppointment(agendamento.data_hora) && 
                   (agendamento.status === 'agendado' || agendamento.status === 'confirmado');
  
  // Para agendamentos pendentes, sempre permitir cancelamento (independente do prazo e tipo)
  const canCancelPending = agendamento.status === 'pendente';

  // Mostrar formulário de cartão se solicitado (para agendamentos normais e pacotes mensais)
  if (showCardForm) {
    return (
      <>
        {/* Modal para pagamento com cartão */}
        {showCardForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="max-w-md w-full bg-gray-900 border border-gray-700 p-6 rounded-lg space-y-4">
              <MercadoPagoCardForm
                agendamentoId={agendamento.isPacoteMensal && agendamento.pacoteInfo?.agendamentosPacote ? agendamento.pacoteInfo.agendamentosPacote[0].id : agendamento.id}
                ownerId={ownerId}
                paymentAmount={agendamento.isPacoteMensal ? agendamento.valor || 0 : valorAntecipado || (agendamento.valor || 0) * 0.5}
                onSuccess={handleCardSuccess}
                onCancel={() => setShowCardForm(false)}
              />
            </div>
          </div>
        )}

        {/* Card do agendamento normal */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">
                {agendamento.servicos.nome}
              </CardTitle>
              <div className="flex items-center gap-2">
                {getStatusBadge(agendamento.status, agendamento.pagamentos)}
                {(canCancel || canCancelPending) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCancel(agendamento.id)}
                    disabled={isCancelling}
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    {isCancelling ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Data e Hora */}
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="h-4 w-4 text-gold-500" />
              <span>
                {format(new Date(agendamento.data_hora), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="h-4 w-4 text-gold-500" />
              <span>
                {format(new Date(agendamento.data_hora), 'HH:mm')} 
                ({agendamento.servicos.duracao} min)
              </span>
            </div>

            {/* Profissional */}
            <div className="flex items-center gap-2 text-gray-300">
              <User className="h-4 w-4 text-gold-500" />
              <span>{agendamento.profissionais.nome}</span>
              {agendamento.profissionais.especialidade && (
                <span className="text-gray-500">
                  - {agendamento.profissionais.especialidade}
                </span>
              )}
            </div>

            {/* Valor e Status do Pagamento */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <DollarSign className="h-4 w-4 text-gold-500" />
                <span>R$ {agendamento.valor?.toFixed(2)}</span>
              </div>
              <span className={`text-sm font-medium ${paymentStatus.color}`}>
                {paymentStatus.status}
              </span>
            </div>

            {/* Botão de Pagamento PIX para agendamentos pendentes */}
            {paymentStatus.status === 'Pendente' && (
              <div className="bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-yellow-500" />
                    <span className="text-yellow-300 font-medium">Pagamento pendente</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={generatePixPayment}
                      disabled={isGeneratingPayment}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
                    >
                      {isGeneratingPayment ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4 mr-2" />
                          PIX
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCardPayment}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-medium"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Cartão
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCancel(agendamento.id)}
                      disabled={isCancelling}
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      {isCancelling ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-yellow-400 mt-2">
                  Confirme seu agendamento escolhendo PIX ou cartão de crédito/débito
                </p>
              </div>
            )}

            {/* Observações */}
            {agendamento.observacoes && (
              <div className="flex items-start gap-2 text-gray-300">
                <MessageSquare className="h-4 w-4 text-gold-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{agendamento.observacoes}</span>
              </div>
            )}

            {/* Aviso sobre cancelamento - apenas para agendamentos normais */}
            {!canCancel && (agendamento.status === 'agendado' || agendamento.status === 'confirmado') && (
              <div className="text-xs text-amber-400 bg-amber-900/20 p-3 rounded border-l-4 border-amber-500">
                ⚠️ Cancelamento disponível apenas até 2 dias (48h) antes do agendamento
                <br />
                ℹ️ Para cancelar após esse prazo, entre em contato com o profissional
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  if (agendamento.isPacoteMensal && agendamento.pacoteInfo) {
    return (
      <>
        {/* Modal compacto para pagamento PIX */}
        <Dialog open={showPixPayment} onOpenChange={setShowPixPayment}>
          <DialogContent className="text-white max-w-md bg-gray-900 border-gray-700 p-20">
            <DialogHeader>
              <DialogTitle className="flex text-xl items-center justify-center mb-10 gap-2">
                <QrCode className="h-5 w-5 text-yellow-500" />
                Pagamento PIX
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
                <div className="text-2xl font-bold text-yellow-500 mb-2">
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
                  className="flex-1 border-gray-600 text-gray-900 hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                
                <Button
                  onClick={handleCopyCode}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
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

        <Card className="bg-gray-900 border-purple-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-purple-200 flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-400" />
                {agendamento.servicos.nome}
              </CardTitle>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-200 text-xs whitespace-nowrap">
                Pacote Mensal
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Valor Total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <DollarSign className="h-4 w-4 text-purple-400" />
                <span className="font-semibold">Valor Total: R$ {agendamento.pacoteInfo.valorTotal.toFixed(2)}</span>
              </div>
              <span className={`text-sm font-medium ${paymentStatus.color}`}>
                {paymentStatus.status}
              </span>
            </div>

            {/* Profissional */}
            <div className="flex items-center gap-2 text-gray-300">
              <User className="h-4 w-4 text-purple-400" />
              <span>{agendamento.profissionais.nome}</span>
              {agendamento.profissionais.especialidade && (
                <span className="text-gray-500">
                  - {agendamento.profissionais.especialidade}
                </span>
              )}
            </div>

            {/* Botão de Pagamento PIX para pacotes mensais pendentes */}
            {paymentStatus.status === 'Pendente' && (
              <div className="bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={generatePixPayment}
                      disabled={isGeneratingPayment}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
                    >
                      {isGeneratingPayment ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4 mr-2" />
                          PIX
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCardPayment}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-medium"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Cartão
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCancel(agendamento.id)}
                      disabled={isCancelling}
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      {isCancelling ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-yellow-400 mt-2">
                  Faça o pagamento para confirmar seus agendamentos
                </p>
              </div>
            )}

            {/* Lista dos 4 agendamentos */}
            <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-purple-200 font-semibold mb-3 flex items-center gap-2 flex-wrap">
                <Calendar className="h-4 w-4" />
                Suas Sessões Agendadas:
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 ml-2">
                {agendamento.pacoteInfo.sessoesCanceladas ? (
                  <Badge variant="destructive" className="text-xs">
                    {agendamento.pacoteInfo.sessoesCanceladas} sessão(ões) cancelada(s)
                  </Badge>
                ) : null}
                    {agendamento.pacoteInfo.sessoesConcluidas ? (
                  <Badge className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/50">
                    {agendamento.pacoteInfo.sessoesConcluidas} sessão(ões) concluída(s)
                  </Badge>
                  ) : null}
                </div>
              </h4>
              <div className="space-y-2">
                {agendamento.pacoteInfo.agendamentosPacote?.map((sessao, index) => (
                  <div key={sessao.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${
                    sessao.status === 'cancelado' ? 'bg-red-900/20 border-l-4 border-red-500/50' : 
                    sessao.status === 'concluido' ? 'bg-blue-900/20 border-l-4 border-blue-500/50' :  // ← NOVA CONDIÇÃO
                    'bg-gray-700/30'
                  } rounded p-2 gap-2`}>
                    <div className="flex items-center gap-2">
                      <span className={`${
                        sessao.status === 'cancelado' ? 'bg-red-500/20 text-red-300' : 
                        sessao.status === 'concluido' ? 'bg-blue-500/20 text-blue-300' :  // ← NOVA CONDIÇÃO
                        'bg-purple-500/20 text-purple-200'
                      } px-2 py-1 rounded text-xs font-medium whitespace-nowrap`}>

                        Sessão {index + 1}
                      </span>
                      <span className="text-gray-300 text-sm">
                        {format(new Date(sessao.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sessao.status === 'cancelado' ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            Cancelada
                          </Badge>
                          <span className="text-xs text-red-300 italic">
                            Sessão indicativa
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span className="text-sm">{format(new Date(sessao.data_hora), 'HH:mm')}</span>
                          </div>
                          <span className="text-xs text-purple-300 italic">
                            Sessão indicativa
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mensagem específica para pacotes mensais - apenas se não for pendente */}
            {agendamento.status !== 'pendente' && (
              <div className="text-xs text-purple-300 bg-purple-900/20 p-3 rounded border-l-4 border-purple-500">
                📦 Pacote mensal confirmado não pode ser cancelado pelo cliente
                <br />
                ℹ️ Em caso de imprevisto, entrar em contato com o profissional
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Modal compacto para pagamento PIX */}
      <Dialog open={showPixPayment} onOpenChange={setShowPixPayment}>
        <DialogContent className="text-white max-w-md bg-gray-900 border-gray-700 p-20">
          <DialogHeader>
            <DialogTitle className="flex text-xl items-center justify-center mb-10 gap-2">
              <QrCode className="h-5 w-5 text-yellow-500" />
              Pagamento PIX
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
              <div className="text-2xl font-bold text-yellow-500 mb-2">
                R$ {paymentAmount.toFixed(2)}
              </div>
              <p className="text-gray-400 text-sm">
                Pagamento antecipado
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
                  Escaneie o QR Code ou copie o código
                </p>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPixPayment(false)}
                className="flex-1 border-gray-600 text-gray-900 hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <Button
                onClick={handleCopyCode}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">
              {agendamento.servicos.nome}
            </CardTitle>
            <div className="flex items-center gap-3">
              {getStatusBadge(agendamento.status, agendamento.pagamentos)}
              {(canCancel || canCancelPending) && (
                <Button               
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(agendamento.id)}
                  disabled={isCancelling}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  {isCancelling ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Cancelar
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data e Hora */}
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="h-4 w-4 text-gold-500" />
            <span>
              {format(new Date(agendamento.data_hora), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="h-4 w-4 text-gold-500" />
            <span>
              {format(new Date(agendamento.data_hora), 'HH:mm')} 
              ({agendamento.servicos.duracao} min)
            </span>
          </div>

          {/* Profissional */}
          <div className="flex items-center gap-2 text-gray-300">
            <User className="h-4 w-4 text-gold-500" />
            <span>{agendamento.profissionais.nome}</span>
            {agendamento.profissionais.especialidade && (
              <span className="text-gray-500">
                - {agendamento.profissionais.especialidade}
              </span>
            )}
          </div>

          {/* Valor e Status do Pagamento */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-300">
              <DollarSign className="h-4 w-4 text-gold-500" />
              <span>R$ {agendamento.valor?.toFixed(2)}</span>
            </div>
            <span className={`text-sm font-medium ${paymentStatus.color}`}>
              {paymentStatus.status}
            </span>
          </div>

          {/* Botão de Pagamento PIX para agendamentos pendentes */}
          {paymentStatus.status === 'Pendente' && (
            <div className="bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={generatePixPayment}
                    disabled={isGeneratingPayment}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
                  >
                    {isGeneratingPayment ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        PIX
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCardPayment}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Cartão
                  </Button>
                </div>
              </div>
              <p className="text-xs text-yellow-400 mt-2">
                Faça o pagamento para confirmar seu agendamento
              </p>
            </div>
          )}

          {/* Observações */}
          {agendamento.observacoes && (
            <div className="flex items-start gap-2 text-gray-300">
              <MessageSquare className="h-4 w-4 text-gold-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{agendamento.observacoes}</span>
            </div>
          )}

          {/* Aviso sobre cancelamento - apenas para agendamentos normais */}
          {!canCancel && (agendamento.status === 'agendado' || agendamento.status === 'confirmado') && (
            <div className="text-xs text-gold-500 bg-amber-900/20 p-3 rounded border-l-4 border-amber-500">
              ⚠️ Cancelamento disponível apenas 2 dias (48h) antes do agendamento
              <div className="mt-1"> ℹ️ Para cancelar após esse prazo, entre em contato com o profissional</div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AppointmentCard;