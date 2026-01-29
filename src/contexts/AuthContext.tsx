import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export type AppUser = {
  id: string;
  email: string | null;
  phone: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
};

type AuthContextType = {
  user: AppUser | null;
  accessToken: string | null;
  loading: boolean;
  setAccessToken: (token: string | null) => void;
  refreshMe: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const STORAGE_KEY = "accessToken";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const setAccessToken = (token: string | null) => {
    setAccessTokenState(token);
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const refreshMe = async () => {
    if (!accessToken) {
      setUser(null);
      return;
    }
    const res = await apiFetch<{ user: AppUser | null }>("/auth/me", { method: "GET", token: accessToken });
    setUser(res.user);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } catch {
        // Token invalid/expired
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    setAccessToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, accessToken, loading, setAccessToken, refreshMe, logout }),
    [user, accessToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
