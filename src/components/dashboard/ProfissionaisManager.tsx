import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import ImageUpload from '@/components/ui/image-upload';
import { useTheme } from '@/hooks/useThemeManager';

interface Profissional {
  id: string;
  nome: string;
  especialidade?: string;
  foto_url?: string;
  ativo: boolean;
  created_at: string;
}

const ProfissionaisManager = () => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    especialidade: '',
    foto_url: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { isLightTheme } = useTheme();

  useEffect(() => {
    if (user) {
      fetchProfissionais();
    }
  }, [user]);

  const fetchProfissionais = async () => {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfissionais(data || []);
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os profissionais.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingProfissional) {
        // Atualizar profissional existente
        const { error } = await supabase
          .from('profissionais')
          .update({
            nome: formData.nome.trim(),
            especialidade: formData.especialidade.trim() || null,
            foto_url: formData.foto_url.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProfissional.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Profissional atualizado com sucesso!"
        });
      } else {
        // Criar novo profissional
        const { error } = await supabase
          .from('profissionais')
          .insert({
            user_id: user?.id,
            nome: formData.nome.trim(),
            especialidade: formData.especialidade.trim() || null,
            foto_url: formData.foto_url.trim() || null
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Profissional cadastrado com sucesso!"
        });
      }

      setDialogOpen(false);
      setEditingProfissional(null);
      setFormData({ nome: '', especialidade: '', foto_url: '' });
      fetchProfissionais();
    } catch (error) {
      console.error('Erro ao salvar profissional:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o profissional.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (profissional: Profissional) => {
    setEditingProfissional(profissional);
    setFormData({
      nome: profissional.nome,
      especialidade: profissional.especialidade || '',
      foto_url: profissional.foto_url || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (profissional: Profissional) => {
    if (!confirm(`Tem certeza que deseja excluir o profissional ${profissional.nome}? Isso cancelará todos os agendamentos vinculados a este profissional.`)) {
      return;
    }

    try {
      // Usar a função RPC segura que criamos no banco de dados
      const { data, error } = await supabase
        .rpc('delete_professional_safely', {
          professional_id: profissional.id
        });
      
      if (error) throw error;
      
      if (data) {
        toast({
          title: "Sucesso",
          description: "Profissional excluído com sucesso e agendamentos relacionados foram cancelados!"
        });
        
        fetchProfissionais();
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o profissional."
        });
      }
    } catch (error: any) {
      console.error('Erro ao excluir profissional:', error);
      
      if (error.message && error.message.includes('violates foreign key constraint')) {
        toast({
          title: "Erro",
          description: "Não é possível excluir este profissional porque existem dados vinculados a ele. Considere desativá-lo usando o switch.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o profissional.",
          variant: "destructive"
        });
      }
    }
  };

  const handleToggleActive = async (profissional: Profissional) => {
    try {
      const { error } = await supabase
        .from('profissionais')
        .update({ ativo: !profissional.ativo })
        .eq('id', profissional.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Profissional ${!profissional.ativo ? 'ativado' : 'desativado'} com sucesso!`
      });

      fetchProfissionais();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do profissional.",
        variant: "destructive"
      });
    }
  };

  const handleNewProfissional = () => {
    setEditingProfissional(null);
    setFormData({ nome: '', especialidade: '', foto_url: '' });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">Profissionais</h3>
          <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>Gerencie sua equipe de profissionais</p>

         

        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleNewProfissional}
              className="bg-gold-gradient text-black font-semibold hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Profissional
            </Button>
          </DialogTrigger>
          <DialogContent className={`${isLightTheme ? 'bg-gray-300 border-gold-800 text-black' : 'bg-gray-900 border-gray-700 text-white'} max-w-md`}>
            <DialogHeader>
              <DialogTitle>
                {editingProfissional ? 'Editar Profissional' : 'Novo Profissional'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="foto">Foto do Profissional</Label>
                <ImageUpload
                  value={formData.foto_url}
                  onChange={(url) => setFormData({ ...formData, foto_url: url })}
                  onRemove={() => setFormData({ ...formData, foto_url: '' })}
                />
              </div>

              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}
                  placeholder="Nome do profissional"
                  required
                />
              </div>

              <div>
                <Label htmlFor="especialidade">Especialidade</Label>
                <Input
                  id="especialidade"
                  value={formData.especialidade}
                  onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                  className={`${isLightTheme ? 'bg-gray-200 border-gold-800' : 'bg-gray-800 border-gray-600'}`}
                  placeholder="Especialidade do profissional"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="bg-gold-gradient text-black font-semibold hover:opacity-90">
                  {editingProfissional ? 'Atualizar' : 'Cadastrar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className={`${isLightTheme ? 'border-gold-800 text-gray-900' : 'border-gray-600 text-gray-900'}`}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {profissionais.length === 0 ? (
        <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>
          <CardContent className="text-center py-8">
            <User className={`${isLightTheme ? 'text-black' : 'text-white'} h-12 w-12 mx-auto mb-4`} />     
            <h3 className={`${isLightTheme ? 'text-black' : 'text-white'} text-lg font-semibold mb-2`}>Nenhum profissional cadastrado</h3>

            
            <p className={`${isLightTheme ? 'text-gray-500' : 'text-gray-400'} text-sm mb-4`}>Cadastre profissionais para que os clientes possam escolhê-los nos agendamentos.</p>
            <Button 
              onClick={handleNewProfissional}
              className="bg-gold-gradient text-black font-semibold hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Profissional
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profissionais.map((profissional) => (
            <Card key={profissional.id} className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`${isLightTheme ? 'text-black' : 'text-white'} text-lg`}>{profissional.nome}</CardTitle>

               

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={profissional.ativo} className="border-gray-700"
                      onCheckedChange={() => handleToggleActive(profissional)}                    
                    />                   
                    <Badge 
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${profissional.ativo ? 'text-green-500' : 'text-red-500'}`}
                      variant={profissional.ativo ? "default" : "secondary"}
                      >
                      {profissional.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>                   
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profissional.foto_url && (
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden mx-auto">
                      <img 
                        src={profissional.foto_url} 
                        alt={profissional.nome}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {!profissional.foto_url && (
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
                      <User className="h-8 w-8 text-gray-600" />
                    </div>
                  )}

                  {profissional.especialidade && (
                    <p className={`${isLightTheme ? 'text-black' : 'text-gray-400'} text-sm text-center`}>{profissional.especialidade}</p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(profissional)}
                      className="border-gray-600 text-gray-900 hover:bg-gray-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(profissional)}
                      className="border-red-600 text-red-400 hover:bg-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfissionaisManager;
