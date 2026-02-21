'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, User } from '@/lib/api';

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, password_confirmation: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [token, setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      authApi.me(savedToken)
        .then((u) => { setUser(u); setToken(savedToken); })
        .catch(() => localStorage.removeItem('auth_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const saveAuth = (resToken: string, resUser: User) => {
    localStorage.setItem('auth_token', resToken);
    setToken(resToken);
    setUser(resUser);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    saveAuth(res.access_token, res.user);
    router.push('/dashboard');
  };

  const register = async (name: string, email: string, password: string, password_confirmation: string) => {
    const res = await authApi.register({ name, email, password, password_confirmation });
    saveAuth(res.access_token, res.user);
    router.push('/dashboard');
  };

  const guestLogin = async () => {
    const res = await authApi.guestLogin();
    saveAuth(res.access_token, res.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    if (token) {
      await authApi.logout(token).catch(() => {});
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, guestLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
