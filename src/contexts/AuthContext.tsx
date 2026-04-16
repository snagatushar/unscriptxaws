import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppRole } from '../types';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: AppRole;
  phone?: string | null;
  college_name?: string | null;
}

// Emulate a unified Object for backwards compatibility where user and profile used to be separate.
// Now, user and profile are identically merged.
interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null; // Points to identical object as user for backwards compatibility
  session: any | null; // Kept for legacy typing purposes (like passing mock objects)
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Read backend URL
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

  const applySession = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('unscriptx_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth-hub?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'me', token })
      });
      
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        localStorage.removeItem('unscriptx_token');
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user session:', err);
      // Do not destroy token on network failure, keep them logged in but maybe unverified
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
         // Offline handling, we can trust token locally if offline
      } else {
         setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    applySession();

    // Listen for custom token updates from login screen
    const handleStorage = () => {
      applySession();
    };
    window.addEventListener('unscriptx_auth_change', handleStorage);
    return () => {
      window.removeEventListener('unscriptx_auth_change', handleStorage);
    };
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    localStorage.removeItem('unscriptx_token');
    setUser(null);
    window.dispatchEvent(new Event('unscriptx_auth_change'));
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    await applySession();
  };

  return (
    <AuthContext.Provider value={{ user, profile: user, session: user ? { access_token: localStorage.getItem('unscriptx_token') } : null, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
