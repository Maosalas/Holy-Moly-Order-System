import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, AuthState } from "@/types/auth";
import { authApi } from "@/lib/api";

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, role: "owner" | "cake_topper_provider") => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "holy-moly-auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const authData = JSON.parse(stored);
        // Verify token with backend
        const result = await authApi.getCurrentUser();
        if (result.data) {
          setAuthState({ user: result.data as User, isAuthenticated: true });
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setAuthState({ user: null, isAuthenticated: false });
        }
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.login(email, password);
    
    if (result.error) {
      return { success: false, error: result.error };
    }

    const { user, token } = result.data as any;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
    setAuthState({ user, isAuthenticated: true });
    
    return { success: true };
  };

  const signup = async (email: string, password: string, name: string, role: "owner" | "cake_topper_provider"): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.signup(email, password, name, role);
    
    if (result.error) {
      return { success: false, error: result.error };
    }

    const { user, token } = result.data as any;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
    setAuthState({ user, isAuthenticated: true });

    return { success: true };
  };

  const logout = async () => {
    await authApi.logout();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState({ user: null, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
