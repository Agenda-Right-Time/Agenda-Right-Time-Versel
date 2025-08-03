
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BusinessData {
  userId: string;
  businessName: string;
  businessInfo: any;
}

export const useBusinessData = (userId: string | null) => {
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Buscando dados da empresa para o usuário:', userId);

        // Buscar o perfil do profissional
        const { data: profile, error: profileError } = await supabase
          .from('profissional_profiles')
          .select('id, nome, empresa, empresa_slug')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('❌ Erro ao buscar perfil:', profileError);
          setError('Erro ao buscar dados da empresa');
          return;
        }

        if (!profile) {
          console.log('❌ Perfil não encontrado');
          setError('Perfil não encontrado');
          return;
        }

        // Buscar configurações da empresa
        const { data: config, error: configError } = await supabase
          .from('configuracoes')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (configError) {
          console.error('❌ Erro ao buscar configurações:', configError);
        }

        setBusinessData({
          userId: profile.id,
          businessName: config?.nome_estabelecimento || profile.nome,
          businessInfo: {
            ...config,
            empresa: profile.empresa,
            empresa_slug: profile.empresa_slug
          }
        });

        console.log('✅ Dados da empresa carregados:', {
          userId: profile.id,
          businessName: config?.nome_estabelecimento || profile.nome,
          empresa: profile.empresa
        });

      } catch (error) {
        console.error('❌ Erro inesperado:', error);
        setError('Erro inesperado ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [userId]);

  return { businessData, loading, error };
};
