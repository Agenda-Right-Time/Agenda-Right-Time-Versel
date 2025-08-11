import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar as CalendarIcon, X } from 'lucide-react';
import { format, addDays, isAfter, isBefore, startOfDay, addMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useThemeManager';

interface PacoteMensalSelectorProps {
  ownerId: string;
  servicoDuracao: number;
  profissionalId?: string;
  onDateTimeSelect: (dateTimes: Date[]) => void;
  selectedDateTimes: Date[];
}

interface HorarioConfig {
  horario_abertura: string;
  horario_fechamento: string;
  intervalo_agendamento: number;
  antecedencia_minima: number;
  dias_funcionamento: string[];
}

const PacoteMensalSelector: React.FC<PacoteMensalSelectorProps> = ({
  ownerId,
  servicoDuracao,
  profissionalId,
  onDateTimeSelect,
  selectedDateTimes
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [availableTimes, setAvailableTimes] = useState<Date[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<Date[]>([]);
  const [config, setConfig] = useState<HorarioConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const { isLightTheme } = useTheme();

  // Função para verificar se é um UUID válido
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };


  const fetchConfig = async () => {
    try {
      // Se não for um UUID válido, não permitir agendamento
      if (!isValidUUID(ownerId)) {
        console.log('📋 ID inválido, não permitindo agendamento de pacote mensal:', ownerId);
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
        console.error('Error fetching calendar config for pacote mensal:', error);
        // Fallback para configurações gerais se não houver configurações específicas por profissional
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('configuracoes')
          .select('horario_abertura, horario_fechamento, intervalo_agendamento, antecedencia_minima, dias_funcionamento')
          .eq('user_id', ownerId)
          .single();

        if (fallbackError) {
          console.error('Error fetching fallback config for pacote mensal:', fallbackError);
          setConfig(null);
          return;
        }

        setConfig(fallbackData);
        return;
      }

      setConfig(data);
    } catch (error) {
      console.error('Error fetching config for pacote mensal:', error);
      setConfig(null);
    }
  };

  const fetchAvailableTimes = async (date: Date) => {
    if (!config || !profissionalId) return;

    setLoading(true);
    try {
      console.log('🔍 Fetching available times for PACOTE MENSAL date:', format(date, 'yyyy-MM-dd'), 'and professional:', profissionalId);

      // Buscar TODOS os agendamentos do profissional para a data específica com informações de pagamento
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

      // Gerar horários disponíveis
      const times = generateTimeSlots(date, config, servicoDuracao);
      
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

      console.log('📊 TOTAL relevant appointments for PACOTE MENSAL (incluindo pacotes mensais):', allRelevantAgendamentos.length);
      
      // Bloquear horários ocupados - APENAS agendamentos confirmados/pagos
      const blocked: Date[] = [];
      
      if (allRelevantAgendamentos && allRelevantAgendamentos.length > 0) {
        allRelevantAgendamentos.forEach(agendamento => {
          const appointmentTime = new Date(agendamento.data_hora);
          
          console.log('📋 Processando agendamento pacote mensal:', {
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
          
          // Lógica de bloqueio:
          // - PACOTE MENSAL: bloquear se confirmado OU se qualquer sessão do pacote tem pagamento pago
          // - AGENDAMENTO NORMAL: bloquear se confirmado OU se tiver pagamento pago
          const shouldBlock = isPacoteMensal 
            ? (agendamento.status === 'confirmado' || pacotePaid)
            : (agendamento.status === 'confirmado' || 
               (agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && hasPaidPayment));

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
        closedTimeSlots.forEach(slot => {
          const startTime = new Date(date);
          const [startHour, startMinute] = slot.start_time.split(':').map(Number);
          startTime.setHours(startHour, startMinute, 0, 0);
          
          const endTime = new Date(date);
          const [endHour, endMinute] = slot.end_time.split(':').map(Number);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          console.log('🚫 Blocking time slot:', format(startTime, 'HH:mm'), 'to', format(endTime, 'HH:mm'));
          
          // Bloquear todos os horários que se sobreponham com este slot fechado
          times.forEach(time => {
            const timeEnd = addMinutes(time, servicoDuracao);
            
            // Se há sobreposição entre o horário e o slot fechado
            if (
              (time >= startTime && time < endTime) ||
              (timeEnd > startTime && timeEnd <= endTime) ||
              (time <= startTime && timeEnd >= endTime)
            ) {
              blocked.push(time);
              console.log('🔒 BLOQUEANDO horário por slot fechado:', format(time, 'HH:mm'));
            }
          });
        });
      }

      // Bloquear horários já selecionados para este pacote
      selectedDateTimes.forEach(selectedDateTime => {
        if (isSameDay(selectedDateTime, date)) {
          blocked.push(selectedDateTime);
        }
      });

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

  const generateTimeSlots = (date: Date, config: any, servicoDuracao: number): Date[] => {
    const slots: Date[] = [];
    const now = new Date();
    const minAdvanceMs = config.antecedencia_minima * 60 * 1000;
    const earliestTime = new Date(now.getTime() + minAdvanceMs);

    const [openHour, openMinute] = config.horario_abertura.split(':').map(Number);
    const [closeHour, closeMinute] = config.horario_fechamento.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(openHour, openMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(closeHour, closeMinute, 0, 0);

    const lastSlotTime = new Date(endTime.getTime() - servicoDuracao * 60 * 1000);

    while (currentTime <= lastSlotTime) {
      if (isAfter(currentTime, earliestTime)) {
        slots.push(new Date(currentTime));
      }
      currentTime = addMinutes(currentTime, config.intervalo_agendamento);
    }

    return slots;
  };

  const fetchClosedDates = async () => {
    if (!profissionalId) return;
    
    try {
      const { data: closedDatesData } = await supabase
        .from('calendar_closed_dates')
        .select('date')
        .eq('user_id', ownerId)
        .eq('profissional_id', profissionalId);

      if (closedDatesData) {
        setClosedDates(closedDatesData.map(item => item.date));
      }
    } catch (error) {
      console.error('Error fetching closed dates:', error);
    }
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

    // Só desabilitar dias que não estão nos dias de funcionamento
    // Datas fechadas devem aparecer como selecionáveis mas sem horários (igual ao serviço normal)
    return !config.dias_funcionamento.includes(dayMap[dayOfWeek] || '');
  };

  const isTimeBlocked = (time: Date): boolean => {
    return blockedTimes.some(blockedTime => 
      isSameDay(blockedTime, time) && 
      blockedTime.getTime() === time.getTime()
    );
  };

  const handleTimeSelect = (time: Date) => {
    if (isTimeBlocked(time) || selectedDateTimes.length >= 4) return;
    
    const newSelectedTimes = [...selectedDateTimes, time];
    onDateTimeSelect(newSelectedTimes);
  };

  const removeSelectedTime = (timeToRemove: Date) => {
    const newSelectedTimes = selectedDateTimes.filter(time => 
      time.getTime() !== timeToRemove.getTime()
    );
    onDateTimeSelect(newSelectedTimes);
  };

  React.useEffect(() => {
    fetchConfig();
  }, [ownerId, profissionalId]);

  React.useEffect(() => {
    if (selectedDate && config && profissionalId) {
      fetchAvailableTimes(selectedDate);
    }
  }, [selectedDate, config, selectedDateTimes, servicoDuracao, profissionalId]);

  React.useEffect(() => {
    if (ownerId && config && profissionalId) {
      fetchClosedDates();
    }
  }, [ownerId, config, profissionalId]);

  return (
    <div className="space-y-6">
      {/* Mostrar horários selecionados */}
      {selectedDateTimes.length > 0 && (
        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>
          <CardHeader>
            <CardTitle className={`${isLightTheme ? 'text-black' : 'text-white'} flex items-center gap-2`}>
              <Clock className="h-5 w-5 text-purple-600" />
              Horários Selecionados ({selectedDateTimes.length}/4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedDateTimes.map((dateTime, index) => (
                <div key={index} className="flex items-center justify-between bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                  <div>
                    <p className={`${isLightTheme ? 'text-purple-500' : 'text-purple-300'} font-medium`}>
                      {format(dateTime, 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className={`${isLightTheme ? 'text-gray-600' : 'text-gray-400'} text-sm`}>
                      {format(dateTime, 'HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSelectedTime(dateTime)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>
        <CardHeader>
          <CardTitle className={`${isLightTheme ? 'text-black' : 'text-white'} flex items-center gap-2`}>  
            <CalendarIcon className="h-5 w-5 text-purple-600" />
            Selecione 4 Datas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={isDayDisabled}
            locale={ptBR}
            className={`${isLightTheme ? 'bg-gray-900 border-gold-500 text-gray-400' : 'border-gray-700 text-gray-400'} rounded-md border`}
            classNames={{
            nav_button: "text-purple-500 hover:text-purple-300", 
            }}
          />
        </CardContent>
      </Card>

      {selectedDate && (
        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800 text-black' : 'bg-gray-900 border-gray-700 text-white'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Horários para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {availableTimes.map((time, index) => {
                  const isBlocked = isTimeBlocked(time);
                  const isSelected = selectedDateTimes.some(selectedTime => 
                    isSameDay(selectedTime, time) && selectedTime.getTime() === time.getTime()
                  );
                  const canSelect = !isBlocked && !isSelected && selectedDateTimes.length < 4;
                  
                  return (
                    <Button
                      key={index}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTimeSelect(time)}
                      disabled={!canSelect}
                      className={`
                        ${isSelected ? 'bg-purple-gradient text-white' : 'border-gray-600'} 
                        ${isBlocked || !canSelect ? 'opacity-30 cursor-not-allowed bg-red-900/20 border-red-500/30' : 'hover:bg-gray-800'}
                      `}
                    >
                      {format(time, 'HH:mm')}
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

      {selectedDateTimes.length === 4 && (
        <div className="text-center p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <p className={`${isLightTheme ? 'text-purple-500' : 'text-purple-300'} font-medium`}>
            ✅ Você selecionou todos os 4 horários necessários para o pacote mensal!




          </p>
        </div>
      )}
    </div>
  );
};

export default PacoteMensalSelector;
