
import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useClientOnlyAuth = (empresaSlug?: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [ownerHasAccess, setOwnerHasAccess] = useState<boolean | null>(null);
  const [hasAccessToThisProfessional, setHasAccessToThisProfessional] = useState<boolean | null>(null);

  const fetchClientProfile = useCallback(async (userId: string) => {
    console.log('🔍 Buscando perfil do cliente para userId:', userId);
    
    try {
      const { data: profile, error } = await supabase
        .from('cliente_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Erro ao buscar perfil do cliente:', error);
        return null;
      }
      
      console.log('✅ Perfil do cliente encontrado:', profile);
      return profile;
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar perfil:', error);
      return null;
    }
  }, []);

  const checkOwnerAccess = useCallback(async (empresaSlug: string) => {
    console.log('🔍 Verificando acesso do proprietário da empresa:', empresaSlug);
    
    if (empresaSlug === 'demo' || empresaSlug === 'demo-owner') {
      console.log('✅ Acesso demo aprovado');
      return true;
    }
    
    try {
      // Primeiro buscar o ID do profissional pelo slug
      const { data: professional, error: profError } = await supabase
        .rpc('get_professional_by_slug', { slug: empresaSlug });
      
      if (profError || !professional) {
        console.error('❌ Profissional não encontrado para slug:', empresaSlug, profError);
        return false;
      }
      
      // Verificar se o estabelecimento está ativo
      const { data, error } = await supabase.rpc('is_establishment_active', {
        owner_id: professional
      });
      
      if (error) {
        console.error('❌ Erro ao verificar acesso:', error);
        return false;
      }
      
      console.log('✅ Status de acesso:', { hasActiveAccess: data });
      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao verificar acesso:', error);
      return false;
    }
  }, []);

  const checkClientAccessToProfessional = useCallback(async (clientId: string, empresaSlug: string) => {
    console.log('🔍 [DEBUG] Verificando se cliente tem acesso ao profissional:', { clientId, empresaSlug });
    
    if (empresaSlug === 'demo' || empresaSlug === 'demo-owner') {
      console.log('✅ [DEBUG] Acesso demo aprovado para cliente');
      return true;
    }
    
    try {
      // Buscar o ID do profissional pelo slug
      console.log('🔍 [DEBUG] Buscando profissional pelo slug:', empresaSlug);
      const { data: professionalId, error: slugError } = await supabase
        .rpc('get_professional_by_slug', { slug: empresaSlug });
      
      console.log('🔍 [DEBUG] Resultado da busca do profissional:', { professionalId, slugError });
      
      if (slugError || !professionalId) {
        console.error('❌ [DEBUG] Profissional não encontrado para slug:', empresaSlug, slugError);
        return false;
      }
      
      // Verificar se o cliente está associado a este profissional
      console.log('🔍 [DEBUG] Buscando perfil do cliente:', clientId);
      const { data: profile, error: profileError } = await supabase
        .from('cliente_profiles')
        .select('profissional_vinculado')
        .eq('id', clientId)
        .maybeSingle();
      
      console.log('🔍 [DEBUG] Resultado da busca do perfil:', { profile, profileError });
      
      if (profileError) {
        console.error('❌ [DEBUG] Erro ao buscar perfil do cliente:', profileError);
        return false;
      }
      
      const hasAccess = profile?.profissional_vinculado === professionalId;
      console.log('🔐 [DEBUG] DECISÃO FINAL - Cliente tem acesso a este profissional:', { 
        hasAccess, 
        clienteProfissionalVinculado: profile?.profissional_vinculado, 
        professionalAtualId: professionalId,
        saoIguais: profile?.profissional_vinculado === professionalId
      });
      
      return hasAccess;
    } catch (error) {
      console.error('❌ [DEBUG] Erro inesperado ao verificar acesso do cliente:', error);
      return false;
    }
  }, []);

  const associateClientToProfessional = useCallback(async (clientId: string, empresaSlug: string) => {
    try {
      console.log('🔗 Associando cliente ao profissional via slug:', { clientId, empresaSlug });
      
      // Buscar o ID do profissional pelo slug
      const { data: professionalId, error: slugError } = await supabase
        .rpc('get_professional_by_slug', { slug: empresaSlug });
      
      if (slugError || !professionalId) {
        console.error('❌ Profissional não encontrado para slug:', empresaSlug, slugError);
        return;
      }
      
      // Atualizar o perfil do cliente com o profissional vinculado
      const { error: updateError } = await supabase
        .from('cliente_profiles')
        .update({ 
          profissional_vinculado: professionalId,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      if (updateError) {
        console.error('❌ Erro ao associar cliente ao profissional:', updateError);
        return;
      }

      // Também inserir na tabela de associações se não existir
      const { error: associationError } = await supabase
        .from('cliente_profissional_associations')
        .insert({
          cliente_id: clientId,
          profissional_id: professionalId
        })
        .select()
        .maybeSingle();

      if (associationError && !associationError.message.includes('duplicate')) {
        console.error('❌ Erro ao criar associação:', associationError);
      } else {
        console.log('✅ Cliente associado ao profissional com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro inesperado na associação:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authListener: any = null;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Inicializando autenticação específica do cliente...');
        console.log('📍 Empresa/Profissional alvo:', empresaSlug);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erro ao obter sessão:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }
        
        console.log('🔄 Sessão inicial do cliente:', session?.user?.id || 'sem sessão');
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          const promises = [];
          
          if (session?.user) {
            promises.push(fetchClientProfile(session.user.id));
          }
          
          if (empresaSlug) {
            promises.push(checkOwnerAccess(empresaSlug));
          }
          
          const results = await Promise.all(promises);
          
          if (mounted) {
            if (session?.user && results[0] !== undefined) {
              setClientProfile(results[0]);
              
              // Se perfil existe mas não tem profissional vinculado, fazer associação
              if (results[0] && empresaSlug && !results[0].profissional_vinculado) {
                console.log('🔗 Cliente sem profissional vinculado, fazendo associação...');
                await associateClientToProfessional(session.user.id, empresaSlug);
                // Buscar perfil atualizado
                const updatedProfile = await fetchClientProfile(session.user.id);
                setClientProfile(updatedProfile);
              }
              
              // Verificar se cliente tem acesso a este profissional específico
              if (results[0] && empresaSlug) {
                console.log('🔍 [DEBUG] Iniciando verificação de acesso ao profissional específico...');
                const hasAccess = await checkClientAccessToProfessional(session.user.id, empresaSlug);
                console.log('🔍 [DEBUG] Resultado da verificação de acesso:', hasAccess);
                setHasAccessToThisProfessional(hasAccess);
              }
            }
            
            if (empresaSlug && results[empresaSlug ? 1 : 0] !== undefined) {
              setOwnerHasAccess(results[empresaSlug ? 1 : 0]);
            }
            
            setLoading(false);
          }
        }

        if (!authListener) {
          authListener = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;
            
            console.log('Cliente auth state changed:', event, session?.user?.id || 'sem sessão');
            
            setSession(session);
            setUser(session?.user ?? null);
            
            // Use setTimeout para evitar deadlock conforme documentação do Supabase
            if (session?.user) {
              setTimeout(async () => {
                if (!mounted) return;
                
                const profile = await fetchClientProfile(session.user.id);
                if (mounted) {
                  setClientProfile(profile);
                  
                  // Fazer associação se necessário
                  if (profile && empresaSlug && !profile.profissional_vinculado) {
                    console.log('🔗 Novo login, fazendo associação...');
                    await associateClientToProfessional(session.user.id, empresaSlug);
                    const updatedProfile = await fetchClientProfile(session.user.id);
                    setClientProfile(updatedProfile);
                  }
                  
                  // Verificar acesso ao profissional específico
                  if (profile && empresaSlug) {
                    console.log('🔍 [DEBUG] Verificando acesso no auth state change...');
                    const hasAccess = await checkClientAccessToProfessional(session.user.id, empresaSlug);
                    console.log('🔍 [DEBUG] Resultado da verificação no auth state change:', hasAccess);
                    setHasAccessToThisProfessional(hasAccess);
                  }
                }
              }, 0);
            } else {
              if (mounted) {
                setClientProfile(null);
                setHasAccessToThisProfessional(null);
                setLoading(false);
              }
            }
          });
        }

      } catch (error) {
        console.error('❌ Erro na inicialização da auth do cliente:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('⚠️ Timeout de carregamento do cliente, forçando parada');
        setLoading(false);
      }
    }, 3000);

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (authListener?.data?.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, [empresaSlug, checkOwnerAccess, fetchClientProfile, associateClientToProfessional, checkClientAccessToProfessional]);

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Fazendo login do cliente...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (!error && data.user) {
      console.log('✅ Cliente logado com sucesso');
      
      // Fazer associação após login se necessário
      if (empresaSlug) {
        setTimeout(async () => {
          const profile = await fetchClientProfile(data.user.id);
          if (!profile?.profissional_vinculado) {
            console.log('🔗 Fazendo associação pós-login...');
            await associateClientToProfessional(data.user.id, empresaSlug);
          }
        }, 500);
      }
    }
    
    return { data, error };
  };

  const signUp = async (email: string, password: string, nome: string, telefone?: string) => {
    try {
      console.log('🚀 Cadastrando cliente...');
      console.log('📍 Empresa/Profissional:', empresaSlug);
      
      // 1. Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) {
        console.error('❌ Erro no auth signup:', authError);
        return { data: null, error: authError };
      }

      if (!authData.user) {
        console.error('❌ Usuário não criado');
        return { data: null, error: { message: 'Falha ao criar usuário' } };
      }

      // 2. Buscar profissional pelo empresa_slug
      let professionalId = null;
      if (empresaSlug) {
        console.log('🔍 [DEBUG SIGNUP] Buscando profissional pelo slug:', empresaSlug);
        const { data: professionalData, error: profError } = await supabase
          .from('profissional_profiles')
          .select('id')
          .eq('empresa_slug', empresaSlug)
          .eq('tipo_usuario', 'profissional')
          .maybeSingle();

        console.log('🔍 [DEBUG SIGNUP] Resultado da busca do profissional:', { professionalData, profError });

        professionalId = professionalData?.id || null;
        console.log('🔍 [DEBUG SIGNUP] Profissional encontrado:', professionalId ? 'SIM' : 'NÃO');
      }

      // 3. Inserir diretamente na tabela cliente_profiles
      console.log('📝 [DEBUG SIGNUP] Inserindo perfil do cliente...', {
        userId: authData.user.id,
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone?.trim() || null,
        profissional_vinculado: professionalId
      });

      const { error: profileError } = await supabase
        .from('cliente_profiles')
        .insert({
          id: authData.user.id,
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone?.trim() || null,
          profissional_vinculado: professionalId
        });

      if (profileError) {
        console.error('❌ [DEBUG SIGNUP] Erro ao criar perfil cliente:', profileError);
        
        // ROLLBACK: Excluir usuário do auth
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
          console.log('🔄 Rollback executado - usuário removido do auth');
        } catch (rollbackError) {
          console.error('❌ Erro no rollback:', rollbackError);
        }
        
        return { data: null, error: profileError };
      }

      console.log('✅ [DEBUG SIGNUP] Perfil do cliente criado com sucesso');

      // 4. Criar associação se há profissional
      if (professionalId) {
        console.log('🔗 [DEBUG SIGNUP] Criando associação cliente-profissional...');
        const { error: associationError } = await supabase
          .from('cliente_profissional_associations')
          .insert({
            cliente_id: authData.user.id,
            profissional_id: professionalId
          });

        if (associationError) {
          console.error('❌ [DEBUG SIGNUP] Erro na associação:', associationError);
          
          // ROLLBACK: Excluir perfil e usuário
          try {
            await supabase.from('cliente_profiles').delete().eq('id', authData.user.id);
            await supabase.auth.admin.deleteUser(authData.user.id);
            console.log('🔄 Rollback executado - perfil e usuário removidos');
          } catch (rollbackError) {
            console.error('❌ Erro no rollback:', rollbackError);
          }
          
          return { data: null, error: associationError };
        }

        console.log('✅ [DEBUG SIGNUP] Cliente criado e associado ao profissional:', professionalId);
      } else {
        console.log('✅ [DEBUG SIGNUP] Cliente criado (sem associação - profissional não encontrado)');
      }

      return { data: authData, error: null };
      
    } catch (error) {
      console.error('❌ Erro inesperado no signup cliente:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setClientProfile(null);
      console.log('✅ Cliente deslogado');
    }
    return { error };
  };

  return {
    user,
    session,
    loading,
    clientProfile,
    ownerHasAccess,
    hasAccessToThisProfessional,
    signIn,
    signUp,
    signOut,
  };
};
