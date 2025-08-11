
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, User, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import { useTheme } from '@/hooks/useThemeManager';

interface Client {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
}

const ClientsManager = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isLightTheme } = useTheme();

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    observacoes: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    if (!user?.id) return;
    
    try {
      // Buscar clientes associados através da função
      const { data: associatedClients, error } = await supabase
        .rpc('get_professional_clients', { professional_user_id: user.id });

      if (error) {
        console.error('Erro ao buscar clientes associados:', error);
        throw error;
      }

      setClients(associatedClients || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) {
      toast({
        title: "Nome obrigatório",
        description: "O nome do cliente é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const clientData = {
        nome: formData.nome,
        telefone: formData.telefone || null,
        email: formData.email || null,
        observacoes: formData.observacoes || null,
        user_id: user.id
      };

      if (editingClient) {
        const { error } = await supabase
          .from('cliente_profiles')
          .update({
            nome: formData.nome,
            email: formData.email || null,
            telefone: formData.telefone || null
          })
          .eq('id', editingClient.id);

        if (error) throw error;

        toast({
          title: "Cliente atualizado! ✅",
          description: "As alterações foram salvas com sucesso."
        });
      } else {
        // Para criar novo cliente, precisamos criar na tabela cliente_profiles
        // e associar ao profissional
        const { data: newClient, error: insertError } = await supabase
          .from('cliente_profiles')
          .insert({
            nome: formData.nome,
            email: formData.email || null,
            telefone: formData.telefone || null,
            profissional_vinculado: user.id
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Criar associação
        const { error: associationError } = await supabase
          .from('cliente_profissional_associations')
          .insert({
            cliente_id: newClient.id,
            profissional_id: user.id
          });

        if (associationError) throw associationError;

        toast({
          title: "Cliente criado! 🎉",
          description: "Novo cliente adicionado com sucesso."
        });
      }

      setShowForm(false);
      setEditingClient(null);
      setFormData({ nome: '', telefone: '', email: '', observacoes: '' });
      fetchClients();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o cliente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nome: client.nome,
      telefone: client.telefone || '',
      email: client.email || '',
      observacoes: client.observacoes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    if (!user?.id) return;

    try {
      // Remover associação
      const { error: associationError } = await supabase
        .from('cliente_profissional_associations')
        .delete()
        .eq('cliente_id', clientId)
        .eq('profissional_id', user.id);

      if (associationError) throw associationError;

      // Remover vinculação do cliente_profiles se necessário
      const { error: profileError } = await supabase
        .from('cliente_profiles')
        .update({ profissional_vinculado: null })
        .eq('id', clientId)
        .eq('profissional_vinculado', user.id);

      if (profileError) throw profileError;

      toast({
        title: "Cliente removido",
        description: "O cliente foi removido com sucesso."
      });
      
      fetchClients();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o cliente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Meus Clientes</h3>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingClient(null);
            setFormData({ nome: '', telefone: '', email: '', observacoes: '' });
          }}
          className="bg-gold-gradient text-black font-semibold"
        >
          <Plus className="h-4 w-4 mr-2 text-black" />
          Novo Cliente
        </Button>
      </div>

      {showForm && (
        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700 text-gray-400'} p-6`}>
          <h4 className="text-xl font-semibold mb-4 text-white">
            {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}
                placeholder="cliente@email.com"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className={`${isLightTheme ? 'border-gold-800' : 'border-gray-600'}`} 
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gold-gradient text-black font-semibold"
              >
                {loading ? 'Salvando...' : (editingClient ? 'Atualizar' : 'Criar Cliente')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <Card key={client.id} className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'} p-6`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <User className={`${isLightTheme ? 'text-gold-700' : 'text-gold-400'} h-5 w-5 mr-2`} />
                <h4 className={`${isLightTheme ? 'text-black' : 'text-white'} text-lg font-semibold`}>{client.nome}</h4>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(client)}
                  className="border-gray-600"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(client.id)}
                  className="border-red-600 text-red-400 hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {client.telefone && (
                <div className={`${isLightTheme ? 'text-black' : 'text-gray-400'} flex items-center`}>
                  <Phone className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-4 w-4 mr-2`} />               
                  <span>{client.telefone}</span>
                </div>
              )}
              {client.email && (
                <div className={`${isLightTheme ? 'text-black' : 'text-gray-400'} flex items-center`}>                  
                  <Mail className={`${isLightTheme ? 'text-gold-700' : 'text-gold-500'} h-4 w-4 mr-2`} />
                  <span>{client.email}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {clients.length === 0 && (
        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'} p-8 text-center`}>
          <User className={`${isLightTheme ? 'text-black' : 'text-white'} h-12 w-12 mx-auto mb-4`} />
          <h4 className={`${isLightTheme ? 'text-black' : 'text-white'} text-lg font-semibold mb-2`}>Nenhum cliente cadastrado</h4>
          <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} mb-4`}>  
            Comece adicionando seus primeiros clientes.
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gold-gradient text-black font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Cliente
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ClientsManager;
