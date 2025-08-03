import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search, 
  UserCheck, 
  UserX, 
  Eye,
  Mail,
  Phone,
  Calendar,
  Crown,
  RefreshCw,
  Clock
} from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: 'admin' | 'profissional' | 'cliente';
  telefone?: string;
  empresa?: string;
  created_at?: string;
}

interface Assinatura {
  id: string;
  user_id: string;
  status: string;
  data_vencimento: string;
  trial_ate: string;
  preco: number;
}

interface Profissional {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  empresa?: string;
  created_at: string;
  tipo_usuario: 'profissional';
  assinatura?: {
    status: string;
    data_vencimento: string;
    trial_ate?: string;
  };
  totalAgendamentos: number;
  diasRestantesTrial?: number;
}

const AdminProfissionaisManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');

  useEffect(() => {
    fetchProfissionais();
  }, []);

  const fetchProfissionais = async () => {
    try {
      setLoading(true);
      console.log('🔍 [ADMIN PROFISSIONAIS] Iniciando busca de profissionais...');

      // Buscar TODAS as assinaturas primeiro
      console.log('💳 [ADMIN PROFISSIONAIS] Buscando assinaturas via RPC...');
      const { data: assinaturasData, error: assinaturasError } = await supabase
        .rpc('get_all_assinaturas');

      if (assinaturasError) {
        console.error('❌ [ADMIN PROFISSIONAIS] Erro ao buscar assinaturas:', assinaturasError);
        throw assinaturasError;
      }

      const assinaturas = (assinaturasData || []) as Assinatura[];
      console.log(`✅ [ADMIN PROFISSIONAIS] Encontradas ${assinaturas.length} assinaturas`);

      if (assinaturas.length === 0) {
        console.log('⚠️ [ADMIN PROFISSIONAIS] Nenhuma assinatura encontrada - retornando lista vazia');
        setProfissionais([]);
        return;
      }

      // Extrair user_ids das assinaturas
      const userIds = assinaturas.map(ass => ass.user_id);
      console.log(`👥 [ADMIN PROFISSIONAIS] User IDs das assinaturas:`, userIds);

      // Buscar profiles baseado nos user_ids das assinaturas
      console.log('👤 [ADMIN PROFISSIONAIS] Buscando profiles dos usuários com assinaturas...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profissional_profiles')
        .select('*')
        .in('id', userIds)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ [ADMIN PROFISSIONAIS] Erro ao buscar profiles:', profilesError);
        throw profilesError;
      }

      const profiles = (profilesData || []) as Profile[];
      console.log(`✅ [ADMIN PROFISSIONAIS] Encontrados ${profiles.length} profiles com assinaturas`);

      // Buscar agendamentos para contar total por profissional
      const { data: agendamentos, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select('user_id')
        .in('user_id', userIds);

      if (agendamentosError) {
        console.error('❌ [ADMIN PROFISSIONAIS] Erro ao buscar agendamentos:', agendamentosError);
      }

      console.log(`✅ [ADMIN PROFISSIONAIS] Encontrados ${agendamentos?.length || 0} agendamentos`);

      // Processar cada profissional
      const profissionaisData: Profissional[] = [];
      const agora = new Date();

      for (const profile of profiles) {
        console.log(`\n👤 [ADMIN PROFISSIONAIS] Processando: ${profile.nome} (${profile.id})`);
        
        const assinatura = assinaturas.find(ass => ass.user_id === profile.id);
        const totalAgendamentos = agendamentos?.filter(ag => ag.user_id === profile.id).length || 0;

        let statusAssinatura = 'sem-assinatura';
        let diasRestantesTrial = 0;
        
        if (assinatura) {
          const vencimento = new Date(assinatura.data_vencimento);
          const trialAte = new Date(assinatura.trial_ate);
          
          console.log(`   📅 Trial até: ${trialAte.toLocaleDateString('pt-BR')}`);
          console.log(`   📅 Vencimento: ${vencimento.toLocaleDateString('pt-BR')}`);
          console.log(`   📅 Agora: ${agora.toLocaleDateString('pt-BR')}`);
          console.log(`   💳 Status BD: ${assinatura.status}`);
          
          // LÓGICA CORRETA DE STATUS:
          // 1. Se trial_ate > agora = TRIAL
          // 2. Se vencimento > agora E status = 'ativa' = ATIVA
          // 3. Se status = 'cancelada' = CANCELADA
          // 4. Se vencimento <= agora = VENCIDA
          
          if (trialAte > agora) {
            statusAssinatura = 'trial';
            const diffTime = trialAte.getTime() - agora.getTime();
            diasRestantesTrial = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            console.log(`   → Status: TRIAL (${diasRestantesTrial} dias restantes)`);
          } else if (vencimento > agora && assinatura.status === 'ativa') {
            statusAssinatura = 'ativa';
            console.log(`   → Status: ATIVA (vencimento futuro e status ativa)`);
          } else if (assinatura.status === 'cancelada') {
            statusAssinatura = 'cancelada';
            console.log(`   → Status: CANCELADA (status cancelada)`);
          } else if (vencimento <= agora) {
            statusAssinatura = 'vencida';
            console.log(`   → Status: VENCIDA (vencimento passado)`);
          }
        }

        const profissionalData: Profissional = {
          id: profile.id,
          nome: profile.nome,
          email: profile.email || '',
          telefone: profile.telefone,
          empresa: profile.empresa,
          created_at: profile.created_at || new Date().toISOString(),
          tipo_usuario: 'profissional',
          assinatura: {
            status: statusAssinatura,
            data_vencimento: assinatura?.data_vencimento || new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
            trial_ate: assinatura?.trial_ate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          totalAgendamentos,
          diasRestantesTrial: statusAssinatura === 'trial' ? diasRestantesTrial : undefined
        };

        profissionaisData.push(profissionalData);
        console.log(`   ✅ [ADMIN PROFISSIONAIS] Adicionado: ${profissionalData.nome} - Status: ${statusAssinatura}`);
      }

      console.log(`\n📊 [ADMIN PROFISSIONAIS] RESUMO FINAL:`);
      console.log(`- Total processados: ${profissionaisData.length}`);
      console.log(`- Em trial: ${profissionaisData.filter(p => p.assinatura?.status === 'trial').length}`);
      console.log(`- Ativos: ${profissionaisData.filter(p => p.assinatura?.status === 'ativa').length}`);
      console.log(`- Vencidos: ${profissionaisData.filter(p => p.assinatura?.status === 'vencida').length}`);
      console.log(`- Cancelados: ${profissionaisData.filter(p => p.assinatura?.status === 'cancelada').length}`);

      setProfissionais(profissionaisData);

    } catch (error) {
      console.error('❌ [ADMIN PROFISSIONAIS] Erro geral:', error);
      toast.error('Erro ao carregar dados dos profissionais');
      setProfissionais([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfissionais = profissionais.filter(prof => {
    const matchesSearch = prof.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prof.empresa && prof.empresa.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filtroStatus === 'todos') return matchesSearch;
    if (filtroStatus === 'trial') return matchesSearch && prof.assinatura?.status === 'trial';
    if (filtroStatus === 'ativa') return matchesSearch && prof.assinatura?.status === 'ativa';
    if (filtroStatus === 'vencida') return matchesSearch && (prof.assinatura?.status === 'vencida' || prof.assinatura?.status === 'cancelada' || prof.assinatura?.status === 'sem-assinatura');

    return matchesSearch;
  });

  const profissionaisEmTrial = profissionais.filter(prof => prof.assinatura?.status === 'trial');

  const getStatusBadge = (assinatura?: { status: string }, diasRestantes?: number) => {
    if (!assinatura || assinatura.status === 'sem-assinatura') {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
          <UserX className="h-3 w-3 mr-1" />
          SEM ASSINATURA
        </Badge>
      );
    }

    const styles = {
      ativa: 'bg-green-500/10 text-green-400 border-green-500/20',
      trial: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      vencida: 'bg-red-500/10 text-red-400 border-red-500/20',
      cancelada: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    };
    
    const icons = {
      ativa: <UserCheck className="h-3 w-3 mr-1" />,
      trial: <Clock className="h-3 w-3 mr-1" />,
      vencida: <UserX className="h-3 w-3 mr-1" />,
      cancelada: <UserX className="h-3 w-3 mr-1" />
    };

    const status = assinatura.status as keyof typeof styles;

    return (
      <Badge variant="outline" className={styles[status] || styles.vencida}>
        {icons[status] || icons.vencida}
        {status === 'trial' ? `TRIAL (${diasRestantes || 0}d)` : status.toUpperCase()}
      </Badge>
    );
  };

  const handleViewDetails = (id: string) => {
    console.log(`Visualizando detalhes do profissional ${id}`);
    toast.info('Funcionalidade em desenvolvimento');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p>Carregando profissionais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold">Gerenciar Profissionais</h3>
          <p className="text-gray-400 text-sm">Total: {profissionais.length} profissionais cadastrados</p>
        </div>
        <Button
          onClick={fetchProfissionais}
          variant="outline"
          size="sm"
          className="border-blue-600 text-blue-400 hover:bg-blue-900"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Destaque para profissionais em trial */}
      {profissionaisEmTrial.length > 0 && (
        <Card className="bg-orange-900/20 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-orange-400 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Profissionais em Período Trial ({profissionaisEmTrial.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profissionaisEmTrial.map((prof) => (
                <div key={prof.id} className="bg-gray-900 border border-orange-500/20 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white">{prof.nome}</h4>
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                      {prof.diasRestantesTrial || 0} dias
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{prof.email}</p>
                  {prof.empresa && (
                    <p className="text-sm text-gray-400 mb-2">{prof.empresa}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Trial expira: {prof.assinatura?.trial_ate ? new Date(prof.assinatura.trial_ate).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                  placeholder="Buscar por nome, email, empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filtroStatus === 'todos' ? 'default' : 'outline'}
                onClick={() => setFiltroStatus('todos')}
                className={filtroStatus === 'todos' ? 'bg-blue-600' : 'border-gray-600 text-gray-300'}
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={filtroStatus === 'trial' ? 'default' : 'outline'}
                onClick={() => setFiltroStatus('trial')}
                className={filtroStatus === 'trial' ? 'bg-orange-600' : 'border-gray-600 text-gray-300'}
              >
                Trial
              </Button>
              <Button
                size="sm"
                variant={filtroStatus === 'ativa' ? 'default' : 'outline'}
                onClick={() => setFiltroStatus('ativa')}
                className={filtroStatus === 'ativa' ? 'bg-green-600' : 'border-gray-600 text-gray-300'}
              >
                Ativas
              </Button>
              <Button
                size="sm"
                variant={filtroStatus === 'vencida' ? 'default' : 'outline'}
                onClick={() => setFiltroStatus('vencida')}
                className={filtroStatus === 'vencida' ? 'bg-red-600' : 'border-gray-600 text-gray-300'}
              >
                Vencidas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Profissionais */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-red-400">Profissional</TableHead>
                  <TableHead className="text-red-400">Contato</TableHead>
                  <TableHead className="text-red-400">Status Assinatura</TableHead>
                  <TableHead className="text-red-400">Vencimento</TableHead>
                  <TableHead className="text-red-400">Agendamentos</TableHead>
                  <TableHead className="text-red-400">Cadastro</TableHead>
                  <TableHead className="text-red-400 w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfissionais.map((profissional) => (
                  <TableRow key={profissional.id} className="border-gray-700">
                    <TableCell>
                      <div>
                        <div className="font-medium text-white">{profissional.nome}</div>
                        {profissional.empresa && (
                          <div className="text-sm text-gray-400">{profissional.empresa}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-300">
                          <Mail className="h-3 w-3 mr-1 text-gray-400" />
                          {profissional.email}
                        </div>
                        {profissional.telefone && (
                          <div className="flex items-center text-sm text-gray-300">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {profissional.telefone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(profissional.assinatura, profissional.diasRestantesTrial)}
                    </TableCell>
                    <TableCell>
                      {profissional.assinatura ? (
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="text-white">
                            {new Date(profissional.assinatura.data_vencimento).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Sem assinatura</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-white font-medium">{profissional.totalAgendamentos}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-300">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        {new Date(profissional.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(profissional.id)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-800 p-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
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

export default AdminProfissionaisManager;
