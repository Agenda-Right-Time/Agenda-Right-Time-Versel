import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  DollarSign, 
  Calendar,
  User,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminPayment } from '@/types/database';

const AdminPagamentosManager = () => {
  const [pagamentos, setPagamentos] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aprovado' | 'pendente' | 'rejeitado' | 'cancelado'>('todos');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchPagamentos();
  }, []);

  const fetchPagamentos = async () => {
    try {
      console.log('🔍 [ADMIN PAGAMENTOS] Buscando pagamentos...');
      setLoading(true);

      // Buscar todos os pagamentos via RPC
      const { data: pagamentosData, error: pagamentosError } = await supabase
        .rpc('get_all_pagamentos');

      if (pagamentosError) {
        console.error('❌ [ADMIN PAGAMENTOS] Erro na RPC:', pagamentosError);
        throw pagamentosError;
      }

      console.log(`✅ [ADMIN PAGAMENTOS] Encontrados ${pagamentosData?.length || 0} pagamentos via RPC`);

      // Buscar todos os profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profissional_profiles')
        .select('*');

      if (profilesError) {
        console.error('❌ [ADMIN PAGAMENTOS] Erro ao buscar profiles:', profilesError);
      }

      // Buscar agendamentos relacionados
      const agendamentoIds = (pagamentosData || [])
        .filter(pag => pag.agendamento_id)
        .map(pag => pag.agendamento_id);

      let agendamentos: any[] = [];
      if (agendamentoIds.length > 0) {
        const { data: agendamentosData, error: agendamentosError } = await supabase
          .from('agendamentos')
          .select(`
            id,
            data_hora,
            servicos(nome)
          `)
          .in('id', agendamentoIds);

        if (agendamentosError) {
          console.error('❌ [ADMIN PAGAMENTOS] Erro ao buscar agendamentos:', agendamentosError);
        } else {
          agendamentos = agendamentosData || [];
        }
      }

      // Combinar pagamentos com profiles e agendamentos
      const pagamentosComDados = (pagamentosData || []).map(pagamento => {
        const profile = (allProfiles || []).find(p => p.id === pagamento.user_id);
        const agendamento = agendamentos.find(a => a.id === pagamento.agendamento_id);
        
        return {
          ...pagamento,
          status: pagamento.status as 'pendente' | 'cancelado' | 'aprovado' | 'rejeitado',
          profiles: profile ? {
            nome: profile.nome,
            email: profile.email
          } : { nome: 'Nome não encontrado', email: 'Email não encontrado' },
          agendamentos: agendamento
        } as AdminPayment;
      });
      
      // Processar status baseado na data de expiração
      const processedPagamentos = pagamentosComDados.map(pagamento => {
        const agora = new Date();
        const expiracao = new Date(pagamento.expires_at);
        
        let statusCalculado = pagamento.status;
        
        // Se está pendente e expirou, marcar como cancelado
        if (pagamento.status === 'pendente' && expiracao <= agora) {
          statusCalculado = 'cancelado';
        }

        return {
          ...pagamento,
          status: statusCalculado
        };
      });

      console.log(`📊 [ADMIN PAGAMENTOS] Processados ${processedPagamentos.length} pagamentos`);
      setPagamentos(processedPagamentos);
    } catch (error) {
      console.error('❌ [ADMIN PAGAMENTOS] Erro geral:', error);
      setPagamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPagamentos = pagamentos.filter(pag => {
    const matchesSearch = pag.profiles.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pag.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pag.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || pag.status === statusFilter;
    const matchesDate = !dateFilter || pag.created_at.includes(dateFilter);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      aprovado: 'bg-green-500/10 text-green-400 border-green-500/20',
      pendente: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      rejeitado: 'bg-red-500/10 text-red-400 border-red-500/20',
      cancelado: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    };

    const icons = {
      aprovado: <CheckCircle className="h-3 w-3 mr-1" />,
      pendente: <Clock className="h-3 w-3 mr-1" />,
      rejeitado: <XCircle className="h-3 w-3 mr-1" />,
      cancelado: <XCircle className="h-3 w-3 mr-1" />
    };

    const labels = {
      aprovado: 'APROVADO',
      pendente: 'PENDENTE',
      rejeitado: 'REJEITADO',
      cancelado: 'CANCELADO'
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getMetodoBadge = (pixCode?: string) => {
    const metodo = pixCode ? 'pix' : 'mercado_pago';
    
    const styles = {
      mercado_pago: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      pix: 'bg-green-500/10 text-green-400 border-green-500/20'
    };

    const labels = {
      mercado_pago: 'Mercado Pago',
      pix: 'PIX'
    };

    return (
      <Badge variant="outline" className={styles[metodo as keyof typeof styles]}>
        {labels[metodo as keyof typeof labels]}
      </Badge>
    );
  };

  const handleExportPayments = () => {
    console.log('Exportando relatório de pagamentos...');
    // TODO: Implementar exportação
  };

  const handleRefreshPayments = () => {
    fetchPagamentos();
  };

  const statsCalculados = {
    totalTransacoes: filteredPagamentos.length,
    totalValue: filteredPagamentos.reduce((sum, pag) => sum + pag.valor, 0),
    approvedValue: filteredPagamentos
      .filter(pag => pag.status === 'aprovado')
      .reduce((sum, pag) => sum + pag.valor, 0),
    pendentes: filteredPagamentos.filter(p => p.status === 'pendente').length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-400" />
            <p className="text-gray-400">Carregando pagamentos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold">Gerenciar Pagamentos</h3>
          <p className="text-gray-400 text-sm">Total: {pagamentos.length} transações</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefreshPayments}
            variant="outline"
            size="sm"
            className="border-blue-600 text-blue-400 hover:bg-blue-900"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={handleExportPayments}
            variant="outline"
            size="sm"
            className="border-green-600 text-green-400 hover:bg-green-900"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Transações</p>
                <p className="text-2xl font-bold text-white">{statsCalculados.totalTransacoes}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Valor Total</p>
                <p className="text-2xl font-bold text-blue-400">R$ {statsCalculados.totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Aprovados</p>
                <p className="text-2xl font-bold text-green-400">R$ {statsCalculados.approvedValue.toFixed(2)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400">{statsCalculados.pendentes}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por profissional ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
            <div className="flex gap-2">
              {['todos', 'aprovado', 'pendente', 'rejeitado', 'cancelado'].map((status) => (
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

      {/* Tabela de Pagamentos */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-red-400">Profissional</TableHead>
                  <TableHead className="text-red-400">Valor</TableHead>
                  <TableHead className="text-red-400">Status</TableHead>
                  <TableHead className="text-red-400">Método</TableHead>
                  <TableHead className="text-red-400">Data</TableHead>
                  <TableHead className="text-red-400">Serviço</TableHead>
                  <TableHead className="text-red-400">Expira em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPagamentos.map((pagamento) => (
                  <TableRow key={pagamento.id} className="border-gray-700">
                    <TableCell>
                      <div>
                        <div className="font-medium text-white flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {pagamento.profiles.nome}
                        </div>
                        <div className="text-sm text-gray-400">{pagamento.profiles.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-green-400 font-medium text-lg">
                        R$ {pagamento.valor.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {pagamento.percentual}% do total
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(pagamento.status)}
                    </TableCell>
                    <TableCell>
                      {getMetodoBadge(pagamento.pix_code)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-300">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        <div>
                          <div>{format(new Date(pagamento.created_at), 'dd/MM/yyyy', { locale: ptBR })}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(pagamento.created_at), 'HH:mm', { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-300">
                        {pagamento.agendamentos?.servicos?.nome || 'Serviço não informado'}
                      </div>
                      {pagamento.agendamentos?.data_hora && (
                        <div className="text-xs text-gray-500">
                          {format(new Date(pagamento.agendamentos.data_hora), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-300">
                        {format(new Date(pagamento.expires_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                      {new Date(pagamento.expires_at) <= new Date() && pagamento.status === 'pendente' && (
                        <div className="text-xs text-red-400">EXPIRADO</div>
                      )}
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

export default AdminPagamentosManager;
