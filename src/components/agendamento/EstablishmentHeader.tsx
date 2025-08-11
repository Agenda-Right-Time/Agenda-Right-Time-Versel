
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Star, ImageIcon } from 'lucide-react';
import { useTheme } from '@/hooks/useThemeManager';

interface EstablishmentData {
  nome: string;
  nome_estabelecimento?: string;
  empresa?: string;
  foto_salao_url?: string;
  avaliacao_media?: number;
  total_avaliacoes?: number;
}

interface EstablishmentHeaderProps {
  ownerId: string;
}

const EstablishmentHeader = ({ ownerId }: EstablishmentHeaderProps) => {
  const [establishment, setEstablishment] = useState<EstablishmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isLightTheme } = useTheme();

  // Função para verificar se é um UUID válido
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };


  useEffect(() => {
    const fetchEstablishmentInfo = async () => {
      console.log('🔍 Buscando informações do estabelecimento para:', ownerId);
      
      // Se não for um UUID válido, não mostrar dados
      if (!isValidUUID(ownerId)) {
        console.log('📋 ID inválido, não mostrando dados de estabelecimento:', ownerId);
        setEstablishment(null);
        setLoading(false);
        return;
      }

      try {
        // Buscar dados do perfil
        const { data: profile, error: profileError } = await supabase
          .from('profissional_profiles')
          .select('nome, empresa, foto_salao_url')
          .eq('id', ownerId)
          .single();

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError);
          setEstablishment(null);
          setLoading(false);
          return;
        }

        // Buscar nome do estabelecimento das configurações
        const { data: config, error: configError } = await supabase
          .from('configuracoes')
          .select('nome_estabelecimento, foto_estabelecimento_url')
          .eq('user_id', ownerId)
          .single();

        if (configError) {
          console.error('Erro ao buscar configurações:', configError);
        }

        // Buscar avaliações para calcular média
        const { data: avaliacoes, error: avaliacoesError } = await supabase
          .from('avaliacoes')
          .select('nota')
          .eq('user_id', ownerId);

        if (avaliacoesError) {
          console.error('Erro ao buscar avaliações:', avaliacoesError);
        }

        let avaliacaoMedia = 0;
        let totalAvaliacoes = 0;

        if (avaliacoes && avaliacoes.length > 0) {
          totalAvaliacoes = avaliacoes.length;
          const somaNotas = avaliacoes.reduce((acc, av) => acc + av.nota, 0);
          avaliacaoMedia = somaNotas / totalAvaliacoes;
        }

        setEstablishment({
          nome: profile.nome,
          nome_estabelecimento: config?.nome_estabelecimento,
          empresa: profile.empresa,
          foto_salao_url: config?.foto_estabelecimento_url || profile.foto_salao_url,
          avaliacao_media: avaliacaoMedia,
          total_avaliacoes: totalAvaliacoes
        });

        console.log('✅ Dados do estabelecimento carregados com sucesso');

      } catch (error) {
        console.error('Erro ao buscar informações do estabelecimento:', error);
        setEstablishment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEstablishmentInfo();
  }, [ownerId, refreshTrigger]);

  // Função para atualizar os dados (pode ser chamada de outros componentes)
  const refresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Adicionar um listener para mensagens de atualização
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'REFRESH_ESTABLISHMENT_HEADER' && event.data.ownerId === ownerId) {
        refresh();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [ownerId]);

  if (loading) {
    return (
      <div className="flex justify-center mb-8">
        <Card className="bg-gray-900 border-gray-700 w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-24 h-24 bg-gray-700 rounded-full animate-pulse"></div>
              <div className="space-y-2 text-center">
                <div className="h-6 bg-gray-700 rounded animate-pulse w-48"></div>
                <div className="h-4 bg-gray-700 rounded animate-pulse w-32"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!establishment) {
    return null;
  }

  // Determinar o nome a ser exibido (prioridade: nome_estabelecimento > empresa > nome)
  const displayName = establishment.nome_estabelecimento || establishment.empresa || establishment.nome;

  const renderStars = (rating: number) => {
    return (
      <div className="flex justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= Math.floor(rating)
                ? 'text-yellow-400 fill-current'
                : star <= rating
                ? 'text-yellow-400 fill-current opacity-50'
                : 'text-gray-400'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex justify-center mb-8">
      <Card className={`${isLightTheme ? 'from-gray-300 to-gray-800 border-gold-800' : 'from-gray-900 to-gray-800 border-gold-500/20'} bg-gradient-to-b shadow-xl w-full max-w-md`}> 
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Foto do estabelecimento */}
            <div className="relative">
              {establishment.foto_salao_url ? (
                <img
                  src={establishment.foto_salao_url}
                  alt={`Foto de ${displayName}`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gold-500 shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center border-4 border-gold-500/50 shadow-lg ${establishment.foto_salao_url ? 'hidden' : ''}`}>
                <ImageIcon className="h-8 w-8 text-gold-400" />
              </div>
            </div>

            {/* Nome do estabelecimento */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2 leading-tight">
                {displayName}
              </h2>

              {/* Avaliações */}
              {establishment.total_avaliacoes && establishment.total_avaliacoes > 0 ? (
                <div className="space-y-2">
                  {renderStars(establishment.avaliacao_media!)}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-yellow-400 font-semibold text-sm">
                      {establishment.avaliacao_media!.toFixed(1)}
                    </span>
                    <span className="text-gray-400 text-sm">
                      ({establishment.total_avaliacoes} avaliação{establishment.total_avaliacoes !== 1 ? 'ões' : ''})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 text-gray-500" />
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm">Sem avaliações ainda</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EstablishmentHeader;
