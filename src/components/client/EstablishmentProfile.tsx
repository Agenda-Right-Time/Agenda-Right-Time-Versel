
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Phone, Clock, Star, Camera } from 'lucide-react';
import { useClientOnlyAuth } from '@/hooks/useClientOnlyAuth';
import { useAuth } from '@/hooks/useAuth';
import EstablishmentRating from './EstablishmentRating';

interface EstablishmentData {
  nome: string;
  telefone?: string;
  email?: string;
  empresa: string;
  endereco?: string;
  cidade?: string;
  foto_estabelecimento_url?: string;
  horario_abertura?: string;
  horario_fechamento?: string;
  dias_funcionamento?: string[];
  servicos?: Array<{
    id: string;
    nome: string;
    preco: number;
    duracao: number;
    descricao?: string;
  }>;
  profissionais?: Array<{
    id: string;
    nome: string;
    especialidade?: string;
    foto_url?: string;
  }>;
}

interface EstablishmentProfileProps {
  ownerId: string;
}

const EstablishmentProfile = ({ ownerId }: EstablishmentProfileProps) => {
  const [establishment, setEstablishment] = useState<EstablishmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { clientProfile } = useClientOnlyAuth();
  const { user } = useAuth(); // Para pegar qualquer usuário logado

  // Função para verificar se é um UUID válido
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Verificar se estabelecimento tem dados válidos
  const hasValidData = (data: EstablishmentData | null): boolean => {
    return data !== null && data.nome !== '';
  };

  const fetchEstablishmentData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Buscando dados do estabelecimento:', ownerId);

      // Se não é um UUID válido, não carregar dados
      if (!isValidUUID(ownerId)) {
        console.log('📋 ID inválido, não carregando dados');
        setEstablishment(null);
        setLoading(false);
        return;
      }

      // Buscar dados do profissional/estabelecimento
      const { data: profileData, error: profileError } = await supabase
        .from('profissional_profiles')
        .select('*')
        .eq('id', ownerId)
        .maybeSingle();

      if (profileError || !profileData) {
        console.error('❌ Erro ao buscar perfil:', profileError);
        setEstablishment(null);
        setLoading(false);
        return;
      }

      // Buscar configurações do estabelecimento
      const { data: configData } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', ownerId)
        .maybeSingle();

      // Buscar serviços
      const { data: servicosData } = await supabase
        .from('servicos')
        .select('*')
        .eq('user_id', ownerId)
        .eq('ativo', true)
        .order('nome');

      // Buscar profissionais
      const { data: profissionaisData } = await supabase
        .from('profissionais')
        .select('*')
        .eq('user_id', ownerId)
        .eq('ativo', true)
        .order('nome');

      // Montar dados do estabelecimento apenas com dados reais
      const establishmentData: EstablishmentData = {
        nome: profileData.nome,
        telefone: configData?.telefone_estabelecimento || profileData.telefone,
        email: profileData.email,
        empresa: configData?.nome_estabelecimento || profileData.empresa,
        endereco: configData?.endereco,
        cidade: configData?.cidade,
        foto_estabelecimento_url: configData?.foto_estabelecimento_url || profileData.foto_salao_url,
        horario_abertura: configData?.horario_abertura,
        horario_fechamento: configData?.horario_fechamento,
        dias_funcionamento: configData?.dias_funcionamento,
        servicos: servicosData || [],
        profissionais: profissionaisData || []
      };

      console.log('✅ Dados do estabelecimento carregados:', establishmentData);
      setEstablishment(establishmentData);

    } catch (error) {
      console.error('❌ Erro ao buscar dados do estabelecimento:', error);
      setEstablishment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerId) {
      fetchEstablishmentData();
    }
  }, [ownerId, refreshTrigger]);

  const handleRatingSubmitted = () => {
    setRefreshTrigger(prev => prev + 1);
    // Disparar refresh do header do estabelecimento
    window.postMessage({ type: 'REFRESH_ESTABLISHMENT_HEADER', ownerId }, '*');
  };

  const formatDaysOfWeek = (days: string[]) => {
    const dayNames: { [key: string]: string } = {
      monday: 'Segunda',
      tuesday: 'Terça',
      wednesday: 'Quarta',
      thursday: 'Quinta',
      friday: 'Sexta',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };
    
    return days.map(day => dayNames[day] || day).join(', ');
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.slice(0, 5); // Remove segundos se houver
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-700 rounded-lg mb-4"></div>
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!establishment || !hasValidData(establishment)) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Não foi possível carregar os dados do estabelecimento.</p>
        <p className="text-gray-500 text-sm mt-2">
          Verifique se o profissional configurou suas informações na dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do Estabelecimento */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Foto do Estabelecimento */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                {establishment.foto_estabelecimento_url ? (
                  <img 
                    src={establishment.foto_estabelecimento_url} 
                    alt={establishment.empresa}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-gray-500" />
                )}
              </div>
            </div>
            
            {/* Informações Principais */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">{establishment.empresa}</h1>
              <p className="text-gray-300 mb-4">Proprietário: {establishment.nome}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {establishment.telefone && (
                  <div className="flex items-center text-gray-300">
                    <Phone className="h-4 w-4 mr-2 text-gold-400" />
                    <span>{establishment.telefone}</span>
                  </div>
                )}
                
                {establishment.endereco && (
                  <div className="flex items-center text-gray-300">
                    <MapPin className="h-4 w-4 mr-2 text-gold-400" />
                    <span>{establishment.endereco}</span>
                  </div>
                )}
                
                {establishment.cidade && (
                  <div className="flex items-center text-gray-300">
                    <MapPin className="h-4 w-4 mr-2 text-gold-400" />
                    <span>{establishment.cidade}</span>
                  </div>
                )}
                
                {establishment.horario_abertura && establishment.horario_fechamento && (
                  <div className="flex items-center text-gray-300">
                    <Clock className="h-4 w-4 mr-2 text-gold-400" />
                    <span>
                      {formatTime(establishment.horario_abertura)} às {formatTime(establishment.horario_fechamento)}
                    </span>
                  </div>
                )}
              </div>
              
              {establishment.dias_funcionamento && establishment.dias_funcionamento.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">Dias de funcionamento:</p>
                  <p className="text-gray-300">{formatDaysOfWeek(establishment.dias_funcionamento)}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profissionais */}
      {establishment.profissionais && establishment.profissionais.length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Nossa Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {establishment.profissionais.map((profissional) => (
                <div key={profissional.id} className="bg-gray-800 p-4 rounded-lg flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                    {profissional.foto_url ? (
                      <img 
                        src={profissional.foto_url} 
                        alt={profissional.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gold-400 font-semibold">
                        {profissional.nome.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{profissional.nome}</h3>
                    {profissional.especialidade && (
                      <p className="text-gray-400 text-sm">{profissional.especialidade}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção de Avaliação - Para qualquer usuário logado */}
      {user && (
        <EstablishmentRating
          ownerId={ownerId}
          clientId={user.id}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </div>
  );
};

export default EstablishmentProfile;
