import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { fetchMe, loginRequest, signupRequest, type AppAccountType, type AppUserDto } from '@/controllers/authApi';
import { setAppAuthToken, getAppAuthToken } from '@/controllers/appApiClient';

export interface User {
  name: string;
  email: string;
  clinic: string;
  phone: string;
  notifEmail: boolean;
  notifSms: boolean;
  firstAccess: boolean;
  subscriptionStatus?: string;
  trialEndsAt?: string;
  simulationCreditsRemaining: number;
  simulationMonthlyQuota: number;
  accountType: AppAccountType;
  partnerTestExpiresAt?: string | null;
}

function mapDto(u: AppUserDto): User {
  return {
    name: u.name,
    email: u.email,
    clinic: u.clinic || '',
    phone: u.phone || '',
    notifEmail: u.notifEmail !== false,
    notifSms: u.notifSms === true,
    firstAccess: u.firstAccess === true,
    subscriptionStatus: u.subscriptionStatus,
    trialEndsAt: u.trialEndsAt,
    simulationCreditsRemaining: u.simulationCreditsRemaining ?? 0,
    simulationMonthlyQuota: u.simulationMonthlyQuota ?? 0,
    accountType: u.accountType === 'partner_test' ? 'partner_test' : 'official',
    partnerTestExpiresAt: u.partnerTestExpiresAt ?? null,
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, clinic: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUserFromDto: (u: AppUserDto) => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const setUserFromDto = useCallback((u: AppUserDto) => {
    setUser(mapDto(u));
  }, []);

  useEffect(() => {
    const token = getAppAuthToken();
    if (!token) {
      setAuthReady(true);
      return;
    }
    fetchMe()
      .then((u) => setUser(mapDto(u)))
      .catch(() => {
        setAppAuthToken(null);
        setUser(null);
      })
      .finally(() => setAuthReady(true));
  }, []);

  const login = async (email: string, password: string) => {
    const u = await loginRequest(email, password);
    const mapped = mapDto(u);
    setUser(mapped);
    return mapped;
  };

  const signup = async (name: string, clinic: string, email: string, password: string) => {
    const u = await signupRequest(name, clinic, email, password);
    setUser(mapDto(u));
  };

  const logout = () => {
    setAppAuthToken(null);
    setUser(null);
  };

  const refreshMe = useCallback(async () => {
    try {
      const u = await fetchMe();
      setUser(mapDto(u));
    } catch {
      // silently ignore; stale data better than crash
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authReady,
        login,
        signup,
        logout,
        setUserFromDto,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
