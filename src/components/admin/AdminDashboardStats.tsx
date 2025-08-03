
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Crown, 
  CreditCard, 
  TrendingUp,
  DollarSign,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';

interface DashboardStats {
  totalProfissionais: number;
  profissionaisAtivos: number;
  profissionaisInativos: number;
  profissionaisEmTrial: number;
  assinaturasAtivas: number;
  assinaturasVencidas: number;
  assinaturasTotal: number;
  receitaMensal: number;
}

interface Assinatura {
  id: string;
  user_id: string;
  status: string;
  data_vencimento: string;
  trial_ate: string;
  preco: number;
  created_at: string;
}

interface Profile {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  tipo_usuario: string;
  created_at: string;
}

const AdminDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProfissionais: 0,
    profissionaisAtivos: 0,
    profissionaisInativos: 0,
    profissionaisEmTrial: 0,
    assinaturasAtivas: 0,
    assinaturasVencidas: 0,
    assinaturasTotal: 0,
    receitaMensal: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      console.log('🔍 [ADMIN STATS] Iniciando busca de estatísticas...');

      // Buscar todas as assinaturas primeiro
      console.log('💳 [ADMIN STATS] Buscando assinaturas via RPC...');
      const { data: assinaturasData, error: assinaturasError } = await supabase
        .rpc('get_all_assinaturas');

      if (assinaturasError) {
        console.error('❌ [ADMIN STATS] Erro na RPC get_all_assinaturas:', assinaturasError);
        throw assinaturasError;
      }

      const assinaturas = (assinaturasData || []) as Assinatura[];
      console.log(`✅ [ADMIN STATS] Encontradas ${assinaturas.length} assinaturas`);

      // Se não há assinaturas, retornar stats zeradas
      if (assinaturas.length === 0) {
        console.log('⚠️ [ADMIN STATS] Nenhuma assinatura encontrada - retornando stats zeradas');
        setStats({
          totalProfissionais: 0,
          profissionaisAtivos: 0,
          profissionaisInativos: 0,
          profissionaisEmTrial: 0,
          assinaturasAtivas: 0,
          assinaturasVencidas: 0,
          assinaturasTotal: 0,
          receitaMensal: 0
        });
        return;
      }

      // Extrair user_ids das assinaturas
      const userIds = assinaturas.map(ass => ass.user_id);

      // Buscar profiles baseado nos user_ids das assinaturas
      console.log('👥 [ADMIN STATS] Buscando profiles dos usuários com assinaturas...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profissional_profiles')
        .select('*')
        .in('id', userIds)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ [ADMIN STATS] Erro ao buscar profiles:', profilesError);
      }

      const profiles = (profilesData || []) as Profile[];
      console.log(`✅ [ADMIN STATS] Encontrados ${profiles.length} profiles com assinaturas`);

      // Processar estatísticas baseado nas assinaturas
      const agora = new Date();
      console.log(`⏰ [ADMIN STATS] Processando estatísticas (${agora.toISOString()})`);
      
      let profissionaisEmTrial = 0;
      let profissionaisAtivos = 0;
      let assinaturasAtivas = 0;
      let assinaturasVencidas = 0;

      // Criar mapa de profiles por user_id para facilitar lookup
      const profilesMap = new Map();
      profiles.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Processa cada assinatura para calcular as estatísticas
      console.log(`🔄 [ADMIN STATS] Processando ${assinaturas.length} assinaturas...`);
      
      assinaturas.forEach((assinatura: Assinatura, index: number) => {
        console.log(`\n💳 [${index + 1}/${assinaturas.length}] Processando assinatura: ${assinatura.id}`);
        
        const profile = profilesMap.get(assinatura.user_id);
        const vencimento = new Date(assinatura.data_vencimento);
        const trialAte = new Date(assinatura.trial_ate);
        
        console.log(`   👤 Usuário: ${profile?.nome || 'Não encontrado'} (${assinatura.user_id})`);
        console.log(`   💳 Status BD: ${assinatura.status}`);
        console.log(`   📅 Vencimento: ${vencimento.toLocaleDateString('pt-BR')}`);
        console.log(`   🔄 Trial até: ${trialAte.toLocaleDateString('pt-BR')}`);

        // LÓGICA CORRIGIDA DE STATUS:
        // 1. Se trial_ate > agora = TRIAL (independente do status no BD)
        // 2. Se trial_ate <= agora E vencimento > agora E status = 'ativa' = ATIVA
        // 3. Se trial_ate <= agora E (vencimento <= agora OU status != 'ativa') = VENCIDA/CANCELADA
        
        let statusReal = '';
        const isInTrial = trialAte > agora;
        const hasValidSubscription = vencimento > agora && assinatura.status === 'ativa';
        const isExpiredOrCancelled = !isInTrial && (!hasValidSubscription || assinatura.status === 'cancelada');

        if (isInTrial) {
          statusReal = 'trial';
          profissionaisEmTrial++;
          profissionaisAtivos++;
        } else if (hasValidSubscription) {
          statusReal = 'ativa';
          assinaturasAtivas++;
          profissionaisAtivos++;
        } else {
          statusReal = 'vencida/cancelada';
          assinaturasVencidas++;
        }

        console.log(`   ✨ Status real calculado: ${statusReal}`);
        console.log(`   🟢 Em trial: ${isInTrial}`);
        console.log(`   💰 Assinatura válida: ${hasValidSubscription}`);
        console.log(`   ❌ Vencida/Cancelada: ${isExpiredOrCancelled}`);
      });

      // Total de profissionais = total de assinaturas (cada assinatura representa um profissional)
      const totalProfissionais = assinaturas.length;
      const profissionaisInativos = totalProfissionais - profissionaisAtivos;
      const assinaturasTotal = assinaturas.length;
      const receitaMensal = assinaturasAtivas * 35.99;

      const statsCalculados = {
        totalProfissionais,
        profissionaisAtivos,
        profissionaisInativos,
        profissionaisEmTrial,
        assinaturasAtivas,
        assinaturasVencidas,
        assinaturasTotal,
        receitaMensal
      };

      console.log('\n📊 [ADMIN STATS] ESTATÍSTICAS FINAIS:');
      console.log(`- Total profissionais: ${statsCalculados.totalProfissionais}`);
      console.log(`- Profissionais ativos: ${statsCalculados.profissionaisAtivos}`);
      console.log(`- Profissionais inativos: ${statsCalculados.profissionaisInativos}`);
      console.log(`- Em trial: ${statsCalculados.profissionaisEmTrial}`);
      console.log(`- Total assinaturas: ${statsCalculados.assinaturasTotal}`);
      console.log(`- Assinaturas ativas: ${statsCalculados.assinaturasAtivas}`);
      console.log(`- Assinaturas vencidas: ${statsCalculados.assinaturasVencidas}`);
      console.log(`- Receita mensal: R$ ${statsCalculados.receitaMensal.toFixed(2)}`);
      
      setStats(statsCalculados);

    } catch (error) {
      console.error('❌ [ADMIN STATS] Erro geral:', error);
      setStats({
        totalProfissionais: 0,
        profissionaisAtivos: 0,
        profissionaisInativos: 0,
        profissionaisEmTrial: 0,
        assinaturasAtivas: 0,
        assinaturasVencidas: 0,
        assinaturasTotal: 0,
        receitaMensal: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold">Carregando estatísticas...</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-900 border-gray-700">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-700 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl sm:text-2xl font-bold">Visão Geral - Agenda Right Time</h3>
        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
          Sistema Ativo
        </Badge>
      </div>
      
      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total de Profissionais</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalProfissionais}</div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                <UserCheck className="h-3 w-3 mr-1" />
                {stats.profissionaisAtivos} ativos
              </Badge>
              {stats.profissionaisInativos > 0 && (
                <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                  <UserX className="h-3 w-3 mr-1" />
                  {stats.profissionaisInativos} inativos
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Profissionais em Trial</CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.profissionaisEmTrial}</div>
            <p className="text-xs text-orange-400 mt-2">
              Período de 7 dias gratuitos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Assinaturas</CardTitle>
            <Crown className="h-4 w-4 text-gold-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.assinaturasTotal}</div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                Ativas: {stats.assinaturasAtivas}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                Vencidas: {stats.assinaturasVencidas}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">R$ {stats.receitaMensal.toFixed(2)}</div>
            <div className="flex items-center space-x-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">{stats.assinaturasAtivas} assinaturas ativas</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo financeiro */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-green-400" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">R$ {(stats.receitaMensal * 12).toFixed(2)}</div>
              <p className="text-sm text-gray-400">Receita Anual Projetada</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">R$ {stats.receitaMensal.toFixed(2)}</div>
              <p className="text-sm text-gray-400">Receita Mensal Atual</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">R$ 35.99</div>
              <p className="text-sm text-gray-400">Valor por Assinatura</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardStats;
