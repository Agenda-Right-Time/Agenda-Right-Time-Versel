
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Save, Store, Phone, Clock, Info } from 'lucide-react';
import { useTheme } from '@/hooks/useThemeManager';

const AddressSettings = () => {
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [cep, setCep] = useState('');
  const [telefoneEstabelecimento, setTelefoneEstabelecimento] = useState('');
  const [horarioAbertura, setHorarioAbertura] = useState('08:00');
  const [horarioFechamento, setHorarioFechamento] = useState('18:00');
  const [diasFuncionamento, setDiasFuncionamento] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [intervaloAgendamento, setIntervaloAgendamento] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isLightTheme } = useTheme();

  useEffect(() => {
    if (user?.id) {
      fetchAddressData();
    }
  }, [user?.id]);

  const fetchAddressData = async () => {
    if (!user?.id) {
      console.error('❌ Usuário não encontrado para buscar endereço');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Buscando dados de endereço para o usuário:', user.id);
      
      const { data, error } = await supabase
        .from('configuracoes')
        .select('nome_estabelecimento, endereco, cidade, cep, telefone_estabelecimento, horario_abertura, horario_fechamento, dias_funcionamento, intervalo_agendamento')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar endereço:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Dados de configuração encontrados:', data);
        setNomeEstabelecimento(data.nome_estabelecimento || '');
        setEndereco(data.endereco || '');
        setCidade(data.cidade || '');
        setCep(data.cep || '');
        setTelefoneEstabelecimento(data.telefone_estabelecimento || '');
        setHorarioAbertura(data.horario_abertura || '08:00');
        setHorarioFechamento(data.horario_fechamento || '18:00');
        setDiasFuncionamento(data.dias_funcionamento || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
        setIntervaloAgendamento(data.intervalo_agendamento || 30);
      } else {
        console.log('ℹ️ Nenhuma configuração encontrada para o usuário');
      }

    } catch (error) {
      console.error('❌ Erro ao buscar dados de endereço:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de endereço.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para salvar as configurações.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Salvando configurações para o usuário:', user.id);
      
      // Salvar todas as configurações
      const configData = {
        user_id: user.id,
        nome_estabelecimento: nomeEstabelecimento.trim() || null,
        endereco: endereco.trim() || null,
        cidade: cidade.trim() || null,
        cep: cep.trim() || null,
        telefone_estabelecimento: telefoneEstabelecimento.trim() || null,
        horario_abertura: horarioAbertura,
        horario_fechamento: horarioFechamento,
        dias_funcionamento: diasFuncionamento,
        intervalo_agendamento: intervaloAgendamento,
        updated_at: new Date().toISOString()
      };

      console.log('📝 Salvando configurações completas:', configData);
      
      const { data: configSaved, error: configError } = await supabase
        .from('configuracoes')
        .upsert(configData, {
          onConflict: 'user_id'
        })
        .select();

      if (configError) {
        console.error('❌ Erro ao salvar configurações:', configError);
        throw configError;
      }

      console.log('✅ Configurações salvas com sucesso:', configSaved);
      
      toast({
        title: "Configurações atualizadas! 🎉",
        description: "Informações do estabelecimento e horários de funcionamento foram salvos com sucesso."
      });
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar as configurações: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCep = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    
    if (numericValue.length <= 5) {
      return numericValue;
    } else {
      return `${numericValue.slice(0, 5)}-${numericValue.slice(5, 8)}`;
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCep = formatCep(e.target.value);
    setCep(formattedCep);
  };

  const handleDayToggle = (day: string) => {
    setDiasFuncionamento(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const dayNames: { [key: string]: string } = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  if (!user?.id) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-8 text-center">
          <h4 className="text-lg font-semibold mb-2">Acesso não autorizado</h4>
          <p className="text-gray-400">
            Você precisa estar logado para configurar o estabelecimento.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-8 text-center">
          <h4 className="text-lg font-semibold mb-2">Acesso não autorizado</h4>
          <p className="text-gray-400">
            Você precisa estar logado para configurar o estabelecimento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800 text-black' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>



      <Label className="flex items-center gap-1 m-6">
        <Info className={`${isLightTheme ? 'text-gold-700' : 'text-gold-400'} h-4 w-4 mr-1`} />
        <h5 className={`${isLightTheme ? 'text-black' : 'text-gray-300'} font-medium`}>
          Informações da página de agendamento
        </h5>
      </Label>
      
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="nome_estabelecimento">Nome do Estabelecimento</Label>
          <Input
            id="nome_estabelecimento"
            type="text"
            value={nomeEstabelecimento}
            onChange={(e) => setNomeEstabelecimento(e.target.value)}
            placeholder="Ex: Salão Beleza & Charme"
            className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
          />
        </div>

        <div>
          <Label htmlFor="telefone_estabelecimento" className="flex items-center gap-1">
            <h5 className={`${isLightTheme ? 'text-black' : 'text-gray-400'} mb-1`}>              
            Telefone do Estabelecimento
          </h5>
          </Label>
          <Input
            id="telefone_estabelecimento"
            type="tel"
            value={telefoneEstabelecimento}
            onChange={(e) => setTelefoneEstabelecimento(e.target.value)}
            placeholder="(11) 99999-9999"
            className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-gray-400'}`}           
          />
        </div>

        <div>
          <Label htmlFor="endereco">Endereço completo</Label>
          <Input
            id="endereco"
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Ex: Rua das Flores, 123 - Centro"
            className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
          />
        </div>

          <div>
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex: São Paulo"
              className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
            />
          </div>

        {/* Seção de Horário de Funcionamento */}
        <div className="pt-6">
          <h5 className={`${isLightTheme ? 'text-black' : 'text-gray-300'} font-medium mb-6 flex items-center`}>
            <Clock className={`${isLightTheme ? 'text-gold-700' : 'text-gold-400'} h-4 w-4 mr-2`} />
            Horário de funcionamento
          </h5>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="horario_abertura">Abertura</Label>
                <Input
                  id="horario_abertura"
                  type="time"
                  value={horarioAbertura}
                  onChange={(e) => setHorarioAbertura(e.target.value)}
                  className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                />
              </div>
              
              <div>
                <Label htmlFor="horario_fechamento">Fechamento</Label>
                <Input
                  id="horario_fechamento"
                  type="time"
                  value={horarioFechamento}
                  onChange={(e) => setHorarioFechamento(e.target.value)}
                  className={`${isLightTheme ? 'bg-gray-200 border-gold-800 text-black' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                />
              </div>
            </div>

            <div>
              <Label className={`${isLightTheme ? 'text-black' : 'text-gray-300'}`}>Dias de Funcionamento</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-6 mb-4">
                {dayOrder.map(day => (
                  <div key={day} className="flex items-center space-x-2">

                    <Checkbox
                      id={day}
                      checked={diasFuncionamento.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                      className={`border rounded ${
                      isLightTheme
                    ? 'text-black border-gray-400 data-[state=checked]:bg-black data-[state=checked]:text-white'
                    : 'text-gold-500 border-gray-600 data-[state=checked]:bg-gold-500 data-[state=checked]:text-black'
                    }`}
                    />
                    <Label htmlFor={day} className="text-sm cursor-pointer">
                      {dayNames[day]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold-500 hover:bg-gold-600 text-black font-semibold"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AddressSettings;
