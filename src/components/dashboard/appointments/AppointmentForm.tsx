
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useThemeManager';

interface Service {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
}

interface Client {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
}

interface Professional {
  id: string;
  nome: string;
  especialidade?: string;
}

interface AppointmentFormProps {
  services: Service[];
  clients: Client[];
  professionals: Professional[];
  onSuccess: () => void;
  onCancel: () => void;
}

const AppointmentForm = ({ services, clients, professionals, onSuccess, onCancel }: AppointmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isLightTheme } = useTheme();

  const [formData, setFormData] = useState({
    cliente_id: '',
    servico_id: '',
    profissional_id: '',
    data: '',
    hora: '',
    observacoes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.servico_id || !formData.profissional_id || !formData.data || !formData.hora) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const selectedService = services.find(s => s.id === formData.servico_id);
      const selectedClient = clients.find(c => c.id === formData.cliente_id);
      const dataHora = new Date(`${formData.data}T${formData.hora}`);

      const appointmentData = {
        cliente_id: formData.cliente_id,
        cliente_email: selectedClient?.email || null, // Incluir email do cliente
        servico_id: formData.servico_id,
        profissional_id: formData.profissional_id,
        data_hora: dataHora.toISOString(),
        valor: selectedService?.preco || 0,
        valor_pago: selectedService?.preco || 0, // Definir como pago 100%
        observacoes: formData.observacoes || null,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        status: 'confirmado' // Criar como confirmado da dashboard (bloqueia horário)
      };

      const { error } = await supabase
        .from('agendamentos')
        .insert(appointmentData);

      if (error) throw error;

      toast({
        title: "Agendamento criado! 🎉",
        description: "Novo agendamento foi criado e confirmado."
      });

      setFormData({ cliente_id: '', servico_id: '', profissional_id: '', data: '', hora: '', observacoes: '' });
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar o agendamento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 text-gray-400 border-gray-700'} p-4 sm:p-6`}>
      <h4 className={`${isLightTheme ? 'text-black' : 'text-white'} text-lg sm:text-xl font-semibold mb-4`}>Novo Agendamento</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Cliente *</Label>
            <Select value={formData.cliente_id} onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}>
              <SelectTrigger className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Profissional *</Label>
            <Select value={formData.profissional_id} onValueChange={(value) => setFormData({ ...formData, profissional_id: value })}>
              <SelectTrigger className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.nome}
                    {professional.especialidade && ` - ${professional.especialidade}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Serviço *</Label>
            <Select value={formData.servico_id} onValueChange={(value) => setFormData({ ...formData, servico_id: value })}>
              <SelectTrigger className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.nome} - R$ {service.preco.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="data">Data *</Label>
            <Input
              id="data"
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}
              required
            />
          </div>

          <div>
            <Label htmlFor="hora">Hora *</Label>
            <Input
              id="hora"
              type="time"
              value={formData.hora}
              onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
              className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="observacoes">Observações</Label>
          <Input
            id="observacoes"
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}
            placeholder="Observações sobre o agendamento..."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className={`${isLightTheme ? 'border-gold-800' : 'border-gray-600'} w-full sm:w-auto`}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gold-gradient text-black font-semibold w-full sm:w-auto"
          >
            {loading ? 'Criando...' : 'Criar Agendamento'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default AppointmentForm;
