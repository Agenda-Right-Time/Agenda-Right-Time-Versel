
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const SalaoPhotoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchCurrentPhoto();
    }
  }, [user]);

  const fetchCurrentPhoto = async () => {
    try {
      console.log('🔍 Buscando foto atual do estabelecimento...');
      
      const { data, error } = await supabase
        .from('configuracoes')
        .select('foto_estabelecimento_url')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar foto:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Foto encontrada:', data.foto_estabelecimento_url);
        setPhotoUrl(data.foto_estabelecimento_url || null);
      } else {
        console.log('ℹ️ Nenhuma foto encontrada');
        setPhotoUrl(null);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar foto atual:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive"
        });
        return;
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive"
        });
        return;
      }

      console.log('📤 Iniciando upload da foto...');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/estabelecimento-${Date.now()}.${fileExt}`;

      // Upload do arquivo para o novo bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('estabelecimento-fotos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('❌ Erro no upload:', uploadError);
        throw uploadError;
      }

      console.log('✅ Upload realizado:', uploadData);

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('estabelecimento-fotos')
        .getPublicUrl(fileName);

      console.log('🔗 URL pública gerada:', publicUrl);

      // Atualizar URL na tabela configuracoes
      const { data: updateData, error: updateError } = await supabase
        .from('configuracoes')
        .upsert({
          user_id: user?.id,
          foto_estabelecimento_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (updateError) {
        console.error('❌ Erro ao atualizar configuração:', updateError);
        throw updateError;
      }

      console.log('✅ Configuração atualizada:', updateData);

      setPhotoUrl(publicUrl);
      toast({
        title: "Foto atualizada com sucesso! 🎉",
        description: "A foto do seu estabelecimento foi atualizada."
      });

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da foto. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Limpar o input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removePhoto = async () => {
    if (!confirm('Tem certeza que deseja remover a foto do estabelecimento?')) {
      return;
    }

    try {
      setUploading(true);
      console.log('🗑️ Removendo foto do estabelecimento...');

      // Remover do storage se existir
      if (photoUrl && user?.id) {
        // Extrair o nome do arquivo da URL
        const urlParts = photoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const fullPath = `${user.id}/${fileName}`;
        
        console.log('📁 Removendo arquivo:', fullPath);
        
        await supabase.storage
          .from('estabelecimento-fotos')
          .remove([fullPath]);
      }

      // Atualizar configuração
      const { error } = await supabase
        .from('configuracoes')
        .upsert({
          user_id: user?.id,
          foto_estabelecimento_url: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Erro ao atualizar configuração:', error);
        throw error;
      }

      console.log('✅ Foto removida com sucesso');

      setPhotoUrl(null);
      toast({
        title: "Foto removida",
        description: "A foto do estabelecimento foi removida com sucesso."
      });

    } catch (error) {
      console.error('❌ Erro ao remover foto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ImageIcon className="h-5 w-5 mr-2 text-gold-400" />
            Foto do Estabelecimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-gray-800 rounded-lg"></div>
            <div className="h-10 bg-gray-800 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ImageIcon className="h-5 w-5 mr-2 text-gold-400" />
          Foto do Estabelecimento
        </CardTitle>
        <p className="text-gray-400 text-sm">
          Esta foto será exibida para os clientes na página de agendamento
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {photoUrl && (
          <div className="relative">
            <img 
              src={photoUrl} 
              alt="Foto do estabelecimento" 
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={removePhoto}
              disabled={uploading}
              className="absolute top-2 right-2 border-red-600 text-red-400 hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div>
          <Label htmlFor="photo-upload">
            {photoUrl ? 'Atualizar Foto' : 'Upload da Foto'}
          </Label>
          <div className="mt-2">
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={uploadPhoto}
              disabled={uploading}
              className="bg-gray-800 border-gray-600"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Formatos aceitos: JPG, PNG, GIF • Tamanho máximo: 5MB
          </p>
        </div>

        {!photoUrl && (
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">
              Nenhuma foto do estabelecimento cadastrada
            </p>
            <p className="text-gray-500 text-sm">
              Faça upload de uma foto para que os clientes vejam seu estabelecimento
            </p>
          </div>
        )}

        {uploading && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Processando...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalaoPhotoUpload;
