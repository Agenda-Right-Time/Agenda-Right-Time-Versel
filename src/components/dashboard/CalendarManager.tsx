import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Plus, X, Save, Settings, UserCheck } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { pt } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useThemeManager';

interface CalendarSettings {
  id?: string;
  horario_abertura: string;
  horario_fechamento: string;
  intervalo_agendamento: number;
  dias_funcionamento: string[];
  antecedencia_minima: number;
  horario_inicio_almoco?: string;
  horario_fim_almoco?: string;
  profissional_id?: string;
}

interface Profissional {
  id: string;
  nome: string;
  especialidade?: string;
  ativo: boolean;
}

interface ClosedDate {
  date: string;
  reason?: string;
}

interface ClosedTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

const CalendarManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selectedProfissional, setSelectedProfissional] = useState<string>('');
  const [settings, setSettings] = useState<CalendarSettings>({
    horario_abertura: '08:00',
    horario_fechamento: '18:00',
    intervalo_agendamento: 30,
    dias_funcionamento: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    antecedencia_minima: 60
  });
  
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [closedTimeSlots, setClosedTimeSlots] = useState<ClosedTimeSlot[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTimeSlotDate, setSelectedTimeSlotDate] = useState<Date | undefined>(undefined);
  const [newClosedReason, setNewClosedReason] = useState<string>('');
  const [showAddTimeSlot, setShowAddTimeSlot] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState({ startTime: '', endTime: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const { isLightTheme } = useTheme();

  const daysOfWeek = [
    { value: 'monday', label: 'Segunda-feira' },
    { value: 'tuesday', label: 'Terça-feira' },
    { value: 'wednesday', label: 'Quarta-feira' },
    { value: 'thursday', label: 'Quinta-feira' },
    { value: 'friday', label: 'Sexta-feira' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
  ];

  const intervalOptions = [
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1h 30min' },
    { value: 120, label: '2 horas' }
  ];

  const antecedenciaOptions = [
    { value: 30, label: '30 minutos' },
    { value: 60, label: '1 hora' },
    { value: 120, label: '2 horas' },
    { value: 240, label: '4 horas' },
    { value: 480, label: '8 horas' },
    { value: 1440, label: '24 horas' }
  ];

  useEffect(() => {
    if (user) {
      fetchProfissionais();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProfissional) {
      loadSettings();
      loadClosedDates();
      loadClosedTimeSlots();
    }
  }, [selectedProfissional]);

  const fetchProfissionais = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('id, nome, especialidade, ativo')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) {
        console.error('Error fetching profissionais:', error);
        return;
      }

      setProfissionais(data || []);
    } catch (error) {
      console.error('Error fetching profissionais:', error);
    }
  };

  const loadSettings = async () => {
    if (!user || !selectedProfissional) return;
    
    try {
      const { data, error } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('profissional_id', selectedProfissional)
        .maybeSingle();

      if (error) {
        console.error('Error loading calendar settings:', error);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          horario_abertura: data.horario_abertura || '08:00',
          horario_fechamento: data.horario_fechamento || '18:00',
          intervalo_agendamento: data.intervalo_agendamento || 30,
          dias_funcionamento: data.dias_funcionamento || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          antecedencia_minima: data.antecedencia_minima || 60,
          horario_inicio_almoco: data.horario_inicio_almoco || '',
          horario_fim_almoco: data.horario_fim_almoco || '',
          profissional_id: data.profissional_id
        });
      } else {
        // Reset to defaults if no settings found
        setSettings({
          horario_abertura: '08:00',
          horario_fechamento: '18:00',
          intervalo_agendamento: 30,
          dias_funcionamento: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          antecedencia_minima: 60,
          profissional_id: selectedProfissional
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadClosedDates = async () => {
    if (!user || !selectedProfissional) return;
    
    try {
      const { data, error } = await supabase
        .from('calendar_closed_dates')
        .select('*')
        .eq('user_id', user.id)
        .eq('profissional_id', selectedProfissional)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error loading closed dates:', error);
        return;
      }

      if (data) {
        const mappedDates: ClosedDate[] = data.map(item => ({
          date: item.date,
          reason: item.reason || undefined
        }));
        setClosedDates(mappedDates);
      }
    } catch (error) {
      console.error('Error loading closed dates:', error);
    }
  };

  const loadClosedTimeSlots = async () => {
    if (!user || !selectedProfissional) return;
    
    try {
      const { data, error } = await supabase
        .from('calendar_closed_time_slots')
        .select('*')
        .eq('user_id', user.id)
        .eq('profissional_id', selectedProfissional)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error loading closed time slots:', error);
        return;
      }

      if (data) {
        const mappedSlots: ClosedTimeSlot[] = data.map(item => ({
          date: item.date,
          startTime: item.start_time,
          endTime: item.end_time,
          reason: item.reason || undefined
        }));
        setClosedTimeSlots(mappedSlots);
      }
    } catch (error) {
      console.error('Error loading closed time slots:', error);
    }
  };

  const saveSettings = async () => {
    if (!user || !selectedProfissional) return;
    
    setLoading(true);
    try {
      const settingsData = {
        user_id: user.id,
        profissional_id: selectedProfissional,
        horario_abertura: settings.horario_abertura,
        horario_fechamento: settings.horario_fechamento,
        intervalo_agendamento: settings.intervalo_agendamento,
        dias_funcionamento: settings.dias_funcionamento,
        antecedencia_minima: settings.antecedencia_minima,
        horario_inicio_almoco: settings.horario_inicio_almoco || null,
        horario_fim_almoco: settings.horario_fim_almoco || null
      };

      if (settings.id) {
        const { error } = await supabase
          .from('calendar_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('calendar_settings')
          .insert([settingsData])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings(prev => ({ ...prev, id: data.id }));
        }
      }

      toast({
        title: "Configurações salvas",
        description: "Suas configurações de calendário foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setSettings(prev => ({
      ...prev,
      dias_funcionamento: prev.dias_funcionamento.includes(day)
        ? prev.dias_funcionamento.filter(d => d !== day)
        : [...prev.dias_funcionamento, day]
    }));
  };

  const addClosedDates = async () => {
    if (!selectedDates.length || !user || !selectedProfissional) return;
    
    try {
      // Solução simples e direta sem conversão de fuso horário
      const datesToInsert = selectedDates.map(date => {
        // Obter ano, mês e dia diretamente do objeto Date
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Formatar como string YYYY-MM-DD
        const formattedDate = `${year}-${month}-${day}`;
        
        return {
          user_id: user.id,
          profissional_id: selectedProfissional,
          date: formattedDate,
          reason: newClosedReason || 'Data fechada'
        };
      });

      const { error } = await supabase
        .from('calendar_closed_dates')
        .insert(datesToInsert);

      if (error) {
        console.error('Error adding closed dates:', error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar datas fechadas. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      await loadClosedDates();
      setSelectedDates([]);
      setNewClosedReason('');
      
      toast({
        title: "Datas fechadas adicionadas",
        description: `${selectedDates.length} data(s) foram adicionadas com sucesso.`,
      });
    } catch (error) {
      console.error('Error adding closed dates:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar datas fechadas. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const removeClosedDate = async (index: number) => {
    if (!user || !selectedProfissional) return;
    
    const closedDate = closedDates[index];
    if (!closedDate) return;
    
    try {
      const { error } = await supabase
        .from('calendar_closed_dates')
        .delete()
        .eq('user_id', user.id)
        .eq('profissional_id', selectedProfissional)
        .eq('date', closedDate.date);

      if (error) {
        console.error('Error removing closed date:', error);
        toast({
          title: "Erro",
          description: "Erro ao remover data fechada. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      await loadClosedDates();
      
      toast({
        title: "Data removida",
        description: "A data fechada foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error removing closed date:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover data fechada. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const addClosedTimeSlot = async () => {
    if (!selectedTimeSlotDate || !newTimeSlot.startTime || !newTimeSlot.endTime || !user || !selectedProfissional) return;
    
    try {
      // Extrair diretamente ano, mês e dia
      const year = selectedTimeSlotDate.getFullYear();
      const month = String(selectedTimeSlotDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedTimeSlotDate.getDate()).padStart(2, '0');
      
      // Formatar como string YYYY-MM-DD
      const dateString = `${year}-${month}-${day}`;
      
      const { error } = await supabase
        .from('calendar_closed_time_slots')
        .insert({
          user_id: user.id,
          profissional_id: selectedProfissional,
          date: dateString,
          start_time: newTimeSlot.startTime,
          end_time: newTimeSlot.endTime,
          reason: newTimeSlot.reason || 'Horário fechado'
        });

      if (error) {
        console.error('Error adding closed time slot:', error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar horário fechado. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      await loadClosedTimeSlots();
      setNewTimeSlot({ startTime: '', endTime: '', reason: '' });
      setSelectedTimeSlotDate(undefined);
      setShowAddTimeSlot(false);
      
      toast({
        title: "Horário fechado adicionado",
        description: "O horário foi adicionado com sucesso.",
      });
    } catch (error) {
      console.error('Error adding closed time slot:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar horário fechado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const removeClosedTimeSlot = async (index: number) => {
    if (!user || !selectedProfissional) return;
    
    const timeSlot = closedTimeSlots[index];
    if (!timeSlot) return;
    
    try {
      const { error } = await supabase
        .from('calendar_closed_time_slots')
        .delete()
        .eq('user_id', user.id)
        .eq('profissional_id', selectedProfissional)
        .eq('date', timeSlot.date)
        .eq('start_time', timeSlot.startTime)
        .eq('end_time', timeSlot.endTime);

      if (error) {
        console.error('Error removing closed time slot:', error);
        toast({
          title: "Erro",
          description: "Erro ao remover horário fechado. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      await loadClosedTimeSlots();
      
      toast({
        title: "Horário removido",
        description: "O horário fechado foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error removing closed time slot:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover horário fechado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para desabilitar datas passadas
  const isDateDisabled = (date: Date): boolean => {
    const today = startOfDay(new Date());
    return isBefore(date, today);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl sm:text-2xl font-bold">Calendário</h3>
        <Button 
          className="bg-gold-gradient text-black font-semibold hover:opacity-90"
          onClick={saveSettings} 
          disabled={loading || !selectedProfissional}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* Seletor de Profissional */}
      <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700 text-white'}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-5 w-5 mr-2`} />
            Selecionar Profissional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${isLightTheme ? 'text-black' : ' text-gray-400'} space-y-4`}>
            <div>
              <Label htmlFor="profissional">Profissional</Label>
              <Select value={selectedProfissional} onValueChange={setSelectedProfissional}>
                <SelectTrigger className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-white border-gray-600 text-gray-900'} hover:opacity-50`}>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map(profissional => (
                    <SelectItem key={profissional.id} value={profissional.id}>
                      {profissional.nome} {profissional.especialidade && `- ${profissional.especialidade}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {profissionais.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhum profissional cadastrado. Cadastre profissionais na aba "Profissionais" primeiro.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedProfissional && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Selecione um profissional para configurar o calendário.
          </p>
        </div>
      )}

      {selectedProfissional && (
        <div className="space-y-6">

      {/* Configurações Gerais */}
      <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700 text-white'}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-5 w-5 mr-2`} />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Horário de Funcionamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${isLightTheme ? 'text-black' : ' text-gray-400'}`}>
              <Label htmlFor="horario_abertura">Horário de Abertura</Label>
              <Input
                id="horario_abertura"
                type="time"
                value={settings.horario_abertura}
                onChange={(e) => setSettings(prev => ({ ...prev, horario_abertura: e.target.value }))}
                className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
              />
            </div>
            <div className={`${isLightTheme ? 'text-black' : ' text-gray-400'}`}>
              <Label htmlFor="horario_fechamento">Horário de Fechamento</Label>
              <Input
                id="horario_fechamento"
                type="time"
                value={settings.horario_fechamento}
                onChange={(e) => setSettings(prev => ({ ...prev, horario_fechamento: e.target.value }))}
                className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
              />
            </div>
          </div>

          {/* Intervalo entre Agendamentos */}
          <div className={`${isLightTheme ? 'text-black' : ' text-gray-400'}`}>
            <Label htmlFor="intervalo">Intervalo entre Agendamentos</Label>
            <Select
              value={settings.intervalo_agendamento.toString()}
              onValueChange={(value) => setSettings(prev => ({ ...prev, intervalo_agendamento: parseInt(value) }))}
            >
              <SelectTrigger className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-gray-400'} hover:opacity-50`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {intervalOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

          {/* Antecedência Mínima */}
          <div className={`${isLightTheme ? 'text-black' : ' text-gray-400'}`}>
            <Label 
            htmlFor="antecedencia">Antecedência Mínima para Agendamento</Label>
            <Select
              value={settings.antecedencia_minima.toString()}
              onValueChange={(value) => setSettings(prev => ({ ...prev, antecedencia_minima: parseInt(value) }))}
            >
              <SelectTrigger className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-gray-400'} hover:opacity-50`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {antecedenciaOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Horário de Almoço */}
          <div className={`${isLightTheme ? 'text-black' : ' text-gray-400'}`}>
            <Label>Horário de Almoço</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className={`${isLightTheme ? 'text-black' : ' text-gray-500'}`}>
                <Label htmlFor="horario_inicio_almoco">Início do Almoço</Label>
                <Input
                  id="horario_inicio_almoco"
                  type="time"
                  value={settings.horario_inicio_almoco || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, horario_inicio_almoco: e.target.value }))}
                  className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                  placeholder="Ex: 12:00"
                />
              </div>
              <div className={`${isLightTheme ? 'text-black' : ' text-gray-500'}`}>
                <Label htmlFor="horario_fim_almoco">Fim do Almoço</Label>
                <Input
                  id="horario_fim_almoco"
                  type="time"
                  value={settings.horario_fim_almoco || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, horario_fim_almoco: e.target.value }))}
                  className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                  placeholder="Ex: 14:00"
                />
              </div>
            </div>
          </div>

          {/* Dias de Funcionamento */}
          <div>
            <Label>Dias de Funcionamento</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
              {daysOfWeek.map(day => (
                <div key={day.value} className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} flex items-center space-x-2`}>
                  
                  <Checkbox
                    id={day.value}
                    checked={settings.dias_funcionamento.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                    className={`border rounded ${
                      isLightTheme
                    ? 'text-black border-gray-400 data-[state=checked]:bg-black data-[state=checked]:text-white'
                    : 'text-gold-500 border-gray-600 data-[state=checked]:bg-gold-500 data-[state=checked]:text-black'
                    }`}
                  />
                  <Label htmlFor={day.value} className={`${isLightTheme ? 'text-black' : 'text-gray-400'} text-sm`}>{day.label}</Label> 
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datas Fechadas */}
      <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700 text-white'}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarDays className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-5 w-5 mr-2`} />
            Datas Fechadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                     variant="outline" 
                     className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600 text-gray-400'} w-full justify-start hover:opacity-50`}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      {selectedDates.length > 0 
                        ? `${selectedDates.length} data(s) selecionada(s)`
                        : 'Selecionar datas'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => setSelectedDates(dates || [])}
                      disabled={isDateDisabled}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button 
               className={`${isLightTheme ? 'bg-gold-gradient text-black font-semibold hover:opacity-90' : 'bg-gold-gradient text-black font-semibold hover:opacity-90'}`}
               onClick={addClosedDates} 
               disabled={!selectedDates.length}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
            
            {selectedDates.length > 0 && (
              <div className={`${isLightTheme ? 'text-black' : 'text-gray-400'} space-y-2`}>
                <Label>Datas selecionadas:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.map((date, index) => (
                    <Badge key={index} variant="outline" className={`${isLightTheme ? 'text-black' : 'text-white'} flex items-center gap-1`}>

                      
                      {format(date, 'dd/MM/yyyy')}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                        onClick={() => setSelectedDates(prev => prev.filter((_, i) => i !== index))}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {closedDates.length > 0 && (
            <div className="space-y-2">
              <Label>Datas Fechadas:</Label>
              <div className="flex flex-wrap gap-2">
                {closedDates.map((closedDate, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {format(new Date(closedDate.date), 'dd/MM/yyyy')}
                    {closedDate.reason && ` - ${closedDate.reason}`}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() => removeClosedDate(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

{/* Horários Específicos Fechados */}
<Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800 text-black' : 'bg-gray-900 border-gray-700 text-white'}`}>
  <CardHeader>
    <CardTitle className="flex items-center">
      <Clock className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-5 w-5 mr-2`} />
      Horários Fechados
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
              variant="outline" 
              className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600 text-gray-400'} w-full justify-start hover:opacity-50`}>
                <CalendarDays className="h-4 w-4 mr-2" />
                {selectedTimeSlotDate
                  ? format(selectedTimeSlotDate, 'dd/MM/yyyy', { locale: pt })
                  : 'Selecionar data'}
              </Button>
            </PopoverTrigger >
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedTimeSlotDate}
                onSelect={(date) => {
                  setSelectedTimeSlotDate(date);
                  if (date) setShowAddTimeSlot(true); // Mostra os campos ao selecionar
                }}
                disabled={isDateDisabled}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {showAddTimeSlot && selectedTimeSlotDate && (
        <div className={`${isLightTheme ? 'text-black bg-gray-200 border-gold-800 dark:bg-gray-800' : 'text-gray-400 bg-gray-800 border-gray-600 dark:bg-gray-800'} border rounded-lg p-4 space-y-4`}>

          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startTime">Hora Início</Label>
              <Input
                className={`${isLightTheme ? 'text-black' : 'text-black'}`}
                id="startTime"
                type="time"
                value={newTimeSlot.startTime}
                onChange={(e) =>
                setNewTimeSlot((prev) => ({ ...prev, startTime: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="endTime">Hora Fim</Label>
              <Input
                className={`${isLightTheme ? 'text-black' : 'text-black'}`}
                id="endTime"
                type="time"
                value={newTimeSlot.endTime}
                onChange={(e) =>
                setNewTimeSlot((prev) => ({ ...prev, endTime: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                className={`${isLightTheme ? 'bg-gold-gradient text-black font-semibold hover:opacity-90' : 'bg-gold-gradient text-black font-semibold hover:opacity-90'}`}
                onClick={() => {
                  addClosedTimeSlot();
                  setNewTimeSlot({ startTime: '', endTime: '', reason: '' });
                  setShowAddTimeSlot(false);
                  setSelectedTimeSlotDate(null); // Opcional: limpa a seleção
                }}
                disabled={!newTimeSlot.startTime || !newTimeSlot.endTime}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Horário
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

    {closedTimeSlots.length > 0 && (
      <div className="space-y-2">
        <Label>Horários Fechados:</Label>
        <div className="space-y-2">
          {closedTimeSlots.map((slot, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <span className={`${isLightTheme ? 'text-black' : 'text-black'} text-sm`} >              
                {format(new Date(slot.date), 'dd/MM/yyyy')} - {slot.startTime} às {slot.endTime}
                {slot.reason && ` (${slot.reason})`}
              </span>
              <X
                className={`${isLightTheme ? 'text-black hover:text-red-500' : 'text-black hover:text-red-500'} h-4 w-4 cursor-pointer`}               
                onClick={() => removeClosedTimeSlot(index)}
              />
            </div>
          ))}
        </div>
      </div>
    )}
  </CardContent>
</Card>
        </div>
      )}
    </div>
  );
};

export default CalendarManager;