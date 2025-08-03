
import React, { useState, useRef } from 'react';
import { Button } from './button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Upload, X, Image } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onRemove,
  disabled
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho do arquivo (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Gerar nome único para o arquivo
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      // Upload do arquivo
      const { data, error } = await supabase.storage
        .from('profissionais-fotos')
        .upload(fileName, file);

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('profissionais-fotos')
        .getPublicUrl(data.path);

      onChange(publicUrl);
      
      toast({
        title: "Sucesso",
        description: "Foto enviada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a foto.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value || !user) return;

    try {
      // Extrair o path do arquivo da URL
      const url = new URL(value);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = `${user.id}/${fileName}`;

      // Remover arquivo do storage
      const { error } = await supabase.storage
        .from('profissionais-fotos')
        .remove([filePath]);

      if (error) {
        console.warn('Erro ao remover arquivo do storage:', error);
        // Continuar mesmo com erro, pois pode ser que o arquivo já tenha sido removido
      }

      onRemove();
      
      toast({
        title: "Sucesso",
        description: "Foto removida com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      // Remover da interface mesmo com erro
      onRemove();
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {value ? (
        <div className="relative">
          <div className="w-32 h-32 rounded-lg border-2 border-gray-300 overflow-hidden bg-gray-100">
            <img
              src={value}
              alt="Foto do profissional"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 p-0"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="text-center">
            <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhuma foto</p>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {isUploading ? 'Enviando...' : value ? 'Alterar Foto' : 'Enviar Foto'}
      </Button>
    </div>
  );
};

export default ImageUpload;
