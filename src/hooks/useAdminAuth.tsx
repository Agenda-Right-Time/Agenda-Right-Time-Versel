
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Admin Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setIsAdmin(true); // Qualquer usuário logado é admin por enquanto
          console.log('Usuário logado como admin');
        } else {
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAdmin(true); // Qualquer usuário logado é admin por enquanto
        setSession(session);
        setUser(session.user);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAdmin = async (email: string, password: string) => {
    try {
      console.log('🔑 Admin fazendo login...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('❌ Erro no login:', error);
        return { error };
      }

      console.log('✅ Login bem sucedido');
      return { error: null };
      
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      return { error };
    }
  };

  const signUpAdmin = async (email: string, password: string, nome: string) => {
    try {
      console.log('🚀 Criando conta de admin...');
      
      // 1. Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password
      });

      if (authError) {
        console.error('❌ Erro no auth signup:', authError);
        return { error: authError };
      }

      if (!authData.user) {
        console.error('❌ Usuário não criado');
        return { error: { message: 'Falha ao criar usuário' } };
      }

      // 2. Inserir diretamente na tabela profiles como admin
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          nome: nome.trim(),
          email: email.trim(),
          tipo_usuario: 'admin'
        });

      if (profileError) {
        console.error('❌ Erro ao criar perfil admin:', profileError);
        
        // ROLLBACK: Excluir usuário do auth
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
          console.log('🔄 Rollback executado - usuário removido do auth');
        } catch (rollbackError) {
          console.error('❌ Erro no rollback:', rollbackError);
        }
        
        return { error: profileError };
      }

      console.log('✅ Conta admin criada com sucesso - dados consistentes!');
      return { error: null };
      
    } catch (error) {
      console.error('❌ Erro inesperado no signup admin:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Admin fazendo logout...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erro no logout do admin:', error);
      }
      
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      
      return { error: null };
    } catch (error) {
      console.error('Erro inesperado no logout admin:', error);
      return { error };
    }
  };

  return {
    user,
    session,
    loading,
    isAdmin,
    signInAdmin,
    signUpAdmin,
    signOut,
  };
};
