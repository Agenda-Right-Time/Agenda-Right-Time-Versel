import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useClientOnlyAuth } from '@/hooks/useClientOnlyAuth';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySlug } from '@/hooks/useCompanySlug';
import AgendamentoHeader from '@/components/agendamento/AgendamentoHeader';
import EstablishmentHeader from '@/components/agendamento/EstablishmentHeader';
import ProgressIndicator from '@/components/agendamento/ProgressIndicator';
import ServicoSelector from '@/components/agendamento/ServicoSelector';
import ProfissionalSelector from '@/components/agendamento/ProfissionalSelector';
import CalendarioHorarios from '@/components/agendamento/CalendarioHorarios';
import ConfirmacaoAgendamento from '@/components/agendamento/ConfirmacaoAgendamento';
import PacoteMensalSelector from '@/components/agendamento/PacoteMensalSelector';
import ConfirmacaoPacoteMensal from '@/components/agendamento/ConfirmacaoPacoteMensal';
import PagamentoPix from '@/components/agendamento/PagamentoPix';
import PaymentSuccess from '@/components/agendamento/PaymentSuccess';
import ClientDashboard from '@/components/client/ClientDashboard';
import ClientAuth from '@/components/client/ClientAuth';
import ClienteForm from '@/components/agendamento/ClienteForm';
import GlobalPaymentListener from '@/components/GlobalPaymentListener';
import { Calendar } from 'lucide-react';
// Importação do provider de tema cliente
import { GlobalThemeProvider, useTheme } from '@/hooks/useThemeManager';


interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao: string;
}

interface Profissional {
  id: string;
  nome: string;
  especialidade: string;
}

interface Cliente {
  nome: string;
  telefone: string;
  email: string;
}

// Componente interno que usa o tema
const AgendamentoContent = () => {
  // TODOS OS HOOKS DEVEM SER DECLARADOS PRIMEIRO
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { empresaSlug, ownerId, loading: slugLoading, error: slugError } = useCompanySlug();
  const { user: loggedUser } = useAuth();
  const { toast } = useToast();
  
  // Hook para gerenciar o tema do cliente (agendamento + dashboard)
  const { isLightTheme } = useTheme();
  
  // Estados
  const [step, setStep] = useState(1);
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [selectedDateTimes, setSelectedDateTimes] = useState<Date[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [agendamentoId, setAgendamentoId] = useState<string>('');
  const [pixCode, setPixCode] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [isPacoteMensal, setIsPacoteMensal] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [cliente, setCliente] = useState<Cliente>({ nome: '', telefone: '', email: '' });
  const [currentClienteId, setCurrentClienteId] = useState<string>(''); // Para armazenar o ID do cliente atual
  
  // Variáveis computadas
  const showDashboard = searchParams.has('dashboard') || searchParams.has('tab');
  const finalOwnerId = ownerId;
  const isOwnerAccessing = loggedUser && finalOwnerId === loggedUser.id;
  
  // Hook useClientOnlyAuth sempre deve ser chamado, mas com parâmetro condicional
  const { user, clientProfile, loading: authLoading, ownerHasAccess, hasAccessToThisProfessional } = useClientOnlyAuth(
    !isOwnerAccessing ? empresaSlug : undefined
  );

  // Função para verificar se é um UUID válido
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Funções de fetch devem ser declaradas ANTES dos useEffect com useCallback
  const fetchConfig = useCallback(async () => {
    if (!finalOwnerId || !isValidUUID(finalOwnerId)) return;
    
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', finalOwnerId)
        .single();
      
      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  }, [finalOwnerId]);

  const fetchServicos = useCallback(async () => {
    if (!finalOwnerId || !isValidUUID(finalOwnerId)) return;
    
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('user_id', finalOwnerId)
        .eq('ativo', true)
        .order('created_at');
      
      if (error) throw error;
      setServicos(data || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  }, [finalOwnerId]);

  const fetchProfissionais = useCallback(async () => {
    if (!finalOwnerId || !isValidUUID(finalOwnerId)) return;
    
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('*')
        .eq('user_id', finalOwnerId)
        .eq('ativo', true);
      
      if (error) throw error;
      setProfissionais(data || []);
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    }
  }, [finalOwnerId]);

  // TODOS OS useEffect DEVEM VIR ANTES DE QUALQUER EARLY RETURN
  useEffect(() => {
    if (finalOwnerId && isValidUUID(finalOwnerId)) {
      // UUID válido - buscar dados reais
      fetchServicos();
      fetchProfissionais();
      fetchConfig();
    } else {
      // UUID inválido - limpar dados
      console.log('📋 ID inválido, não carregando dados:', finalOwnerId);
      setServicos([]);
      setProfissionais([]);
      setConfig(null);
    }
  }, [finalOwnerId, fetchServicos, fetchProfissionais, fetchConfig]);

  // Reset completo quando o parâmetro reset=true estiver presente
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') {
      console.log('🔄 Forçando reset completo do agendamento');
      setStep(1);
      setServicoSelecionado(null);
      setProfissionalSelecionado(null);
      setSelectedDateTime(null);
      setSelectedDateTimes([]);
      setIsPacoteMensal(false);
      setObservacoes('');
      setAgendamentoId('');
      setPixCode('');
      setPaymentAmount(0);
      
      // Remove o parâmetro reset da URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('reset');
      const newUrl = newParams.toString() 
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // Preencher dados do cliente se logado
  useEffect(() => {
    if (clientProfile) {
      setCliente({
        nome: clientProfile.nome || '',
        telefone: clientProfile.telefone || '',
        email: clientProfile.email || ''
      });
    } else if (loggedUser) {
      // Se for profissional logado, usar dados do perfil
      setCliente({
        nome: loggedUser.user_metadata?.nome || '',
        telefone: loggedUser.user_metadata?.telefone || loggedUser.phone || '',
        email: loggedUser.email || ''
      });
    }
  }, [clientProfile, loggedUser]);

  // Loading states - aguardar tanto slug quanto auth
  if (slugLoading || authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isLightTheme 
          ? 'bg-white text-black' // Tema claro - fundo branco com texto escuro
          : 'bg-black text-white' // Tema escuro - mantém o original
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Verificar se cliente tem acesso a este profissional específico
  console.log('🔍 [DEBUG AGENDAMENTO] Estado de verificação:', { 
    isOwnerAccessing, 
    user: !!user, 
    clientProfile: !!clientProfile, 
    hasAccessToThisProfessional,
    empresaSlug,
    finalOwnerId,
    authLoading,
    slugLoading
  });
  
  if (!isOwnerAccessing && user && clientProfile && hasAccessToThisProfessional === false) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isLightTheme 
          ? 'bg-white text-black' // Tema claro - fundo branco com texto escuro
          : 'bg-black text-white' // Tema escuro - mantém o original
      }`}>
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Acesso Negado</h1>
          <p className="text-gray-400 mb-4">
            Você não tem acesso a este profissional. Cada cliente é específico para o profissional que forneceu o link de cadastro.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Se deseja agendar com este profissional, você precisa criar uma nova conta usando o link fornecido por ele.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gold-gradient text-black px-6 py-2 rounded font-semibold"
            >
              Voltar ao Início
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="w-full bg-gray-600 text-white px-6 py-2 rounded font-semibold"
            >
              Fazer Novo Cadastro
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Se é dashboard do cliente, renderizar ClientDashboard (já tem tema aplicado)
  if (showDashboard) {
    return <ClientDashboard ownerId={finalOwnerId || ''} onNewAppointment={() => navigate(`/${empresaSlug}`)} />;
  }

  const createPacoteMensalAgendamentos = async () => {
    if (!servicoSelecionado || !profissionalSelecionado || selectedDateTimes.length !== 4) {
      toast({
        title: "Erro",
        description: "Selecione todas as 4 datas e horários para o pacote mensal.",
        variant: "destructive"
      });
      return;
    }

    // Auto-preencher dados se estiver logado
    const clienteData = {
      nome: cliente.nome || clientProfile?.nome || loggedUser?.user_metadata?.nome || 'Cliente',
      telefone: cliente.telefone || clientProfile?.telefone || loggedUser?.user_metadata?.telefone || loggedUser?.phone || '(00) 00000-0000',
      email: cliente.email || clientProfile?.email || loggedUser?.email || ''
    };

    setIsLoading(true);
    
    try {
      console.log('🔄 Iniciando criação do pacote mensal...');
      
      // Buscar ou criar cliente
      let clienteId = clientProfile?.id;
      
      if (!clienteId) {
        // Cliente não logado - buscar por email se fornecido, senão criar
        if (clienteData.email.trim()) {
          const { data: existingCliente } = await supabase
            .from('cliente_profiles')
            .select('id')
            .eq('email', clienteData.email)
            .maybeSingle();

          if (existingCliente) {
            clienteId = existingCliente.id;
            setCurrentClienteId(existingCliente.id); // Armazenar o ID do cliente
            console.log('✅ Cliente existente encontrado:', clienteId);
            
            // Garantir associação com o profissional
            const { error: associationError } = await supabase
              .from('cliente_profissional_associations')
              .upsert({
                cliente_id: existingCliente.id,
                profissional_id: finalOwnerId
              }, {
                onConflict: 'cliente_id,profissional_id'
              });

            if (associationError) {
              console.error('❌ Erro ao criar/atualizar associação:', associationError);
            }

            // Atualizar o campo profissional_vinculado
            await supabase
              .from('cliente_profiles')
              .update({ profissional_vinculado: finalOwnerId })
              .eq('id', existingCliente.id);
          }
        }

        if (!clienteId) {
          console.log('📝 Criando novo cliente...');
          const { data: novoCliente, error: clienteError } = await supabase
            .from('cliente_profiles')
            .insert({
              nome: clienteData.nome,
              email: clienteData.email || null,
              telefone: clienteData.telefone,
              profissional_vinculado: finalOwnerId
            })
            .select('id')
            .single();

          if (clienteError) {
            console.error("❌ Erro ao criar cliente:", clienteError);
            throw clienteError;
          }

          // Criar associação
          const { error: associationError } = await supabase
            .from('cliente_profissional_associations')
            .insert({
              cliente_id: novoCliente.id,
              profissional_id: finalOwnerId
            });

          if (associationError) {
            console.error('❌ Erro ao criar associação:', associationError);
          }

          clienteId = novoCliente.id;
          setCurrentClienteId(novoCliente.id); // Armazenar o ID do cliente
          console.log('✅ Cliente criado e associado ao profissional:', clienteId);
        }
      }

      // Gerar ID único para o pacote
      const pacoteId = `PMT${Date.now()}`;

      // Criar os 4 agendamentos
      const agendamentosData = selectedDateTimes.map((dateTime, index) => ({
        user_id: finalOwnerId,
        cliente_id: clienteId,
        cliente_email: clienteData.email || null,
        servico_id: servicoSelecionado.id,
        profissional_id: profissionalSelecionado.id,
        data_hora: dateTime.toISOString(),
        status: 'pendente',
        valor: servicoSelecionado.preco / 4,
        observacoes: `${observacoes || ''} - PACOTE MENSAL ${pacoteId} - Sessão ${index + 1}/4`.trim()
      }));

      console.log('📅 Criando agendamentos do pacote...', agendamentosData);

      const { data: agendamentos, error: agendamentoError } = await supabase
        .from('agendamentos')
        .insert(agendamentosData)
        .select('id');

      if (agendamentoError) {
        console.error("❌ Erro ao criar agendamentos:", agendamentoError);
        throw agendamentoError;
      }

      console.log('✅ Agendamentos criados:', agendamentos);
      
      const primeiroAgendamentoId = agendamentos[0].id;
      setAgendamentoId(primeiroAgendamentoId);
      
      toast({
        title: "Pacote mensal criado! 🎉",
        description: "Aguardando pagamento para confirmar seus 4 agendamentos."
      });

      await generatePixPaymentPacoteMensal(primeiroAgendamentoId, servicoSelecionado.preco, pacoteId);
      
    } catch (error) {
      console.error("❌ Erro completo:", error);
      toast({
        title: "Erro",
        description: `Não foi possível criar o pacote mensal: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePixPaymentPacoteMensal = async (agendamentoId: string, valorTotal: number, pacoteId: string) => {
    try {
      console.log('💰 Gerando pagamento PIX para pacote mensal (100%)...');
      
      const valorAntecipado = valorTotal;
      
      console.log('💸 Valor total do pacote:', valorAntecipado);
      
      setPaymentAmount(valorAntecipado);

      const { data: profile, error: profileError } = await supabase
        .from('profissional_profiles')
        .select('nome, empresa')
        .eq('id', finalOwnerId)
        .single();

      if (profileError) {
        console.error('⚠️ Erro ao buscar perfil:', profileError);
      }

      const merchantName = profile?.empresa || profile?.nome || 'PRESTADOR SERVICOS';
      console.log('🏪 Nome do comerciante:', merchantName);

      const { generateSimplePixCode } = await import('@/utils/pixGenerator');
      
      const pixCode = await generateSimplePixCode({
        amount: valorAntecipado,
        description: `PACOTE MENSAL ${pacoteId}`,
        merchantName: merchantName,
        userId: finalOwnerId,
        agendamentoId: agendamentoId // 🎯 CRÍTICO: Garantir external_reference
      });

      console.log('🔑 PIX Code gerado com sucesso');

      const { data: pagamento, error: pagamentoError } = await supabase
        .from('pagamentos')
        .insert({
          agendamento_id: agendamentoId,
          valor: valorAntecipado,
          percentual: 100,
          status: 'pendente',
          user_id: finalOwnerId,
          pix_code: pixCode
        })
        .select('id')
        .single();

      if (pagamentoError) {
        console.error('❌ Erro ao criar pagamento:', pagamentoError);
        throw pagamentoError;
      }

      console.log('✅ Pagamento criado:', pagamento.id);
      setPixCode(pixCode);
      setStep(5);

    } catch (error) {
      console.error("❌ Erro ao gerar pagamento PIX:", error);
      toast({
        title: "Erro",
        description: `Não foi possível gerar o pagamento PIX: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const createAgendamento = async () => {
    // Se não for UUID válido, não permitir agendamento
    if (!isValidUUID(finalOwnerId)) {
      console.log('📋 ID inválido, não é possível criar agendamento:', finalOwnerId);
      
      toast({
        title: "Erro",
        description: "Não é possível criar agendamento. Usuário inválido.",
        variant: "destructive"
      });
      
      return;
    }

    if (!servicoSelecionado || !profissionalSelecionado || !selectedDateTime) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    // Auto-preencher dados se estiver logado
    const clienteData = {
      nome: cliente.nome || clientProfile?.nome || loggedUser?.user_metadata?.nome || 'Cliente',
      telefone: cliente.telefone || clientProfile?.telefone || loggedUser?.user_metadata?.telefone || loggedUser?.phone || '(00) 00000-0000',
      email: cliente.email || clientProfile?.email || loggedUser?.email || ''
    };

    setIsLoading(true);
    
    try {
      console.log('🔄 Iniciando criação do agendamento...');
      
      const dataHora = new Date(selectedDateTime);
      const [hours, minutes] = selectedDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).split(':');
      dataHora.setHours(parseInt(hours, 10));
      dataHora.setMinutes(parseInt(minutes, 10));
      dataHora.setSeconds(0);
      dataHora.setMilliseconds(0);

      // Buscar ou criar cliente
      let clienteId = clientProfile?.id;
      
      if (!clienteId) {
        // Cliente não logado - buscar por email se fornecido, senão criar
        if (clienteData.email.trim()) {
          const { data: existingCliente } = await supabase
            .from('cliente_profiles')
            .select('id')
            .eq('email', clienteData.email)
            .maybeSingle();

          if (existingCliente) {
            clienteId = existingCliente.id;
            setCurrentClienteId(existingCliente.id); // Armazenar o ID do cliente
            console.log('✅ Cliente existente encontrado:', clienteId);
            
            // Garantir associação com o profissional
            const { error: associationError } = await supabase
              .from('cliente_profissional_associations')
              .upsert({
                cliente_id: existingCliente.id,
                profissional_id: finalOwnerId
              }, {
                onConflict: 'cliente_id,profissional_id'
              });

            if (associationError) {
              console.error('❌ Erro ao criar/atualizar associação:', associationError);
            }

            // Atualizar o campo profissional_vinculado
            await supabase
              .from('cliente_profiles')
              .update({ profissional_vinculado: finalOwnerId })
              .eq('id', existingCliente.id);
          }
        }

        if (!clienteId) {
          console.log('📝 Criando novo cliente...');
          const { data: novoCliente, error: clienteError } = await supabase
            .from('cliente_profiles')
            .insert({
              nome: clienteData.nome,
              email: clienteData.email || null,
              telefone: clienteData.telefone,
              profissional_vinculado: finalOwnerId
            })
            .select('id')
            .single();

          if (clienteError) {
            console.error("❌ Erro ao criar cliente:", clienteError);
            throw clienteError;
          }

          // Criar associação
          const { error: associationError } = await supabase
            .from('cliente_profissional_associations')
            .insert({
              cliente_id: novoCliente.id,
              profissional_id: finalOwnerId
            });

          if (associationError) {
            console.error('❌ Erro ao criar associação:', associationError);
          }

          clienteId = novoCliente.id;
          setCurrentClienteId(novoCliente.id); // Armazenar o ID do cliente
          console.log('✅ Cliente criado e associado ao profissional:', clienteId);
        }
      }

      // Criar agendamento
      console.log('📅 Criando agendamento...');
      const agendamentoData = {
        user_id: finalOwnerId,
        cliente_id: clienteId,
        cliente_email: clienteData.email || null,
        servico_id: servicoSelecionado.id,
        profissional_id: profissionalSelecionado.id,
        data_hora: dataHora.toISOString(),
        status: 'pendente',
        valor: servicoSelecionado.preco,
        observacoes: observacoes || null
      };

      console.log('📊 Dados do agendamento:', agendamentoData);

      const { data: agendamento, error: agendamentoError } = await supabase
        .from('agendamentos')
        .insert(agendamentoData)
        .select('id')
        .single();

      if (agendamentoError) {
        console.error("❌ Erro ao criar agendamento:", agendamentoError);
        throw agendamentoError;
      }

      console.log('✅ Agendamento criado:', agendamento.id);
      setAgendamentoId(agendamento.id);
      
      toast({
        title: "Agendamento criado! 🎉",
        description: "Gerando pagamento PIX..."
      });

      // Gerar pagamento PIX
      await generatePixPayment(agendamento.id, servicoSelecionado.preco);
      
    } catch (error) {
      console.error("❌ Erro completo:", error);
      toast({
        title: "Erro",
        description: `Não foi possível criar o agendamento: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePixPayment = async (agendamentoId: string, valorTotal: number) => {
    try {
      console.log('💰 Gerando pagamento PIX...');
      console.log('🆔 Owner ID:', finalOwnerId);
      console.log('📊 Valor total:', valorTotal);
      
      // Buscar configuração do percentual
      const { data: configuracao, error: configError } = await supabase
        .from('configuracoes')
        .select('percentual_antecipado')
        .eq('user_id', finalOwnerId)
        .single();

      if (configError) {
        console.error('⚠️ Erro ao buscar configuração:', configError);
      }

      const percentualAntecipado = configuracao?.percentual_antecipado || 50;
      const valorAntecipado = valorTotal * (percentualAntecipado / 100);
      
      console.log('📊 Porcentagem configurada:', percentualAntecipado + '%');
      console.log('💸 Valor antecipado:', valorAntecipado);
      
      setPaymentAmount(valorAntecipado);

      // Buscar dados do perfil para o nome do comerciante
      const { data: profile, error: profileError } = await supabase
        .from('profissional_profiles')
        .select('nome, empresa')
        .eq('id', finalOwnerId)
        .single();

      if (profileError) {
        console.error('⚠️ Erro ao buscar perfil:', profileError);
      }

      const merchantName = profile?.empresa || profile?.nome || 'PRESTADOR SERVICOS';
      console.log('🏪 Nome do comerciante:', merchantName);

      // Verificar se tem chave PIX configurada
      console.log('🔍 Verificando chave PIX do usuário...');
      
      const { generateSimplePixCode } = await import('@/utils/pixGenerator');
      
      const pixCode = await generateSimplePixCode({
        amount: valorAntecipado,
        description: `Agendamento ${agendamentoId}`,
        merchantName: merchantName,
        userId: finalOwnerId,
        agendamentoId: agendamentoId // 🎯 CRÍTICO: Garantir external_reference
      });

      console.log('🔑 PIX Code gerado com sucesso');

      // Criar registro de pagamento
      const { data: pagamento, error: pagamentoError } = await supabase
        .from('pagamentos')
        .insert({
          agendamento_id: agendamentoId,
          valor: valorAntecipado,
          percentual: percentualAntecipado,
          status: 'pendente',
          user_id: finalOwnerId,
          pix_code: pixCode,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
        })
        .select('id')
        .single();

      if (pagamentoError) {
        console.error('❌ Erro ao criar pagamento:', pagamentoError);
        throw pagamentoError;
      }

      console.log('✅ Pagamento criado:', pagamento.id);
      setPixCode(pixCode);
      setStep(5);

    } catch (error) {
      console.error("❌ Erro ao gerar pagamento PIX:", error);
      console.error("❌ Tipo do erro:", typeof error);
      console.error("❌ Erro completo:", JSON.stringify(error, null, 2));
      
      let errorMessage = "Não foi possível gerar o pagamento PIX.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Erro no PIX",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Voltar para confirmação em caso de erro
      setStep(4);
    }
  };

  const handleNewAppointment = () => {
    // Reset do estado para novo agendamento
    setStep(1);
    setServicoSelecionado(null);
    setProfissionalSelecionado(null);
    setSelectedDateTime(null);
    setSelectedDateTimes([]);
    setIsPacoteMensal(false);
    setCliente({ nome: '', telefone: '', email: '' });
    setObservacoes('');
    
    // Navegar para a tela de seleção de serviços (sem replace para permitir histórico)
    if (empresaSlug) {
      navigate(`/${empresaSlug}`, { replace: true });
    } else {
      navigate(`/agendamento?owner=${finalOwnerId}`, { replace: true });
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleBackToAppointment = () => {
    setStep(4);
  };

  const handleDateTimeSelect = (dateTime: Date) => {
    setSelectedDateTime(dateTime);
    setStep(4);
  };

  const handlePacoteMensalDateTimeSelect = (dateTimes: Date[]) => {
    setSelectedDateTimes(dateTimes);
  };

  // Função corrigida para ir para a área do cliente - SEM duplicar parâmetros
  const handleGoToClientArea = () => {
    if (empresaSlug) {
      navigate(`/${empresaSlug}?dashboard=true&tab=meus-agendamentos`, { replace: true });
    } else {
      navigate(`/agendamento?owner=${finalOwnerId}&dashboard=true&tab=meus-agendamentos`, { replace: true });
    }
  };

  // Mostrar loading enquanto resolve o slug
  if (slugLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
          <span className="ml-3">Carregando estabelecimento...</span>
        </div>
      </div>
    );
  }

  // Mostrar erro se houver erro ao resolver o slug
  if (slugError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Erro</h1>
          <p className="text-gray-400">{slugError}</p>
        </div>
      </div>
    );
  }

  if (!finalOwnerId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Estabelecimento não encontrado</h1>
          <p className="text-gray-400">O estabelecimento que você está procurando não foi encontrado.</p>
        </div>
      </div>
    );
  }

  // Mostrar loading apenas se for UUID válido E não for o dono acessando
  if (authLoading && isValidUUID(finalOwnerId) && !isOwnerAccessing) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
          <span className="ml-3">Carregando...</span>
        </div>
      </div>
    );
  }

  // Se o prestador não tem acesso ativo, mostrar mensagem APENAS se for cliente acessando (não o dono)
  if (!isOwnerAccessing && isValidUUID(finalOwnerId) && ownerHasAccess === false) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Estabelecimento Inativo</h1>
          <p className="text-gray-400 mb-6">
            Este estabelecimento está temporariamente inativo. 
            Tente novamente mais tarde.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // AUTENTICAÇÃO OBRIGATÓRIA: Se não está logado E não é o dono acessando, exigir login do cliente
  if (!user && !isOwnerAccessing) {
    console.log('🔑 Exigindo autenticação obrigatória do cliente para agendamento');
    return <ClientAuth />;
  }

  // Mostrar dashboard se logado e requisitado
  if (user && showDashboard) {
    return (
      <ClientDashboard 
        ownerId={empresaSlug || finalOwnerId || ''} 
        onNewAppointment={handleNewAppointment}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isLightTheme 
        ? 'bg-white text-black' // Tema claro - fundo branco com texto escuro
        : 'bg-black text-white' // Tema escuro - mantém o original
    }`}>
      {/* Listener GLOBAL - funciona em qualquer tela, incluindo PIX! */}
      <GlobalPaymentListener ownerId={finalOwnerId || ''} />
      
      <AgendamentoHeader
        businessName="Agenda Right Time"
        showClientDashboard={!!user}
        onShowDashboard={handleGoToClientArea}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Mostrar mensagem quando não há dados reais */}
        {!isValidUUID(finalOwnerId) && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm font-medium">
                ⚠️ USUÁRIO INVÁLIDO
              </span>
            </div>
            <p className="text-gray-300 text-sm mt-1">
              Não é possível acessar esta página com ID inválido. Entre em contato com o estabelecimento.
            </p>
          </div>
        )}
        
        {/* Mostrar mensagem quando não há dados configurados */}
        {isValidUUID(finalOwnerId) && (servicos.length === 0 || profissionais.length === 0) && (
          <div className={`${isLightTheme ? 'bg-yellow-900/10 border-gold-800 text-black' : 'bg-yellow-900/20 border-yellow-500/30 text-gray-300'} mb-6 border rounded-lg p-4`}>



            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-sm font-medium">
                📋 CONFIGURAÇÕES PENDENTES
              </span>
            </div>
            <p className="text-sm mt-1">
              Este estabelecimento ainda não configurou serviços ou profissionais. Entre em contato para mais informações.
            </p>
          </div>
        )}

        {/* Botão Meus Agendamentos - ROTA LIMPA */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={handleGoToClientArea}
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 transition-colors hover:opacity-90 text-xs sm:text-base"
          >
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Meus Agendamentos</span>
          </button>
        </div>

        <EstablishmentHeader ownerId={finalOwnerId || ''} />

        {step <= 5 && (
          <ProgressIndicator 
            currentStep={step} 
            totalSteps={5} 
            onBack={handleBackStep}
          />
        )}

        {step === 1 && (
          <ServicoSelector
            servicos={servicos}
            selectedServico={servicoSelecionado?.id || ''}
            onSelectServico={(servicoId) => {
              const servico = servicos.find(s => s.id === servicoId);
              if (servico) {
                setServicoSelecionado(servico);
                
                const isPacoteMensal = servico.nome.toLowerCase().includes('pacote') || 
                                     servico.descricao?.toLowerCase().includes('pacote');
                
                setIsPacoteMensal(isPacoteMensal);
                setStep(2);
              }
            }}
          />
        )}

        {step === 2 && (
          <ProfissionalSelector
            profissionais={profissionais}
            selectedProfissional={profissionalSelecionado?.id || ''}
            onSelectProfissional={(profissionalId) => {
              const profissional = profissionais.find(p => p.id === profissionalId);
              if (profissional) {
                setProfissionalSelecionado(profissional);
                setStep(3);
              }
            }}
          />
        )}

        {step === 3 && servicoSelecionado && profissionalSelecionado && (
          <>
            {isPacoteMensal ? (
              <PacoteMensalSelector
                ownerId={finalOwnerId || ''}
                servicoDuracao={servicoSelecionado.duracao}
                profissionalId={profissionalSelecionado?.id}
                onDateTimeSelect={handlePacoteMensalDateTimeSelect}
                selectedDateTimes={selectedDateTimes}
              />
            ) : (
              <CalendarioHorarios
                ownerId={finalOwnerId || ''}
                servicoDuracao={servicoSelecionado.duracao}
                profissionalId={profissionalSelecionado?.id}
                onDateTimeSelect={handleDateTimeSelect}
                selectedDateTime={selectedDateTime}
                isPacoteMensal={isPacoteMensal}
              />
            )}

            {isPacoteMensal && selectedDateTimes.length === 4 && (
              <div className="mt-6">
                <button
                  onClick={() => setStep(4)}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors"
                >
                  Continuar para Confirmação
                </button>
              </div>
            )}
          </>
        )}

        {step === 4 && servicoSelecionado && profissionalSelecionado && finalOwnerId && (
          <div className="max-w-2xl mx-auto">
            {isPacoteMensal && selectedDateTimes.length === 4 ? (
              <ConfirmacaoPacoteMensal
                selectedDateTimes={selectedDateTimes}
                selectedServico={servicoSelecionado.id}
                selectedProfissional={profissionalSelecionado.id}
                servicos={servicos}
                profissionais={profissionais}
                onConfirmar={!isValidUUID(finalOwnerId) ? () => {
                  toast({
                    title: "Pacote Simulado! 🎯",
                    description: "Este é apenas um exemplo. Conecte-se para agendamentos reais.",
                  });
                  setStep(6);
                } : createPacoteMensalAgendamentos}
                loading={isLoading}
                clienteNome={cliente.nome}
                observacoes={observacoes}
                onObservacoesChange={setObservacoes}
                ownerId={finalOwnerId || ''}
                clienteId={clientProfile?.id || currentClienteId}
              />
            ) : (
              selectedDateTime && (
                <ConfirmacaoAgendamento
                  selectedDate={selectedDateTime}
                  selectedTime={selectedDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  selectedServico={servicoSelecionado.id}
                  selectedProfissional={profissionalSelecionado.id}
                  servicos={servicos}
                  profissionais={profissionais}
                  onConfirmar={createAgendamento}
                  loading={isLoading}
                  clienteNome={cliente.nome}
                  observacoes={observacoes}
                  onObservacoesChange={setObservacoes}
                  ownerId={finalOwnerId || ''}
                  clienteId={clientProfile?.id || currentClienteId}
                />
              )
            )}
          </div>
        )}

        {step === 5 && agendamentoId && pixCode && (
          <PagamentoPix
            pixCode={pixCode}
            paymentAmount={paymentAmount}
            agendamentoId={agendamentoId}
            ownerId={finalOwnerId || ''}
            onPaymentConfirmed={() => {
              console.log('🎉 Pagamento confirmado!');
              setStep(6);
            }}
            onNewAppointment={handleNewAppointment}
            onBackToAppointment={handleBackToAppointment}
          />
        )}

        {step === 6 && (
          <PaymentSuccess
            onNewAppointment={handleNewAppointment}
            onBackToAppointments={handleGoToClientArea}
          />
        )}
      </div>
    </div>
  );
};

// Componente Agendamento com provider de tema cliente
const Agendamento = () => {
  return (
    <GlobalThemeProvider>
      <AgendamentoContent />
    </GlobalThemeProvider>
  );
};

export default Agendamento;
