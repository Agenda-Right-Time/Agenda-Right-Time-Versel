import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Crown, 
  Calendar,
  DollarSign,
  User,
  RefreshCw,
  Ban,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminSubscription } from '@/types/database';

const AdminAssinaturasManager = () => {
  const [assinaturas, setAssinaturas] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativa' | 'trial' | 'suspensa' | 'cancelada'>('todos');

  useEffect(() => {
    fetchAssinaturas();
  }, []);

  const fetchAssinaturas = async () => {
    try {
      console.log('🔍 [ADMIN ASSINATURAS] Buscando assinaturas...');
      setLoading(true);

      // Buscar todas as assinaturas via RPC
      const { data: assinaturasData, error: assinaturasError } = await supabase
        .rpc('get_all_assinaturas');

      if (assinaturasError) {
        console.error('❌ [ADMIN ASSINATURAS] Erro na RPC:', assinaturasError);
        throw assinaturasError;
      }

      console.log(`✅ [ADMIN ASSINATURAS] Encontradas ${assinaturasData?.length || 0} assinaturas via RPC`);

      // Buscar todos os profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profissional_profiles')
        .select('*');

      if (profilesError) {
        console.error('❌ [ADMIN ASSINATURAS] Erro ao buscar profiles:', profilesError);
      }

      // Combinar assinaturas com profiles
      const assinaturasComProfiles = (assinaturasData || []).map(assinatura => {
        const profile = (allProfiles || []).find(p => p.id === assinatura.user_id);
        return {
          ...assinatura,
          status: assinatura.status as 'trial' | 'ativa' | 'suspensa' | 'cancelada',
          profiles: profile ? {
            nome: profile.nome,
            email: profile.email
          } : { nome: 'Nome não encontrado', email: 'Email não encontrado' }
        };
      });
      
      // Processar status baseado nas datas - LÓGICA CORRIGIDA
      const processedAssinaturas = assinaturasComProfiles.map(assinatura => {
        const agora = new Date();
        const vencimento = new Date(assinatura.data_vencimento);
        const trialFim = new Date(assinatura.trial_ate);
        
        let statusCalculado = assinatura.status;
        
        console.log(`\n🔍 [ASSINATURA] ${assinatura.id}:`);
        console.log(`   Status BD: ${assinatura.status}`);
        console.log(`   Trial até: ${trialFim.toLocaleDateString('pt-BR')}`);
        console.log(`   Vencimento: ${vencimento.toLocaleDateString('pt-BR')}`);
        console.log(`   Agora: ${agora.toLocaleDateString('pt-BR')}`);
        
        // LÓGICA CORRIGIDA:
        // 1. Se trial_ate > agora = TRIAL (independente do status no BD)
        // 2. Se trial_ate <= agora E vencimento > agora E status = 'ativa' = ATIVA
        // 3. Se trial_ate <= agora E (vencimento <= agora OU status != 'ativa') = VENCIDA/CANCELADA
        
        const isInTrial = trialFim > agora;
        const hasValidSubscription = vencimento > agora && assinatura.status === 'ativa';
        
        if (isInTrial) {
          statusCalculado = 'trial';
          console.log(`   → Status calculado: TRIAL (trial ainda ativo)`);
        } else if (hasValidSubscription) {
          statusCalculado = 'ativa';
          console.log(`   → Status calculado: ATIVA (vencimento futuro e status ativa)`);
        } else if (assinatura.status === 'cancelada') {
          statusCalculado = 'cancelada';
          console.log(`   → Status calculado: CANCELADA (status cancelada)`);
        } else {
          statusCalculado = 'suspensa';
          console.log(`   → Status calculado: SUSPENSA (vencimento passado ou status inativo)`);
        }

        return {
          ...assinatura,
          status: statusCalculado,
          statusCalculado
        } as AdminSubscription;
      });

      console.log(`📊 [ADMIN ASSINATURAS] Processadas ${processedAssinaturas.length} assinaturas`);
      setAssinaturas(processedAssinaturas);
    } catch (error) {
      console.error('❌ [ADMIN ASSINATURAS] Erro geral:', error);
      setAssinaturas([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssinaturas = assinaturas.filter(ass => {
    const matchesSearch = ass.profiles.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ass.profiles.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || ass.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      ativa: 'bg-green-500/10 text-green-400 border-green-500/20',
      trial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      suspensa: 'bg-red-500/10 text-red-400 border-red-500/20',
      cancelada: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    };

    const labels = {
      ativa: 'ATIVA',
      trial: 'TRIAL',
      suspensa: 'VENCIDA',
      cancelada: 'CANCELADA'
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        <Crown className="h-3 w-3 mr-1" />
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const handleRenewSubscription = async (id: string) => {
    console.log(`Renovando assinatura ${id}`);
    // TODO: Implementar renovação via Mercado Pago
  };

  const handleCancelSubscription = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta assinatura?')) return;
    
    try {
      const { error } = await supabase
        .from('assinaturas')
        .update({ status: 'cancelada' })
        .eq('id', id);

      if (error) throw error;

      await fetchAssinaturas();
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
    }
  };

  const isExpiringSoon = (dataVencimento: string) => {
    const vencimento = new Date(dataVencimento);
    const agora = new Date();
    const diasParaVencer = Math.ceil((vencimento.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    return diasParaVencer <= 7 && diasParaVencer > 0;
  };

  const getDaysUntilExpiry = (dataVencimento: string) => {
    const vencimento = new Date(dataVencimento);
    const agora = new Date();
    const dias = Math.ceil((vencimento.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const getDaysLeftInTrial = (trialAte: string) => {
    const trialEnd = new Date(trialAte);
    const agora = new Date();
    const dias = Math.ceil((trialEnd.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, dias);
  };

  const statsCalculados = {
    ativas: assinaturas.filter(a => a.status === 'ativa').length,
    trial: assinaturas.filter(a => a.status === 'trial').length,
    vencidas: assinaturas.filter(a => a.status === 'suspensa').length,
    canceladas: assinaturas.filter(a => a.status === 'cancelada').length,
    receitaMensal: assinaturas.filter(a => a.status === 'ativa').length * 35.99
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-400" />
            <p className="text-gray-400">Carregando assinaturas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold">Gerenciar Assinaturas</h3>
          <p className="text-gray-400 text-sm">Total: {assinaturas.length} assinaturas</p>
        </div>
        <Button
          onClick={fetchAssinaturas}
          variant="outline"
          size="sm"
          className="border-blue-600 text-blue-400 hover:bg-blue-900"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Resumo das Assinaturas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Ativas</p>
                <p className="text-2xl font-bold text-green-400">{statsCalculados.ativas}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Trial</p>
                <p className="text-2xl font-bold text-blue-400">{statsCalculados.trial}</p>
              </div>
              <Crown className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Vencidas</p>
                <p className="text-2xl font-bold text-red-400">{statsCalculados.vencidas}</p>
              </div>
              <Ban className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Receita Mensal</p>
                <p className="text-2xl font-bold text-green-400">R$ {statsCalculados.receitaMensal.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por profissional..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['todos', 'ativa', 'trial', 'suspensa', 'cancelada'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status as any)}
                  className={statusFilter === status ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Assinaturas */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-red-400">Profissional</TableHead>
                  <TableHead className="text-red-400">Status</TableHead>
                  <TableHead className="text-red-400">Período</TableHead>
                  <TableHead className="text-red-400">Vencimento</TableHead>
                  <TableHead className="text-red-400">Valor</TableHead>
                  <TableHead className="text-red-400">Payment ID</TableHead>
                  <TableHead className="text-red-400 w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssinaturas.map((assinatura) => (
                  <TableRow key={assinatura.id} className="border-gray-700">
                    <TableCell>
                      <div>
                        <div className="font-medium text-white flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {assinatura.profiles.nome}
                        </div>
                        <div className="text-sm text-gray-400">{assinatura.profiles.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(assinatura.status)}
                        {assinatura.status === 'trial' && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                            {getDaysLeftInTrial(assinatura.trial_ate)} dias restantes
                          </Badge>
                        )}
                        {isExpiringSoon(assinatura.data_vencimento) && assinatura.status === 'ativa' && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                            Expira em {getDaysUntilExpiry(assinatura.data_vencimento)} dias
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-white">
                          {format(new Date(assinatura.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="text-gray-400">até</div>
                        <div className="text-white">
                          {format(new Date(assinatura.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        <span className={getDaysUntilExpiry(assinatura.data_vencimento) <= 0 ? 'text-red-400' : 
                                      getDaysUntilExpiry(assinatura.data_vencimento) <= 7 ? 'text-yellow-400' : 'text-white'}>
                          {format(new Date(assinatura.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      {assinatura.status === 'trial' && (
                        <div className="text-xs text-blue-400 mt-1">
                          Trial até: {format(new Date(assinatura.trial_ate), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-green-400 font-medium">R$ {assinatura.preco.toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gray-400 font-mono">
                        {assinatura.payment_id || 'N/A'}
                      </div>
                      {assinatura.preference_id && (
                        <div className="text-xs text-gray-500 font-mono">
                          Pref: {assinatura.preference_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {assinatura.status === 'suspensa' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRenewSubscription(assinatura.id)}
                            className="border-green-600 text-green-400 hover:bg-green-900 p-2"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                        {assinatura.status === 'ativa' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelSubscription(assinatura.id)}
                            className="border-red-600 text-red-400 hover:bg-red-900 p-2"
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAssinaturasManager;
