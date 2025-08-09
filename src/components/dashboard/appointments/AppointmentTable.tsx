
import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, User, Phone, Mail, X, UserCheck, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types/database';

interface AppointmentTableProps {
  appointments: Appointment[];
  onDelete: (id: string) => void;
  deletingId: string | null;
  onComplete: (id: string) => void;
  completingId: string | null;
}

const AppointmentTable = ({ appointments, onDelete, deletingId, onComplete, completingId }: AppointmentTableProps) => {
  const getStatusBadge = (status: string, displayStatus: string, appointment?: Appointment) => {
    let statusToUse = displayStatus || status;
    
    console.log('🎨 Status Badge:', {
      appointmentId: appointment?.id,
      isPacoteMensal: appointment?.isPacoteMensal,
      originalStatus: status,
      displayStatus,
      statusToUse,
      pagamentos: appointment?.pagamentos
    });
    
    // Verificar se há pagamento pago para determinar status correto
    if (Array.isArray(appointment?.pagamentos)) {
      const hasPaidPayment = appointment.pagamentos.some((p: any) => p.status === 'pago');
      const hasPendingPayment = appointment.pagamentos.some((p: any) => p.status === 'pendente');
      
      // Se o status já é concluído, manter como concluído
      if (status === 'concluido') {
        statusToUse = 'concluido';
      }
      // Se status é confirmado (pagamento aprovado), mostrar como agendado
      else if (status === 'confirmado') {
        statusToUse = 'agendado';
      }
      // Se tem pagamento pago mas status ainda não foi atualizado, forçar agendado
      else if (hasPaidPayment && status === 'agendado') {
        statusToUse = 'agendado';
      }
      // Se tem pagamento pendente e status não é cancelado/confirmado, mostrar como pendente
      else if (hasPendingPayment && status !== 'cancelado' && status !== 'confirmado' && !hasPaidPayment) {
        statusToUse = 'pendente';
      }
    }
    
    const styles = {
      agendado: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelado: 'bg-red-500/20 text-red-400 border-red-500/30',
      pendente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      confirmado: 'bg-green-500/20 text-green-400 border-green-500/30',
      concluido: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };

    let porcentagemPaga = 0;
    
    if (appointment?.isPacoteMensal) {
      // Para pacotes mensais, calcular baseado no status do pagamento
      if (appointment?.status === 'cancelado') {
        porcentagemPaga = 0;
      } else if (statusToUse === 'concluido') {
        porcentagemPaga = 100; // 100% se concluído
      } else if (statusToUse === 'pendente') {
        porcentagemPaga = 0; // 0% se pendente
      } else if (statusToUse === 'agendado' || statusToUse === 'confirmado') {
        porcentagemPaga = 100; // 100% se pago/confirmado
      }
    } else if (appointment && appointment.valor > 0) {
      // Para serviços normais, verificar se há pagamento pago
      const hasPaidPayment = Array.isArray(appointment.pagamentos) && appointment.pagamentos.some((p: any) => p.status === 'pago');
      if (hasPaidPayment) {
        // Se tem pagamento pago, calcular 10% baseado no valor total
        const valorPago = appointment.pagamentos
          ?.filter((p: any) => p.status === 'pago')
          .reduce((sum: number, p: any) => sum + (p.valor || 0), 0) || 0;
        porcentagemPaga = Math.round((valorPago / appointment.valor) * 100);
      } else if (appointment.valor_pago > 0) {
        // Fallback para usar valor_pago se disponível
        porcentagemPaga = Math.round((appointment.valor_pago / appointment.valor) * 100);
      }
    }

    return (
      <div className="text-center space-y-1">
        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${styles[statusToUse as keyof typeof styles] || styles.pendente} ${appointment?.isPacoteMensal ? 'whitespace-nowrap' : ''}`}>
          {statusToUse === 'concluido' ? 'CONCLUÍDO' : 
           appointment?.isPacoteMensal ? (statusToUse === 'pendente' ? 'PENDENTE' : 'AGENDADO') : 
           statusToUse.toUpperCase()}
        </span>
        {appointment?.isPacoteMensal && appointment?.pacoteInfo && statusToUse !== 'concluido' && (
          <div className="text-xs text-purple-400 whitespace-nowrap">
            Sessão {appointment.pacoteInfo.sequencia}/4
          </div>
        )}
        <div className="text-xs text-gray-400 whitespace-nowrap">
          {porcentagemPaga}% pago
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700">
            <TableHead className="text-gold-400 text-xs sm:text-sm min-w-16">Data/Hora</TableHead>
            <TableHead className="text-gold-400 text-xs sm:text-sm min-w-20">Cliente</TableHead>
            <TableHead className="text-gold-400 text-xs sm:text-sm min-w-20">Profissional</TableHead>
            <TableHead className="text-gold-400 text-xs sm:text-sm hidden sm:table-cell min-w-24">Contato</TableHead>
            <TableHead className="text-gold-400 text-xs sm:text-sm min-w-20">Serviço</TableHead>
            <TableHead className="text-gold-400 text-xs sm:text-sm min-w-16">Valor</TableHead>
            <TableHead className="text-gold-400 text-xs sm:text-sm text-center min-w-20">Status</TableHead>
            <TableHead className="text-gold-400 text-xs sm:text-sm w-12 min-w-12">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment, index) => {
            // Verificar se é o primeiro agendamento de um novo dia
            const currentDate = format(new Date(appointment.data_hora), 'dd/MM/yyyy');
            const prevDate = index > 0 ? format(new Date(appointments[index - 1].data_hora), 'dd/MM/yyyy') : null;
            const isNewDay = currentDate !== prevDate;
            
            return (
              <React.Fragment key={appointment.id}>
                {/* Separador entre dias - sem linha cinza */}
                {isNewDay && index > 0 && (
                  <tr>
                    <td colSpan={8} className="p-0 border-0">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 opacity-90" 
                      style={{ height: '1px' }}
                    >                     
                    </div>
                    </td>
                  </tr>
                )}
                
                <TableRow className="border-gray-700">
                  <TableCell className="text-white text-xs sm:text-sm p-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">
                        {format(new Date(appointment.data_hora), 'dd/MM', { locale: ptBR })}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(appointment.data_hora), 'HH:mm')}
                      </span>
                    </div>
                  </TableCell>
              
              <TableCell className="text-white text-xs sm:text-sm p-2">
                <div className="flex items-center min-w-0">
                  <User className="h-3 w-3 mr-1 text-gold-400 flex-shrink-0" />
                  <span className="truncate text-xs">
                    {appointment.cliente_email?.split('@')[0] || 'N/A'}
                  </span>
                </div>
              </TableCell>

              <TableCell className="text-white text-xs sm:text-sm p-2">
                <div className="flex items-center min-w-0">
                  <UserCheck className="h-3 w-3 mr-1 text-gold-400 flex-shrink-0" />
                  <span className="truncate text-xs">
                    {appointment.profissionais?.nome || 'N/A'}
                  </span>
                </div>
              </TableCell>
              
              <TableCell className="text-gray-300 text-xs hidden sm:table-cell p-2">
                <div className="flex flex-col space-y-1">
                  {appointment.cliente_email && (
                    <div className="flex items-center text-xs">
                      <Mail className="h-3 w-3 mr-1" />
                      <span className="truncate">{appointment.cliente_email}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell className="text-white text-xs sm:text-sm p-2">
                <span className="truncate text-xs block">{appointment.servicos?.nome || 'N/A'}</span>
              </TableCell>
              
              <TableCell className="text-gold-400 font-semibold text-xs sm:text-sm p-2">
              <div className="text-xs">
                  {appointment?.isPacoteMensal ? (
                   appointment.status === 'pendente' || appointment.displayStatus === 'pendente' ? 
                   (
                    <span>R$ 0.00</span>
                  ) : (
                  <span>R$ {appointment.valor?.toFixed(2) || '0.00'}</span>)             
                ) : (
                  <>              
                      {/* Para serviços normais, mostrar valor pago baseado nos pagamentos */}
                      {Array.isArray(appointment?.pagamentos) && appointment.pagamentos.some((p: any) => p.status === 'pago') ? (
                        <span>R$ {appointment.pagamentos
                          .filter((p: any) => p.status === 'pago')
                          .reduce((sum: number, p: any) => sum + (p.valor || 0), 0)
                          .toFixed(2)}</span>
                      ) : (
                        <span>R$ {appointment.valor_pago?.toFixed(2) || '0.00'}</span>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
              
              <TableCell className="p-2">
                {getStatusBadge(appointment.status, appointment.displayStatus || '', appointment)}
              </TableCell>
              
              <TableCell className="p-2">
                <div className="flex gap-1">
                  {appointment.status === 'confirmado' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onComplete(appointment.id)}
                      disabled={completingId === appointment.id}
                      className="text-green-400 hover:text-green-300 hover:bg-green-500/10 p-1 h-8 w-8"
                      title="Concluir agendamento"
                    >
                      {completingId === appointment.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400"></div>
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(appointment.id)}
                    disabled={deletingId === appointment.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 h-8 w-8"
                    title={appointment.isPacoteMensal ? "Cancelar sessão do pacote" : "Excluir agendamento"}
                  >
                    {deletingId === appointment.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </React.Fragment>
          )})}
        </TableBody>
      </Table>
    </div>
  );
};

export default AppointmentTable;
