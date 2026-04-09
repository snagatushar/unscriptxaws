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
        // Delay hash change slightly to ensure Supabase persists its session first
        setTimeout(() => {
          window.location.hash = '#/reset-password';
        }, 100);
        return;
      }

      // TOKEN_REFRESHED fires every time the tab regains focus (Supabase silently
      // extends the session). The user identity is IDENTICAL — only update the
      // session token in state. Do NOT call setUser() here: even if the new object
      // has the same data, it is a different reference, which would trigger every
      // downstream useEffect([user]) and cause dashboards to re-fetch/re-render.
      if (event === 'TOKEN_REFRESHED') {
        console.debug('[Auth] Token refreshed silently — session updated, user reference preserved');
        setSession(newSession);
        // ← intentionally NOT calling setUser() to keep the same object reference
        return;
      }

      // For genuine auth changes (SIGNED_IN, SIGNED_OUT, USER_UPDATED),
      // only show the loading state if the user identity actually changed.
      const currentUserId = newSession?.user?.id ?? null;
      setUser(prev => {
        const prevId = prev?.id ?? null;
        if (prevId === currentUserId) {
          // Same user — silently update session without a loading flash
          console.debug('[Auth] Auth event', event, '— same user, silent update');
          setSession(newSession);
          return prev;
        }
        // Different user (or signed out) — run full applySession with loading
        console.debug('[Auth] Auth event', event, '— user changed, applying session');
        setIsLoading(true);
        window.setTimeout(() => {
          void applySession(newSession);
        }, 0);
        return prev; // applySession will call setUser properly
      });
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
