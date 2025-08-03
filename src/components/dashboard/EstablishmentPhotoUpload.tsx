import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Image as ImageIcon, Trash2, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const EstablishmentPhotoUpload = () => {
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
      const { data, error } = await supabase
        .from('configuracoes')
        .select('foto_estabelecimento_url')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setPhotoUrl(data?.foto_estabelecimento_url || null);
    } catch (error) {
      console.error('Erro ao buscar foto:', error);
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
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive"
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive"
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/estabelecimento-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('estabelecimento-fotos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('estabelecimento-fotos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('configuracoes')
        .upsert({
          user_id: user?.id,
          foto_estabelecimento_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        throw updateError;
      }

      setPhotoUrl(publicUrl);
      toast({
        title: "Foto atualizada!",
        description: "A foto do estabelecimento foi atualizada com sucesso."
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da foto.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
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

      if (photoUrl && user?.id) {
        const urlParts = photoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const fullPath = `${user.id}/${fileName}`;
        
        await supabase.storage
          .from('estabelecimento-fotos')
          .remove([fullPath]);
      }

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
        throw error;
      }

      setPhotoUrl(null);
      toast({
        title: "Foto removida",
        description: "A foto do estabelecimento foi removida com sucesso."
      });

    } catch (error) {
      console.error('Erro ao remover foto:', error);
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-800 rounded animate-pulse w-32"></div>
        </div>
        <div className="h-24 bg-gray-800 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Foto do Estabelecimento</Label>
        {photoUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removePhoto}
            disabled={uploading}
            className="border-red-600 text-red-400 hover:bg-red-600 h-7 px-2"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Preview da foto */}
        <div className="flex-shrink-0">
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt="Foto do estabelecimento" 
              className="w-16 h-16 object-cover rounded-lg border-2 border-gray-600"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
              <Camera className="h-6 w-6 text-gray-500" />
            </div>
          )}
        </div>

        {/* Upload input customizado */}
        <div className="flex-1 space-y-2">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={uploadPhoto}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              id="photo-upload"
            />
            <label 
              htmlFor="photo-upload" 
              className="flex items-center justify-center w-full h-10 px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-md cursor-pointer hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              {photoUrl ? 'Alterar foto' : 'Fazer upload'}
            </label>
          </div>
          <p className="text-xs text-gray-400">
            {photoUrl ? 'Clique para alterar a foto' : 'Fazer upload da foto do estabelecimento'} • Max: 5MB
          </p>
        </div>
      </div>

      {uploading && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold-500"></div>
          <span className="text-sm text-gray-400">Processando...</span>
        </div>
      )}
    </div>
  );
};

export default EstablishmentPhotoUpload;
