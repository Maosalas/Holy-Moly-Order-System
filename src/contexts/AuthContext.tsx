import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, AuthState } from "@/types/auth";
import type { OrganizationWithRole } from "@/types/organization";
import { authApi } from "@/lib/api";

interface AuthContextType extends AuthState {
  currentOrganization: OrganizationWithRole | null;
  setCurrentOrganization: (org: OrganizationWithRole | null) => void;
  isImpersonating: boolean;
  impersonatedOrgId: string | null;
  isLoading: boolean;
  startImpersonation: (orgId: string) => void;
  stopImpersonation: () => void;
  updateUser: (user: User) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signup: (email: string, password: string, name: string, role: "owner" | "cake_topper_provider" | "super_admin") => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "holy-moly-auth";
const CURRENT_ORG_STORAGE_KEY = "holy-moly-current-org";
const IMPERSONATION_STORAGE_KEY = "holy-moly-impersonation";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  const [currentOrganization, setCurrentOrganizationState] = useState<OrganizationWithRole | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [impersonatedOrgId, setImpersonatedOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Load impersonation state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (stored) {
      try {
        const impersonation = JSON.parse(stored);
        setIsImpersonating(impersonation.isImpersonating);
        setImpersonatedOrgId(impersonation.orgId);
      } catch (error) {
        console.error("Error parsing stored impersonation:", error);
        localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
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
      setIsLoading(true);
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const authData = JSON.parse(stored);
        console.log("🔐 Checking auth - stored data:", authData);
        
        // Load stored user immediately (optimistic)
        if (authData.user) {
          setAuthState({ user: authData.user, isAuthenticated: true });
        }
        
        // Then verify token with backend
        const result = await authApi.getCurrentUser();
        console.log("🔐 Current user from API:", result.data);
        if (result.data) {
          const apiUser = result.data as any;
          // Transform backend response to match frontend User type
          const user: User = {
            id: apiUser.id,
            email: apiUser.email,
            name: apiUser.name,
            roles: apiUser.roles || (apiUser.role ? [apiUser.role] : []),
            currentOrganizationId: apiUser.organizationId || apiUser.currentOrganizationId
          };
          console.log("✅ User authenticated - roles:", user.roles, "organizationId:", user.currentOrganizationId);
          setAuthState({ user, isAuthenticated: true });
        } else {
          console.log("❌ Auth verification failed");
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setAuthState({ user: null, isAuthenticated: false });
        }
      } else {
        console.log("ℹ️ No stored auth found");
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    const result = await authApi.login(email, password);

    if (result.error) {
      return { success: false, error: result.error };
    }

    const apiResponse = result.data as any;
    // Transform backend response to match frontend User type
    const user: User = {
      id: apiResponse.user.id,
      email: apiResponse.user.email,
      name: apiResponse.user.name,
      roles: apiResponse.user.roles || (apiResponse.user.role ? [apiResponse.user.role] : []),
      currentOrganizationId: apiResponse.user.organizationId || apiResponse.user.currentOrganizationId
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token: apiResponse.token }));
    setAuthState({ user, isAuthenticated: true });

    return { success: true, user };
  };

  const signup = async (email: string, password: string, name: string, role: "owner" | "cake_topper_provider" | "super_admin"): Promise<{ success: boolean; error?: string; user?: User }> => {
    const result = await authApi.signup(email, password, name, role);

    if (result.error) {
      return { success: false, error: result.error };
    }

    const apiResponse = result.data as any;
    // Transform backend response to match frontend User type
    const user: User = {
      id: apiResponse.user.id,
      email: apiResponse.user.email,
      name: apiResponse.user.name,
      roles: apiResponse.user.roles || (apiResponse.user.role ? [apiResponse.user.role] : []),
      currentOrganizationId: apiResponse.user.organizationId || apiResponse.user.currentOrganizationId
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token: apiResponse.token }));
    setAuthState({ user, isAuthenticated: true });

    return { success: true, user };
  };

  const startImpersonation = (orgId: string) => {
    setIsImpersonating(true);
    setImpersonatedOrgId(orgId);
    localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify({
      isImpersonating: true,
      orgId
    }));
  };

  const stopImpersonation = () => {
    setIsImpersonating(false);
    setImpersonatedOrgId(null);
    setCurrentOrganizationState(null);
    localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
  };

  const updateUser = (user: User) => {
    setAuthState({ user, isAuthenticated: true });
    // Update localStorage with new user data
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const authData = JSON.parse(stored);
      authData.user = user;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    }
  };

  const logout = async () => {
    await authApi.logout();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
    localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    setAuthState({ user: null, isAuthenticated: false });
    setCurrentOrganizationState(null);
    setIsImpersonating(false);
    setImpersonatedOrgId(null);
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      currentOrganization,
      setCurrentOrganization,
      isImpersonating,
      impersonatedOrgId,
      isLoading,
      startImpersonation,
      stopImpersonation,
      updateUser,
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
