
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useCompanySlug = () => {
  const { empresaSlug } = useParams<{ empresaSlug: string }>();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOwnerId = async () => {
      if (!empresaSlug) {
        setError('Slug da empresa não encontrado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Buscando profissional com slug:', empresaSlug);

        // Primeiro, vamos listar todos os registros para debug
        const { data: allProfiles } = await supabase
          .from('profissional_profiles')
          .select('id, empresa_slug, nome')
          .limit(10);
        
        console.log('📋 Todos os profissionais encontrados:', allProfiles);

        // Buscar o profissional usando o empresa_slug
        const { data, error: fetchError } = await supabase
          .from('profissional_profiles')
          .select('id, empresa_slug, nome')
          .eq('empresa_slug', empresaSlug)
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Erro ao buscar profissional:', fetchError);
          setError('Erro ao buscar estabelecimento');
          return;
        }

        if (!data) {
          console.log('❌ Estabelecimento não encontrado para slug:', empresaSlug);
          setError('Estabelecimento não encontrado');
          return;
        }

        console.log('✅ Profissional encontrado:', data);
        setOwnerId(data.id);
      } catch (error) {
        console.error('❌ Erro ao buscar owner ID:', error);
        setError('Erro interno');
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerId();
  }, [empresaSlug]);

  return {
    empresaSlug,
    ownerId,
    loading,
    error
  };
};
