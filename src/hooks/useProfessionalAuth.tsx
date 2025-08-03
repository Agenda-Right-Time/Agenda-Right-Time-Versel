
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useProfessionalAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfessional, setIsProfessional] = useState(false);

  const checkIsProfessional = async (user: User) => {
    console.log('🔍 Verificando se usuário é profissional:', user.email);
    console.log('📱 Domínio atual:', window.location.hostname);
    
    // Primeiro verificar se é profissional pelos metadados do usuário
    const userType = user.user_metadata?.tipo_usuario;
    console.log('👤 Tipo de usuário nos metadados:', userType);
    
    if (userType === 'profissional') {
      console.log('✅ Usuário identificado como profissional pelos metadados');
      return true;
    }
    
    // Verificar na tabela profissional_profiles
    console.log('🔎 Buscando na tabela profissional_profiles para ID:', user.id);
    const { data: profile, error } = await supabase
      .from('profissional_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    console.log('📋 Resultado da busca profissional_profiles:', profile);
    console.log('❗ Erro na busca:', error);
    
    const isProfileProfessional = !!profile;
    console.log('✅ É profissional na tabela?', isProfileProfessional);
    
    return isProfileProfessional;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Professional Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);

        // Use setTimeout para evitar deadlock conforme documentação do Supabase
        if (session?.user) {
          setTimeout(async () => {
            const isProfessionalUser = await checkIsProfessional(session.user);
            setIsProfessional(isProfessionalUser);
            console.log('Usuário é profissional:', isProfessionalUser);
            setLoading(false);
          }, 0);
        } else {
          setIsProfessional(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const isProfessionalUser = await checkIsProfessional(session.user);
        setIsProfessional(isProfessionalUser);
        setSession(session);
        setUser(session.user);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInProfessional = async (email: string, password: string) => {
    try {
      console.log('🔑 Profissional tentando fazer login no domínio:', window.location.hostname);
      console.log('📧 Email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('❌ Erro no login do profissional:', error);
        return { error };
      }

      if (data.user) {
        console.log('🎯 Usuário autenticado:', data.user.email);
        console.log('🔍 Verificando se é profissional...');
        
        // Verificar se é realmente profissional usando a nova função
        const isProfessionalUser = await checkIsProfessional(data.user);
        console.log('📊 Resultado da verificação profissional:', isProfessionalUser);

        if (!isProfessionalUser) {
          console.log('❌ Negando acesso - não é profissional');
          await supabase.auth.signOut();
          return { error: { message: 'Acesso negado. Esta área é restrita a profissionais.' } };
        }

        console.log('✅ Profissional logado com sucesso');
        return { error: null };
      }
      
      return { error: { message: 'Erro inesperado no login' } };
    } catch (error) {
      console.error('❌ Erro inesperado no login profissional:', error);
      return { error };
    }
  };

  const signUpProfessional = async (email: string, password: string, nome: string, empresa: string) => {
    try {
      console.log('🚀 Criando conta de profissional...');
      
      // 1. Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (authError) {
        console.error('❌ Erro no auth signup:', authError);
        return { error: authError };
      }

      if (!authData.user) {
        console.error('❌ Usuário não criado');
        return { error: { message: 'Falha ao criar usuário' } };
      }

      // 2. Gerar slug único da empresa
      const baseSlug = empresa.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 50);

      let empresaSlug = baseSlug;
      let counter = 1;

      // Verificar se slug já existe e gerar único
      while (true) {
        const { data: existingProfile } = await supabase
          .from('profissional_profiles')
          .select('id')
          .eq('empresa_slug', empresaSlug)
          .maybeSingle();

        if (!existingProfile) break;
        
        empresaSlug = `${baseSlug}${counter}`;
        counter++;
      }

      // 3. Inserir diretamente na tabela profiles
      const { error: profileError } = await supabase
        .from('profissional_profiles')
        .insert({
          id: authData.user.id,
          nome: nome.trim(),
          email: email.trim(),
          empresa: empresa.trim(),
          empresa_slug: empresaSlug,
          tipo_usuario: 'profissional'
        });

      if (profileError) {
        console.error('❌ Erro ao criar perfil profissional:', profileError);
        
        // ROLLBACK: Excluir usuário do auth
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
          console.log('🔄 Rollback executado - usuário removido do auth');
        } catch (rollbackError) {
          console.error('❌ Erro no rollback:', rollbackError);
        }
        
        return { error: profileError };
      }

      // 4. Criar assinatura trial
      const { error: assinaturaError } = await supabase
        .from('assinaturas')
        .insert({
          user_id: authData.user.id,
          status: 'trial',
          trial_ate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          data_vencimento: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (assinaturaError) {
        console.error('❌ Erro ao criar assinatura:', assinaturaError);
        
        // ROLLBACK: Excluir perfil e usuário
        try {
          await supabase.from('profissional_profiles').delete().eq('id', authData.user.id);
          await supabase.auth.admin.deleteUser(authData.user.id);
          console.log('🔄 Rollback executado - perfil e usuário removidos');
        } catch (rollbackError) {
          console.error('❌ Erro no rollback:', rollbackError);
        }
        
        return { error: assinaturaError };
      }

      console.log('✅ Conta profissional criada com sucesso - dados consistentes!');
      console.log('📍 Slug da empresa:', empresaSlug);
      return { error: null };
      
    } catch (error) {
      console.error('❌ Erro inesperado no signup profissional:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Profissional fazendo logout...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erro no logout do profissional:', error);
      }
      
      setUser(null);
      setSession(null);
      setIsProfessional(false);
      
      return { error: null };
    } catch (error) {
      console.error('Erro inesperado no logout profissional:', error);
      return { error };
    }
  };

  return {
    user,
    session,
    loading,
    isProfessional,
    signInProfessional,
    signUpProfessional,
    signOut,
  };
};
