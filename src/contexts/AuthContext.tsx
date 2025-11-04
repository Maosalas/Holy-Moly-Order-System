import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, AuthState } from "@/types/auth";
import type { OrganizationWithRole } from "@/types/organization";
import { authApi } from "@/lib/api";

interface AuthContextType extends AuthState {
  currentOrganization: OrganizationWithRole | null;
  setCurrentOrganization: (org: OrganizationWithRole | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, role: "owner" | "cake_topper_provider") => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "holy-moly-auth";
const CURRENT_ORG_STORAGE_KEY = "holy-moly-current-org";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  
  const [currentOrganization, setCurrentOrganizationState] = useState<OrganizationWithRole | null>(null);

  // Load current organization from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
    if (stored) {
      try {
        const org = JSON.parse(stored);
        setCurrentOrganizationState(org);
      } catch (error) {
        console.error("Error parsing stored organization:", error);
        localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
      }
    }
  }, []);

  // Wrapper function to persist organization to localStorage
  const setCurrentOrganization = (org: OrganizationWithRole | null) => {
    setCurrentOrganizationState(org);
    if (org) {
      localStorage.setItem(CURRENT_ORG_STORAGE_KEY, JSON.stringify(org));
    } else {
      localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const authData = JSON.parse(stored);
        console.log("🔐 Checking auth - stored data:", authData);
        // Verify token with backend
        const result = await authApi.getCurrentUser();
        console.log("🔐 Current user from API:", result.data);
        if (result.data) {
          const user = result.data as User;
          console.log("✅ User authenticated - roles:", user.roles);
          setAuthState({ user, isAuthenticated: true });
        } else {
          console.log("❌ Auth verification failed");
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setAuthState({ user: null, isAuthenticated: false });
        }
      } else {
        console.log("ℹ️ No stored auth found");
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
    localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
    setAuthState({ user: null, isAuthenticated: false });
    setCurrentOrganizationState(null);
  };

  return (
    <AuthContext.Provider value={{ 
      ...authState, 
      currentOrganization, 
      setCurrentOrganization,
      login, 
      signup, 
      logout 
    }}>
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
