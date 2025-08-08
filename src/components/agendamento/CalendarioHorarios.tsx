
import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, isAfter, isBefore, startOfDay, addMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface CalendarioHorariosProps {
  ownerId: string;
  servicoDuracao: number;
  profissionalId?: string;
  onDateTimeSelect: (dateTime: Date) => void;
  selectedDateTime: Date | null;
  isPacoteMensal?: boolean;
}

interface HorarioConfig {
  horario_abertura: string;
  horario_fechamento: string;
  intervalo_agendamento: number;
  antecedencia_minima: number;
  dias_funcionamento: string[];
}

const CalendarioHorarios: React.FC<CalendarioHorariosProps> = ({
  ownerId,
  servicoDuracao,
  profissionalId,
  onDateTimeSelect,
  selectedDateTime,
  isPacoteMensal = false
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [availableTimes, setAvailableTimes] = useState<Date[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<Date[]>([]);
  const [config, setConfig] = useState<HorarioConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // Função para verificar se é um UUID válido
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };


  useEffect(() => {
    fetchConfig();
  }, [ownerId]);

  useEffect(() => {
    if (selectedDate && config && profissionalId) {
      fetchAvailableTimes(selectedDate);
    }
  }, [selectedDate, config, servicoDuracao, profissionalId, isPacoteMensal]);

  const fetchConfig = async () => {
    try {
      // Se não for um UUID válido, não permitir agendamento
      if (!isValidUUID(ownerId)) {
        console.log('📋 ID inválido, não permitindo agendamento:', ownerId);
        setConfig(null);
        return;
      }

      // Buscar configurações do calendário para o profissional específico
      const { data, error } = await supabase
        .from('calendar_settings')
        .select('horario_abertura, horario_fechamento, intervalo_agendamento, antecedencia_minima, dias_funcionamento')
        .eq('user_id', ownerId)
        .eq('profissional_id', profissionalId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching config:', error);
        // Fallback para configurações gerais se não houver configurações específicas por profissional
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('configuracoes')
          .select('horario_abertura, horario_fechamento, intervalo_agendamento, antecedencia_minima, dias_funcionamento')
          .eq('user_id', ownerId)
          .single();

        if (fallbackError) {
          console.error('Error fetching fallback config:', fallbackError);
          setConfig(null);
          return;
        }

        setConfig(fallbackData);
        return;
      }

      setConfig(data);
    } catch (error) {
      console.error('Error:', error);
      setConfig(null);
    }
  };

  const fetchAvailableTimes = async (date: Date) => {
    if (!config || !profissionalId) return;

    setLoading(true);
    try {
      console.log('🔍 Fetching available times for date:', format(date, 'yyyy-MM-dd'), 'and professional:', profissionalId);
      console.log('📦 Is Pacote Mensal?', isPacoteMensal);

      // Se não for um UUID válido, não permitir agendamento
      if (!isValidUUID(ownerId)) {
        console.log('📋 ID inválido, não permitindo agendamento:', ownerId);
        setAvailableTimes([]);
        setBlockedTimes([]);
        setLoading(false);
        return;
      }

      // Buscar TODOS os agendamentos do profissional para a data específica com informações de pagamento
      console.log('🔍 Buscando agendamentos para:', {
        ownerId,
        profissionalId,
        date: format(date, 'yyyy-MM-dd')
      });

      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora, 
          servicos(duracao), 
          observacoes, 
          status,
          pagamentos(status)
        `)
        .eq('user_id', ownerId)
        .eq('profissional_id', profissionalId)
        .gte('data_hora', format(date, 'yyyy-MM-dd 00:00:00'))
        .lt('data_hora', format(addDays(date, 1), 'yyyy-MM-dd 00:00:00'));

      // Buscar TODOS os agendamentos do pacote mensal (incluindo "agendado" com pagamento pago) para este profissional (qualquer data)
      const { data: pacoteMensalAgendamentos, error: pacoteError } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora, 
          servicos(duracao), 
          observacoes, 
          status,
          pagamentos(status)
        `)
        .eq('user_id', ownerId)
        .eq('profissional_id', profissionalId)
        .neq('status', 'cancelado')  // Buscar todos exceto cancelados
        .ilike('observacoes', '%PACOTE MENSAL%');

      if (error) {
        console.error('Error fetching appointments:', error);
        return;
      }

      // Buscar datas fechadas para este profissional
      const dateString = format(date, 'yyyy-MM-dd');
      const { data: closedDates, error: closedDatesError } = await supabase
        .from('calendar_closed_dates')
        .select('date')
        .eq('user_id', ownerId)
        .eq('profissional_id', profissionalId)
        .eq('date', dateString);

      if (closedDatesError) {
        console.error('Error fetching closed dates:', closedDatesError);
      }

      // Buscar horários fechados para este profissional nesta data
      const { data: closedTimeSlots, error: closedTimeSlotsError } = await supabase
        .from('calendar_closed_time_slots')
        .select('start_time, end_time')
        .eq('user_id', ownerId)
        .eq('profissional_id', profissionalId)
        .eq('date', dateString);

      if (closedTimeSlotsError) {
        console.error('Error fetching closed time slots:', closedTimeSlotsError);
      }

      console.log('📅 ALL appointments found for professional on this date:', agendamentos?.length || 0);
      console.log('📊 Appointments details:', agendamentos);
      console.log('📦 Pacote mensal confirmados encontrados:', pacoteMensalAgendamentos?.length || 0);
      console.log('🚫 Closed dates:', closedDates?.length || 0);
      console.log('⏰ Closed time slots:', closedTimeSlots?.length || 0);

      // Se a data está fechada, não mostrar horários
      if (closedDates && closedDates.length > 0) {
        console.log('📅 Date is closed, no available times');
        setAvailableTimes([]);
        setBlockedTimes([]);
        setLoading(false);
        return;
      }

      // Combinar agendamentos da data específica com pacotes mensais confirmados
      const allRelevantAgendamentos = [...(agendamentos || [])];
      
      // Adicionar agendamentos do pacote mensal que estão em outras datas mas na mesma data que estamos visualizando
      if (pacoteMensalAgendamentos && pacoteMensalAgendamentos.length > 0) {
        pacoteMensalAgendamentos.forEach(pacoteAgendamento => {
          const pacoteDate = new Date(pacoteAgendamento.data_hora);
          // Se o agendamento do pacote é na data que estamos visualizando, incluir na lista
          if (isSameDay(pacoteDate, date)) {
            // Verificar se já não está na lista (evitar duplicatas)
            const alreadyExists = allRelevantAgendamentos.some(a => a.id === pacoteAgendamento.id);
            if (!alreadyExists) {
              allRelevantAgendamentos.push(pacoteAgendamento);
            }
          }
        });
      }

      console.log('📊 TOTAL relevant appointments (incluindo pacotes mensais):', allRelevantAgendamentos.length);

      // Gerar horários disponíveis
      const times = generateTimeSlots(date, config, servicoDuracao);
      
      // Bloquear horários ocupados
      const blocked: Date[] = [];
      
      // Bloquear agendamentos confirmados/pagos
      if (allRelevantAgendamentos && allRelevantAgendamentos.length > 0) {
        allRelevantAgendamentos.forEach(agendamento => {
          const appointmentTime = new Date(agendamento.data_hora);
          
          console.log('📋 Processando agendamento:', {
            data: format(appointmentTime, 'dd/MM/yyyy HH:mm'),
            status: agendamento.status,
            observacoes: agendamento.observacoes,
            pagamentos: agendamento.pagamentos
          });

          // Se status é 'cancelado' ou 'concluido', não bloquear (liberar horário)
          if (agendamento.status === 'cancelado' || agendamento.status === 'concluido') {
            console.log('✅ Agendamento CANCELADO/CONCLUÍDO - LIBERANDO horário:', 
                       format(appointmentTime, 'dd/MM/yyyy HH:mm'), 
                       'Status:', agendamento.status);
            return;
          }

          // Verificar se é pacote mensal
          const isPacoteMensal = agendamento.observacoes?.includes('PACOTE MENSAL');
          
          // Verificar se tem pagamento concluído
          const pagamentosArray = Array.isArray(agendamento.pagamentos) ? agendamento.pagamentos : (agendamento.pagamentos ? [agendamento.pagamentos] : []);
          const hasPaidPayment = pagamentosArray.some((p: any) => p.status === 'pago');
          
          // Para pacote mensal: verificar se há pagamento pago para qualquer agendamento do mesmo pacote
          let pacotePaid = false;
          if (isPacoteMensal && agendamento.observacoes) {
            const pacoteId = agendamento.observacoes.match(/PMT\d+/)?.[0];
            if (pacoteId && pacoteMensalAgendamentos) {
              pacotePaid = pacoteMensalAgendamentos.some(pacoteApp => {
                const pagamentosArrayPacote = Array.isArray(pacoteApp.pagamentos) ? pacoteApp.pagamentos : (pacoteApp.pagamentos ? [pacoteApp.pagamentos] : []);
                return pacoteApp.observacoes?.includes(pacoteId) && 
                       pagamentosArrayPacote.some((p: any) => p.status === 'pago');
              });
            }
          }

          // Para agendamentos NORMAIS (não pacote mensal): também verificar se há conflito com pacotes mensais pagos
          let conflictWithPacote = false;
          if (!isPacoteMensal && pacoteMensalAgendamentos) {
            conflictWithPacote = pacoteMensalAgendamentos.some(pacoteApp => {
              if (pacoteApp.status === 'cancelado' || pacoteApp.status === 'concluido') return false;
              
              const pacoteTime = new Date(pacoteApp.data_hora);
              const pagamentosArrayConflict = Array.isArray(pacoteApp.pagamentos) ? pacoteApp.pagamentos : (pacoteApp.pagamentos ? [pacoteApp.pagamentos] : []);
              const hasPacotePago = pagamentosArrayConflict.some((p: any) => p.status === 'pago');
              
              // Se o pacote tem pagamento pago e é no mesmo horário, bloquear
              if (hasPacotePago && isSameDay(pacoteTime, appointmentTime) && 
                  pacoteTime.getTime() === appointmentTime.getTime()) {
                return true;
              }
              
              return false;
            });
          }
          
          // Lógica de bloqueio:
          // - PACOTE MENSAL: bloquear se confirmado OU se qualquer sessão do pacote tem pagamento pago
          // - AGENDAMENTO NORMAL: bloquear se confirmado OU se tiver pagamento pago OU se conflita com pacote mensal pago
          const shouldBlock = isPacoteMensal 
            ? (agendamento.status === 'confirmado' || pacotePaid)
            : (agendamento.status === 'confirmado' || 
               (agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && hasPaidPayment) ||
               conflictWithPacote);

          if (!shouldBlock) {
            console.log('⚠️ Agendamento PENDENTE/NÃO PAGO - LIBERANDO horário:', 
                       format(appointmentTime, 'dd/MM/yyyy HH:mm'), 
                       'Status:', agendamento.status, 
                       'Tem pagamento?', hasPaidPayment);
            return;
          }

          console.log('🚫 Agendamento CONFIRMADO/PAGO - BLOQUEANDO horário:', 
                     format(appointmentTime, 'dd/MM/yyyy HH:mm'), 
                     'Status:', agendamento.status, 
                     'Tem pagamento?', hasPaidPayment);
          
          // Obter duração do serviço do agendamento
          const servicoData = agendamento.servicos;
          let appointmentDuration = 30; // valor padrão
          
          if (servicoData && typeof servicoData === 'object' && 'duracao' in servicoData) {
            const duracaoValue = servicoData.duracao;
            if (typeof duracaoValue === 'number') {
              appointmentDuration = duracaoValue;
            } else if (typeof duracaoValue === 'string') {
              const parsed = parseInt(duracaoValue, 10);
              if (!isNaN(parsed)) {
                appointmentDuration = parsed;
              }
            }
          }
          
          // Bloquear horários que conflitam com este agendamento ativo
          times.forEach(time => {
            const timeEnd = addMinutes(time, servicoDuracao);
            const appointmentEnd = addMinutes(appointmentTime, appointmentDuration);
            
            // Se há sobreposição entre os horários
            if (
              (time >= appointmentTime && time < appointmentEnd) ||
              (timeEnd > appointmentTime && timeEnd <= appointmentEnd) ||
              (time <= appointmentTime && timeEnd >= appointmentEnd)
            ) {
              blocked.push(time);
              
              console.log('🔒 BLOQUEANDO horário:', format(time, 'HH:mm'), 
                         'Conflito com agendamento:', format(appointmentTime, 'dd/MM/yyyy HH:mm'),
                         'Status:', agendamento.status);
            }
          });
        });
      }

      // Bloquear horários fechados específicos
      if (closedTimeSlots && closedTimeSlots.length > 0) {
        closedTimeSlots.forEach(closedSlot => {
          const [startHour, startMinute] = closedSlot.start_time.split(':').map(Number);
          const [endHour, endMinute] = closedSlot.end_time.split(':').map(Number);
          
          const startTime = new Date(date);
          startTime.setHours(startHour, startMinute, 0, 0);
          
          const endTime = new Date(date);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          times.forEach(time => {
            const timeEnd = addMinutes(time, servicoDuracao);
            
            // Se há sobreposição entre o horário disponível e o horário fechado
            if (
              (time >= startTime && time < endTime) ||
              (timeEnd > startTime && timeEnd <= endTime) ||
              (time <= startTime && timeEnd >= endTime)
            ) {
              blocked.push(time);
              
              console.log('🔒 BLOQUEANDO horário:', format(time, 'HH:mm'), 
                         'Horário fechado:', format(startTime, 'HH:mm'), '-', format(endTime, 'HH:mm'));
            }
          });
        });
      }

      console.log('⏰ Total times generated:', times.length);
      console.log('🚫 Total blocked times:', blocked.length);
      console.log('✅ Available times:', times.filter(time => !blocked.some(blockedTime => 
        isSameDay(blockedTime, time) && blockedTime.getTime() === time.getTime()
      )).map(time => format(time, 'HH:mm')));

      setAvailableTimes(times);
      setBlockedTimes(blocked);

    } catch (error) {
      console.error('Error fetching available times:', error);
    } finally {
      setLoading(false);
    }
  };


  const generateTimeSlots = (date: Date, config: HorarioConfig, servicoDuracao: number): Date[] => {
    const slots: Date[] = [];
    const now = new Date();
    const minAdvanceMs = config.antecedencia_minima * 60 * 1000;
    const earliestTime = new Date(now.getTime() + minAdvanceMs);

    // Converter horários de string para Date
    const [openHour, openMinute] = config.horario_abertura.split(':').map(Number);
    const [closeHour, closeMinute] = config.horario_fechamento.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(openHour, openMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(closeHour, closeMinute, 0, 0);

    // Ajustar endTime para considerar a duração do serviço
    const lastSlotTime = new Date(endTime.getTime() - servicoDuracao * 60 * 1000);

    while (currentTime <= lastSlotTime) {
      // Verificar se o horário é no futuro (respeitando antecedência)
      if (isAfter(currentTime, earliestTime)) {
        slots.push(new Date(currentTime));
      }

      // Próximo slot
      currentTime = addMinutes(currentTime, config.intervalo_agendamento);
    }

    return slots;
  };

  const isDayDisabled = (date: Date): boolean => {
    if (!config) return true;
    
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;

    const dayOfWeek = format(date, 'EEEE', { locale: ptBR }).toLowerCase();
    const dayMap: { [key: string]: string } = {
      'segunda-feira': 'monday',
      'terça-feira': 'tuesday',
      'quarta-feira': 'wednesday',
      'quinta-feira': 'thursday',
      'sexta-feira': 'friday',
      'sábado': 'saturday',
      'domingo': 'sunday'
    };

    const dayNotInWorkingDays = !config.dias_funcionamento.includes(dayMap[dayOfWeek] || '');
    
    return dayNotInWorkingDays;
  };

  const isTimeBlocked = (time: Date): boolean => {
    return blockedTimes.some(blockedTime => 
      isSameDay(blockedTime, time) && 
      blockedTime.getTime() === time.getTime()
    );
  };

  const handleTimeSelect = (time: Date) => {
    if (isTimeBlocked(time)) return;
    onDateTimeSelect(time);
  };

  const formatTimeSlot = (time: Date): string => {
    return format(time, 'HH:mm');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CalendarIcon className="h-5 w-5 text-yellow-600" />
            Selecione a Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={isDayDisabled}
            locale={ptBR}
          className="rounded-md border border-gray-700 text-gray-400"
          classNames={{
          nav_button: "text-gold-500 hover:text-gold-300", 
          }}
        />
        </CardContent>
      </Card>

      {selectedDate && (
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold-500" />
              Horários para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
              {isPacoteMensal && <span className="text-purple-400 text-sm">(Pacote Mensal)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!profissionalId ? (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  Selecione um profissional primeiro para ver os horários disponíveis.
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
              </div>
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {availableTimes.map((time, index) => {
                  const isBlocked = isTimeBlocked(time);
                  const isSelected = selectedDateTime && isSameDay(selectedDateTime, time) && 
                                   selectedDateTime.getTime() === time.getTime();
                  
                  return (
                    <Button
                      key={index}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTimeSelect(time)}
                      disabled={isBlocked}
                      className={`
                        ${isSelected ? 'bg-gold-gradient text-black' : 'border-gray-600'} 
                        ${isBlocked ? 'opacity-30 cursor-not-allowed bg-red-900/20 border-red-500/30' : 'hover:bg-gray-800'}
                      `}
                    >
                      {formatTimeSlot(time)}
                      {isBlocked && <span className="ml-1 text-xs">🚫</span>}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  Não há horários disponíveis para esta data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalendarioHorarios;
