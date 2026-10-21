'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/crm';

interface AuthContextType {
  currentUser: Profile | null;
  loading: boolean;
  login: (profile: Profile) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  async function loadUserFromStorage() {
    setLoading(true);
    try {
      const savedUserId = localStorage.getItem('fo_crm_user_id');
      if (savedUserId) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', savedUserId)
          .maybeSingle();

        if (profile && !error) {
          setCurrentUser(profile);
          setLoading(false);
          return;
        }
      }

      // Fallback check
      setCurrentUser(null);
    } catch (e) {
      console.warn('Auth check error:', e);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }

  function login(profile: Profile) {
    localStorage.setItem('fo_crm_user_id', profile.id);
    setCurrentUser(profile);
    router.replace('/');
  }

  async function logout() {
    localStorage.removeItem('fo_crm_user_id');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Signout warning:', e);
    }
    setCurrentUser(null);
    router.replace('/login');
  }

  async function refreshProfile() {
    if (!currentUser?.id) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (data) setCurrentUser(data);
    } catch (e) {}
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
