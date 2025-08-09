import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Payment } from '@/types/database';

const PaymentsManager = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('pagamentos')
        .select(`
          *,
          agendamentos(
            data_hora,
            servicos(nome)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Converter os dados para o tipo correto, removendo relações problemáticas
      const typedPayments: Payment[] = (data || []).map(payment => ({
        id: payment.id,
        valor: payment.valor,
        percentual: payment.percentual,
        status: payment.status as 'pendente' | 'cancelado' | 'aprovado' | 'rejeitado',
        pix_code: payment.pix_code,
        pix_qr_code: payment.pix_qr_code,
        created_at: payment.created_at,
        expires_at: payment.expires_at,
        agendamento_id: payment.agendamento_id,
        user_id: payment.user_id,
        updated_at: payment.updated_at,
        agendamentos: payment.agendamentos ? {
          data_hora: payment.agendamentos.data_hora,
          servicos: payment.agendamentos.servicos
        } : null
      }));
      
      setPayments(typedPayments);
    } catch (error) {
      toast({
        title: "Erro ao carregar pagamentos",
        description: "Não foi possível carregar os pagamentos.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    const styles = {
      aprovado: 'bg-green-500/20 text-green-400 border-green-500/30',
      pendente: isExpired ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      expirado: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelado: 'bg-red-500/20 text-red-400 border-red-500/30',
      rejeitado: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    const displayStatus = status === 'pendente' && isExpired ? 'EXPIRADO' : status.toUpperCase();

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.pendente}`}>
        {displayStatus}
      </span>
    );
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Organizar pagamentos por prioridade de status
  const sortedPayments = [...payments].sort((a, b) => {
    const statusPriority = { 
      aprovado: 1, 
      pendente: 2, 
      expirado: 3, 
      cancelado: 4,
      rejeitado: 5
    };
    
    const priorityA = statusPriority[a.status as keyof typeof statusPriority] || 6;
    const priorityB = statusPriority[b.status as keyof typeof statusPriority] || 6;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h3 className="text-xl sm:text-2xl font-bold">Pagamentos PIX</h3>
        <Button
          onClick={fetchPayments}
          variant="outline"
          className="border-gray-600 w-full sm:w-auto"
        >
          Atualizar
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-700">
        <div className="p-4 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gold-400 text-xs sm:text-sm">Data</TableHead>
                  <TableHead className="text-gold-400 text-xs sm:text-sm">Cliente</TableHead>
                  <TableHead className="text-gold-400 text-xs sm:text-sm hidden sm:table-cell">Serviço</TableHead>
                  <TableHead className="text-gold-400 text-xs sm:text-sm">Valor</TableHead>
                  <TableHead className="text-gold-400 text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-gold-400 text-xs sm:text-sm hidden sm:table-cell">Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPayments.map((payment) => (
                  <TableRow key={payment.id} className="border-gray-700">
                    <TableCell className="text-white text-xs sm:text-sm">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-gold-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(payment.created_at), 'dd/MM', { locale: ptBR })}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(payment.created_at), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-white text-xs sm:text-sm">
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1 text-gold-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="truncate">Cliente</span>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-white text-xs sm:text-sm hidden sm:table-cell">
                      <span className="truncate">{payment.agendamentos?.servicos?.nome || 'N/A'}</span>
                    </TableCell>
                    
                    <TableCell className="text-gold-400 font-semibold text-xs sm:text-sm">
                      <div className="flex flex-col">
                        <span>R$ {payment.valor.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">
                          ({payment.percentual}%)
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(payment.status, payment.expires_at)}
                    </TableCell>
                    
                    <TableCell className="text-gray-300 text-xs hidden sm:table-cell">
                      <div className="flex flex-col">
                        <span className="text-xs">
                          {format(new Date(payment.expires_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                        {isExpired(payment.expires_at) && payment.status === 'pendente' && (
                          <span className="text-xs text-red-400 font-medium">EXPIRADO</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {payments.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">Nenhum pagamento</h4>
              <p className="text-gray-400 text-sm">
                Os pagamentos PIX aparecerão aqui quando você gerar códigos para agendamentos.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PaymentsManager;
