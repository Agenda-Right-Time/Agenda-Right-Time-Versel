
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Star, MapPin, Clock, Phone, Mail } from 'lucide-react';

interface EstablishmentData {
  nome: string;
  empresa?: string;
  endereco?: string;
  telefone?: string;
  telefone_estabelecimento?: string;
  foto_url?: string;
  avaliacao_media?: number;
  total_avaliacoes?: number;
  horario_abertura?: string;
  horario_fechamento?: string;
  dias_funcionamento?: string[];
}

interface EstablishmentInfoProps {
  ownerId: string;
}

const EstablishmentInfo = ({ ownerId }: EstablishmentInfoProps) => {
  const [establishment, setEstablishment] = useState<EstablishmentData | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para verificar se é um UUID válido
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };


  useEffect(() => {
    const fetchEstablishmentInfo = async () => {
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
          .select('nome, empresa, telefone')
          .eq('id', ownerId)
          .single();

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError);
          setLoading(false);
          return;
        }

        // Buscar endereço e telefone das configurações
        const { data: config, error: configError } = await supabase
          .from('configuracoes')
          .select('endereco, telefone_estabelecimento, foto_estabelecimento_url, horario_abertura, horario_fechamento, dias_funcionamento')
          .eq('user_id', ownerId)
          .single();

        if (configError) {
          console.error('Erro ao buscar configurações:', configError);
        }

        // Buscar foto do estabelecimento (mantendo compatibilidade com tabela antiga)
        const { data: fotoData, error: fotoError } = await supabase
          .from('salao_fotos')
          .select('foto_url')
          .eq('user_id', ownerId)
          .maybeSingle();

        if (fotoError) {
          console.error('Erro ao buscar foto:', fotoError);
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
          empresa: profile.empresa,
          endereco: config?.endereco,
          telefone: profile.telefone,
          telefone_estabelecimento: config?.telefone_estabelecimento,
          foto_url: config?.foto_estabelecimento_url || fotoData?.foto_url,
          avaliacao_media: avaliacaoMedia,
          total_avaliacoes: totalAvaliacoes,
          horario_abertura: config?.horario_abertura,
          horario_fechamento: config?.horario_fechamento,
          dias_funcionamento: config?.dias_funcionamento
        });

      } catch (error) {
        console.error('Erro ao buscar informações do estabelecimento:', error);
      } finally {
        setLoading(false);
      }
    };

    if (ownerId) {
      fetchEstablishmentInfo();
    }
  }, [ownerId]);

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!establishment) {
    return null;
  }

  const displayName = establishment.empresa || establishment.nome;
  const displayPhone = establishment.telefone_estabelecimento || establishment.telefone;

  return (
    <Card className="bg-gray-900 border-gray-700 mb-6">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Foto do estabelecimento */}
          <div className="flex-shrink-0">
            {establishment.foto_url ? (
              <img
                src={establishment.foto_url}
                alt={`Foto de ${displayName}`}
                className="w-20 h-20 rounded-lg object-cover border-2 border-gold-500"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-600">
                <span className="text-gray-400 text-xs text-center">Sem foto</span>
              </div>
            )}
          </div>

          {/* Informações do estabelecimento */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white mb-2 truncate">
              {displayName}
            </h3>

            {/* Avaliação */}
            {establishment.total_avaliacoes > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.floor(establishment.avaliacao_media!)
                          ? 'text-yellow-400 fill-current'
                          : star <= establishment.avaliacao_media!
                          ? 'text-yellow-400 fill-current opacity-50'
                          : 'text-gray-400'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-yellow-400 font-medium">
                  {establishment.avaliacao_media!.toFixed(1)}
                </span>
                <span className="text-gray-400 text-sm">
                  ({establishment.total_avaliacoes} avaliação{establishment.total_avaliacoes !== 1 ? 'ões' : ''})
                </span>
              </div>
            )}

            {/* Informações adicionais */}
            <div className="space-y-1 text-sm">
              {establishment.endereco && (
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="h-4 w-4 text-gold-500 flex-shrink-0" />
                  <span className="truncate">{establishment.endereco}</span>
                </div>
              )}
              
              {displayPhone && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone className="h-4 w-4 text-gold-500 flex-shrink-0" />
                  <span>{displayPhone}</span>
                </div>
              )}

              {establishment.horario_abertura && establishment.horario_fechamento && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="h-4 w-4 text-gold-500 flex-shrink-0" />
                  <span>
                    Funcionamento: {establishment.horario_abertura.substring(0, 5)} às {establishment.horario_fechamento.substring(0, 5)}
                    {establishment.dias_funcionamento && establishment.dias_funcionamento.length > 0 && (
                      <span className="text-gray-400 ml-1">
                        ({establishment.dias_funcionamento.length < 7 ? 
                          (() => {
                            const dayNames = {
                              'monday': 'Seg',
                              'tuesday': 'Ter',
                              'wednesday': 'Qua',
                              'thursday': 'Qui',
                              'friday': 'Sex',
                              'saturday': 'Sáb',
                              'sunday': 'Dom'
                            };
                            return establishment.dias_funcionamento.map(day => dayNames[day]).join(', ');
                          })() : 
                          'Todos os dias'
                        })
                      </span>
                    )}
                  </span>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Indicador de qualidade */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-400">Estabelecimento verificado</span>
            </div>
            <span className="text-gray-400">
              Agendamento online disponível
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EstablishmentInfo;
