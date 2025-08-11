import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Calendar, Wallet, RefreshCw, UserCheck } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/hooks/useThemeManager';

interface SaldoData {
  saldoDiario: number;
  saldoMensal: number;
  transacoesDiarias: number;
  transacoesMensais: number;
}

interface Professional {
  id: string;
  nome: string;
}

const SaldoManager = () => {
  const [saldo, setSaldo] = useState<SaldoData>({
    saldoDiario: 0,
    saldoMensal: 0,
    transacoesDiarias: 0,
    transacoesMensais: 0
  });
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isLightTheme } = useTheme();

  useEffect(() => {
    if (user?.id) {
      fetchProfessionals();
      fetchSaldoData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchSaldoData();
    }
  }, [selectedProfessional]);

  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('id, nome')
        .eq('user_id', user?.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error('❌ Erro ao buscar profissionais:', error);
    }
  };

  const fetchSaldoData = async () => {
    if (!user?.id) {
      console.error('❌ Usuário não encontrado para buscar saldo');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Buscando dados de saldo PIX para o usuário:', user.id);
      console.log('🧑‍💼 Profissional selecionado:', selectedProfessional);
      
      const hoje = new Date();
      const inicioHoje = startOfDay(hoje);
      const fimHoje = endOfDay(hoje);
      const inicioMes = startOfMonth(hoje);
      const fimMes = endOfMonth(hoje);

      // Primeiro, buscar TODOS os pagamentos PIX pagos do usuário
      let queryPagamentos = supabase
        .from('pagamentos')
        .select('*')
        .eq('status', 'pago')
        .eq('user_id', user.id);

      console.log('📊 Buscando todos os pagamentos PIX pagos...');

      // Buscar pagamentos do mês
      const { data: pagamentosMes, error: errorMensal } = await queryPagamentos
        .gte('created_at', inicioMes.toISOString())
        .lte('created_at', fimMes.toISOString());

      if (errorMensal) {
        console.error('❌ Erro ao buscar pagamentos mensais:', errorMensal);
        throw errorMensal;
      }

      // Buscar pagamentos do dia
      const { data: pagamentosDia, error: errorDiario } = await supabase
        .from('pagamentos')
        .select('*')
        .eq('status', 'pago')
        .eq('user_id', user.id)
        .gte('created_at', inicioHoje.toISOString())
        .lte('created_at', fimHoje.toISOString());

      if (errorDiario) {
        console.error('❌ Erro ao buscar pagamentos diários:', errorDiario);
        throw errorDiario;
      }

      console.log('💰 Pagamentos PIX encontrados do mês:', pagamentosMes?.length || 0);
      console.log('💰 Pagamentos PIX encontrados do dia:', pagamentosDia?.length || 0);
      console.log('📋 Detalhes pagamentos mês:', pagamentosMes);
      console.log('📋 Detalhes pagamentos dia:', pagamentosDia);

      // Se há um profissional específico selecionado, filtrar por agendamentos
      let pagamentosFiltradosMes = pagamentosMes || [];
      let pagamentosFiltradosDia = pagamentosDia || [];

      if (selectedProfessional !== 'todos') {
        console.log('🔍 Filtrando por profissional:', selectedProfessional);

        // Buscar agendamentos do profissional no mês
        const { data: agendamentosMes, error: errorAgendMes } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('profissional_id', selectedProfessional)
          .eq('user_id', user.id)
          .gte('created_at', inicioMes.toISOString())
          .lte('created_at', fimMes.toISOString());

        if (errorAgendMes) throw errorAgendMes;

        // Buscar agendamentos do profissional no dia
        const { data: agendamentosDia, error: errorAgendDia } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('profissional_id', selectedProfessional)
          .eq('user_id', user.id)
          .gte('created_at', inicioHoje.toISOString())
          .lte('created_at', fimHoje.toISOString());

        if (errorAgendDia) throw errorAgendDia;

        const agendamentoIdsMes = agendamentosMes?.map(a => a.id) || [];
        const agendamentoIdsDia = agendamentosDia?.map(a => a.id) || [];

        console.log('📅 Agendamentos do profissional no mês:', agendamentoIdsMes.length);
        console.log('📅 Agendamentos do profissional no dia:', agendamentoIdsDia.length);

        // Filtrar pagamentos pelos agendamentos do profissional
        pagamentosFiltradosMes = (pagamentosMes || []).filter(p => 
          p.agendamento_id && agendamentoIdsMes.includes(p.agendamento_id)
        );
        
        pagamentosFiltradosDia = (pagamentosDia || []).filter(p => 
          p.agendamento_id && agendamentoIdsDia.includes(p.agendamento_id)
        );

        console.log('💰 Pagamentos filtrados do mês:', pagamentosFiltradosMes.length);
        console.log('💰 Pagamentos filtrados do dia:', pagamentosFiltradosDia.length);
      }

      // Calcular totais
      const saldoDiario = pagamentosFiltradosDia.reduce((total, pagamento) => total + Number(pagamento.valor), 0);
      const saldoMensal = pagamentosFiltradosMes.reduce((total, pagamento) => total + Number(pagamento.valor), 0);

      console.log('✅ Dados de saldo PIX calculados:', {
        saldoDiario,
        saldoMensal,
        transacoesDiarias: pagamentosFiltradosDia.length,
        transacoesMensais: pagamentosFiltradosMes.length,
        profissionalFiltro: selectedProfessional
      });

      setSaldo({
        saldoDiario,
        saldoMensal,
        transacoesDiarias: pagamentosFiltradosDia.length,
        transacoesMensais: pagamentosFiltradosMes.length
      });

    } catch (error) {
      console.error('❌ Erro ao buscar dados de saldo PIX:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de saldo PIX.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Se não há usuário logado, mostrar mensagem
  if (!user?.id) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-900 border-gray-700 p-8 text-center">
          <h4 className="text-lg font-semibold mb-2">Acesso não autorizado</h4>
          <p className="text-gray-400">
            Você precisa estar logado para visualizar o saldo.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold">Meu Saldo PIX</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gray-900 border-gray-700">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-800 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-800 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const selectedProfessionalName = professionals.find(p => p.id === selectedProfessional)?.nome || 'Todos os Profissionais';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold">Meu Saldo PIX</h3>
          <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-sm`}>
            {selectedProfessional === 'todos' 
              ? 'Transações PIX de todos os profissionais' 
              : `Transações PIX de ${selectedProfessionalName}`
            }
          </p>
        </div>
        <Button
          onClick={fetchSaldoData}
          variant="outline"
          className="border-gray-600 w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filtro de Profissionais */}
      <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>       
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <UserCheck className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-5 w-5`} />
              <span className={`${isLightTheme ? 'text-gray-500' : 'text-white'} font-medium text-sm`}>Filtrar por Profissional:</span>              
            </div>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="bg-white border-gray-300 text-black w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300">
                <SelectItem value="todos" className="text-black hover:bg-gray-100">
                  Todos os Profissionais
                </SelectItem>
                {professionals.map((prof) => (
                  <SelectItem 
                    key={prof.id} 
                    value={prof.id} 
                    className="text-black hover:bg-gray-100"
                  >
                    {prof.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Saldo Diário */}
        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>         
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${isLightTheme ? 'text-black' : 'text-gray-400'} text-sm font-medium`}>
              Saldo PIX de Hoje
            </CardTitle>
            <Calendar className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-4 w-4`} />
          </CardHeader>
          <CardContent>
            <div className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} text-2xl font-bold`}>
              R$ {saldo.saldoDiario.toFixed(2)}
            </div>
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-xs mt-2`}>
              {saldo.transacoesDiarias} transação(ões) PIX hoje
            </p>
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-xs mt-2`}>
              {format(new Date(), 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        {/* Saldo Mensal */}
        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${isLightTheme ? 'text-black' : 'text-gray-400'} text-sm font-medium`}>
              Saldo PIX do Mês
            </CardTitle>
            <Wallet className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-4 w-4`} />
          </CardHeader>
          <CardContent>
            <div className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} text-2xl font-bold`}>
              R$ {saldo.saldoMensal.toFixed(2)}
            </div>
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-xs mt-2`}>             
              {saldo.transacoesMensais} transação(ões) PIX este mês
            </p>
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-xs mt-2`}>
              {format(new Date(), 'MMMM \'de\' yyyy', { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        {/* Ticket Médio Diário */}
        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${isLightTheme ? 'text-black' : 'text-gray-400'} text-sm font-medium`}>
              Ticket Médio PIX Diário
            </CardTitle>
            <DollarSign className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-4 w-4`} />
          </CardHeader>
          <CardContent>
            <div className={`${isLightTheme ? 'text-green-600' : 'text-green-400'} text-2xl font-bold`}>
              R$ {saldo.transacoesDiarias > 0 ? (saldo.saldoDiario / saldo.transacoesDiarias).toFixed(2) : '0.00'}
            </div>
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-xs mt-2`}>
              Valor médio por transação PIX hoje
            </p>
          </CardContent>
        </Card>

        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${isLightTheme ? 'text-black' : 'text-gray-400'} text-sm font-medium`}>
              Ticket Médio PIX Mensal
            </CardTitle>
            <DollarSign className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-4 w-4`} />
          </CardHeader>
          <CardContent>
            <div className={`${isLightTheme ? 'text-green-600' : 'text-green-400'} text-2xl font-bold`}>
              R$ {saldo.transacoesMensais > 0 ? (saldo.saldoMensal / saldo.transacoesMensais).toFixed(2) : '0.00'}
            </div>
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-xs mt-2`}>
              Valor médio por transação PIX este mês
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SaldoManager;
