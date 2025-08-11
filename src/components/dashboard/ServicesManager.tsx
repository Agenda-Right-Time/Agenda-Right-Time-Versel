import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit, Trash2, Clock, DollarSign } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/useThemeManager';

interface Service {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  duracao: number;
  ativo: boolean;
}

const ServicesManager = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPacoteMensal, setIsPacoteMensal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isLightTheme } = useTheme();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracao: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchServices();
    }
  }, [user?.id]);

  const fetchServices = async () => {
    if (!user?.id) {
      console.error('❌ Usuário não encontrado para buscar serviços');
      return;
    }

    try {
      console.log('🔍 Buscando serviços para o usuário:', user.id);
      
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('user_id', user.id) // ✅ Filtro essencial por usuário
        .eq('ativo', true)
        .order('created_at'); // ✅ Alterado de 'nome' para 'created_at'

      if (error) {
        console.error('❌ Erro ao buscar serviços:', error);
        throw error;
      }

      console.log('✅ Serviços encontrados:', data?.length || 0);
      setServices(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar serviços:', error);
      toast({
        title: "Erro ao carregar serviços",
        description: "Não foi possível carregar a lista de serviços.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para gerenciar serviços.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.nome || !formData.preco || !formData.duracao) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Se for pacote mensal, adicionar "[PACOTE MENSAL]" no nome
      const nomeServico = isPacoteMensal ? `[PACOTE MENSAL] ${formData.nome}` : formData.nome;
      
      const serviceData = {
        nome: nomeServico,
        descricao: formData.descricao || null,
        preco: parseFloat(formData.preco),
        duracao: parseInt(formData.duracao),
        user_id: user.id // ✅ Garantindo que o serviço pertence ao usuário logado
      };

      if (editingService) {
        // Verificação adicional para edição - só permite editar serviços próprios
        const { error } = await supabase
          .from('servicos')
          .update(serviceData)
          .eq('id', editingService.id)
          .eq('user_id', user.id); // ✅ Dupla verificação de segurança

        if (error) throw error;

        toast({
          title: "Serviço atualizado! ✅",
          description: "As alterações foram salvas com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('servicos')
          .insert(serviceData);

        if (error) throw error;

        const tipoServico = isPacoteMensal ? "Pacote Mensal" : "Serviço";
        toast({
          title: `${tipoServico} criado! 🎉`,
          description: `Novo ${tipoServico.toLowerCase()} adicionado com sucesso.`
        });
      }

      setShowForm(false);
      setEditingService(null);
      setIsPacoteMensal(false);
      setFormData({ nome: '', descricao: '', preco: '', duracao: '' });
      fetchServices();
    } catch (error) {
      console.error('❌ Erro ao salvar serviço:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o serviço.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    // Remover o prefixo [PACOTE MENSAL] se existir
    const nomeServico = service.nome.replace(/^\[PACOTE MENSAL\]\s*/, '');
    setIsPacoteMensal(service.nome.includes('[PACOTE MENSAL]'));
    setFormData({
      nome: nomeServico,
      descricao: service.descricao || '',
      preco: service.preco.toString(),
      duracao: service.duracao.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para remover serviços.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      console.log('🗑️ Removendo serviço:', serviceId, 'do usuário:', user.id);
      
      const { error } = await supabase
        .from('servicos')
        .update({ ativo: false })
        .eq('id', serviceId)
        .eq('user_id', user.id); // ✅ Só permite remover serviços próprios

      if (error) throw error;

      toast({
        title: "Serviço removido",
        description: "O serviço foi removido com sucesso."
      });
      
      fetchServices();
    } catch (error) {
      console.error('❌ Erro ao remover serviço:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o serviço.",
        variant: "destructive"
      });
    }
  };

  // Se não há usuário logado, mostrar mensagem
  if (!user?.id) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-900 border-gray-700 p-8 text-center">
          <h4 className="text-lg font-semibold mb-2">Acesso não autorizado</h4>
          <p className="text-gray-400">
            Você precisa estar logado para gerenciar seus serviços.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Meus Serviços</h3>
          {!isMobile && (
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>Gerencie seus serviços oferecidos</p>
          )}
        </div>
        <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row'}`}>
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingService(null);
              setIsPacoteMensal(false);
              setFormData({ nome: '', descricao: '', preco: '', duracao: '' });
            }}
            className={`bg-gold-gradient text-black font-semibold ${isMobile ? 'text-sm' : ''}`}
          >
            <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
            {isMobile ? 'Serviço' : 'Novo Serviço'}
          </Button>
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingService(null);
              setIsPacoteMensal(true);
              setFormData({ nome: '', descricao: '', preco: '', duracao: '' });
            }}
            className={`bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold hover:from-purple-600 hover:to-purple-700 ${isMobile ? 'text-sm' : ''}`}
          >
            <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
            {isMobile ? 'Pacote' : 'Pacote Mensal'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800 text-gray-900' : 'bg-gray-900 border-gray-700 text-gray-400'} ${isMobile ? 'p-4' : 'p-6'}`}>
          <h4 className={`${isLightTheme ? 'font-semibold mb-4 text-black' : 'font-semibold mb-4 text-white'} ${isMobile ? 'text-lg' : 'text-xl'}`}>
            {editingService 
              ? (isPacoteMensal ? 'Editar Pacote Mensal' : 'Editar Serviço')
              : (isPacoteMensal ? 'Novo Pacote Mensal' : 'Novo Serviço')
            }
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
              <div>
                <Label htmlFor="nome" className={isMobile ? 'text-sm' : ''}>
                  {isPacoteMensal ? 'Nome do Pacote Mensal *' : 'Nome do Serviço *'}
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={`bg-gray-800 border-gray-600 text-gray-400 ${isLightTheme ? 'bg-gray-200 border-gold-800 text-gray-900' : ''} ${isMobile ? 'text-sm' : ''}`}
                  placeholder={isPacoteMensal ? "Ex: Manutenção Completa" : "Ex: Corte de Cabelo"}
                  required
                />
              </div>
              <div>
                <Label htmlFor="preco" className={isMobile ? 'text-sm' : ''}>Preço (R$) *</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  className={`bg-gray-800 border-gray-600 text-gray-400 ${isLightTheme ? 'bg-gray-200 border-gold-800 text-gray-900' : ''} ${isMobile ? 'text-sm' : ''}`}
                  placeholder={isPacoteMensal ? "150.00" : "50.00"}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="duracao" className={isMobile ? 'text-sm' : ''}>
                {isPacoteMensal ? 'Duração da Sessão (minutos) *' : 'Duração (minutos) *'}
              </Label>
              <Input
                id="duracao"
                type="number"
                value={formData.duracao}
                onChange={(e) => setFormData({ ...formData, duracao: e.target.value })}
                className={`bg-gray-800 border-gray-600 text-gray-400 ${isLightTheme ? 'bg-gray-200 border-gold-800 text-gray-900' : ''} ${isMobile ? 'text-sm' : ''}`}
                placeholder="60"
                required
              />
            </div>

            <div>
              <Label htmlFor="descricao" className={isMobile ? 'text-sm' : ''}>Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className={`bg-gray-800 border-gray-600 text-gray-400 ${isLightTheme ? 'bg-gray-200 border-gold-800 text-gray-900' : ''} ${isMobile ? 'text-sm' : ''}`}
                placeholder={isPacoteMensal ? "Descreva o que inclui no pacote mensal..." : "Descreva o serviço..."}
                rows={isMobile ? 2 : 3}
              />
            </div>

            <div className={`flex gap-2 ${isMobile ? 'pt-2' : 'pt-4'}`}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setIsPacoteMensal(false);
                }}
                className={`border-gray-600  ${isLightTheme ? 'border-gold-800' : 'text-gray-900'} ${isMobile ? 'text-sm' : ''}`}
                
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className={`${isPacoteMensal 
                  ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold hover:from-purple-600 hover:to-purple-700"
                  : "bg-gold-gradient text-black font-semibold"
                } ${isMobile ? 'text-sm' : ''}`}
              >
                {loading ? 'Salvando...' : (editingService ? 'Atualizar' : (isPacoteMensal ? 'Criar Pacote' : 'Criar Serviço'))}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-4 sm:gap-6`}>
        {services.map((service) => (

          <Card key={service.id} className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'} ${isMobile ? 'p-4' : 'p-6'}`}>

                 

            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex-1 min-w-0">
                <h4 className={`${isLightTheme ? 'text-black' : 'text-white'} ${isMobile ? 'text-base' : 'text-lg'} font-semibold truncate`}>{service.nome}</h4>
                {service.nome.includes('[PACOTE MENSAL]') && (
                  <span className={`inline-block mt-1 px-2 py-1 bg-purple-600 text-white rounded-full ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    Pacote Mensal
                  </span>
                )}
              </div>
              <div className="flex gap-1 sm:gap-2 ml-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(service)}
                  className={`border-gray-600 ${isMobile ? 'h-8 w-8 p-0' : ''}`}
                >
                  <Edit className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(service.id)}
                  className={`border-red-600 text-red-400 hover:bg-red-600 ${isMobile ? 'h-8 w-8 p-0' : ''}`}
                >
                  <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </Button>
              </div>
            </div>
            
            {service.descricao && (
              <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} ${isMobile ? 'text-xs' : 'text-sm'} mb-3 sm:mb-4`}>{service.descricao}</p>
            )}

            
            <div className={`flex justify-between items-center ${isMobile ? 'text-sm' : ''}`}>
              <div className={`${isLightTheme ? 'text-green-600' : 'text-gold-400'} ${isMobile ? 'text-sm' : ''} flex items-center`}>



                <DollarSign className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1'}`} />
                <span className="font-semibold">R$ {service.preco.toFixed(2)}</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Clock className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1'}`} />
                <span>{service.duracao}min</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {services.length === 0 && (
        <Card className={`bg-gray-900 border-gray-700 ${isLightTheme ? 'bg-gray-300 border-gold-800' : ''} ${isMobile ? 'p-6' : 'p-8'} text-center`}>
          <Clock className={`${isLightTheme ? 'text-black' : 'text-white'} h-12 w-12 mx-auto mb-4`} />
          <h4 className={`${isLightTheme ? 'text-black' : 'text-white'} text-lg font-semibold mb-2`}>Nenhum serviço cadastrado</h4>
          <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} ${isMobile ? 'text-sm' : ''} mb-4`}>
            Comece criando seus primeiros serviços para oferecer aos clientes.
          </p>
          <div className={`flex gap-2 sm:gap-3 justify-center ${isMobile ? 'flex-col' : ''}`}>
            <Button
              onClick={() => {
                setShowForm(true);
                setIsPacoteMensal(false);
              }}
              className={`bg-gold-gradient text-black font-semibold ${isMobile ? 'text-sm' : ''}`}
            >
              <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
              {isMobile ? 'Primeiro Serviço' : 'Criar Primeiro Serviço'}
            </Button>
            <Button
              onClick={() => {
                setShowForm(true);
                setIsPacoteMensal(true);
              }}
              className={`bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold hover:from-purple-600 hover:to-purple-700 ${isMobile ? 'text-sm' : ''}`}
            >
              <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
              {isMobile ? 'Pacote Mensal' : 'Criar Pacote Mensal'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ServicesManager;
