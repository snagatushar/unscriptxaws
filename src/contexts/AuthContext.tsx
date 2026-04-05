import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AppRole } from '../types';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: AppRole;
  phone?: string | null;
  college_name?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const authUser = session?.user ?? (await supabase.auth.getUser()).data.user;

          if (authUser?.email) {
            const { error: upsertError } = await supabase.from('users').upsert({
              id: authUser.id,
              full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
              email: authUser.email,
            });

            if (upsertError) throw upsertError;

            const retry = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();

            data = retry.data;
            error = retry.error;
          }
        }

        if (error) throw error;
      }

      setProfile(data as UserProfile);
    } catch (err) {
      console.error('Error fetching profile:', err);
      // Ensure loading turns off even on error
      setProfile(null);
    }
  };

  const applySession = async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user || null);

    if (nextSession?.user) {
      await fetchProfile(nextSession.user.id);
    } else {
      setProfile(null);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        await applySession(currentSession);
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Detect password recovery flow and redirect to reset page
      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '#/reset-password';
        return;
      }

      setIsLoading(true);
      window.setTimeout(() => {
        void applySession(newSession);
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
