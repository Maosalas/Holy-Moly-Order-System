import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { User, AuthState, UserRole } from "@/types/auth";
import type { OrganizationWithRole } from "@/types/organization";

interface AuthContextType extends AuthState {
  // Organization management
  currentOrganization: OrganizationWithRole | null;
  setCurrentOrganization: (org: OrganizationWithRole | null) => void;
  
  // Impersonation (for super admins)
  isImpersonating: boolean;
  impersonatedOrgId: string | null;
  startImpersonation: (orgId: string) => void;
  stopImpersonation: () => void;
  
  // Loading state
  isLoading: boolean;
  isEmailConfirmed: boolean;
  session: Session | null;
  
  // User management
  updateUser: (user: User) => void;
  
  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User; needsEmailConfirmation?: boolean }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; user?: User; needsEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_ORG_STORAGE_KEY = "holy-moly-current-org";
const IMPERSONATION_STORAGE_KEY = "holy-moly-impersonation";

// Transform Supabase user to our User type
const transformUser = (supabaseUser: SupabaseUser | null): User | null => {
  if (!supabaseUser) return null;
  
  // Get roles from user metadata or default to owner
  const roles: UserRole[] = supabaseUser.user_metadata?.roles || ["owner"];
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "",
    roles,
    currentOrganizationId: supabaseUser.user_metadata?.current_organization_id,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);
  
  // Organization state
  const [currentOrganization, setCurrentOrganizationState] = useState<OrganizationWithRole | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [impersonatedOrgId, setImpersonatedOrgId] = useState<string | null>(null);

  // Load organization and impersonation state from localStorage
  useEffect(() => {
    const storedOrg = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
    if (storedOrg) {
      try {
        setCurrentOrganizationState(JSON.parse(storedOrg));
      } catch (error) {
        console.error("Error parsing stored organization:", error);
        localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
      }
    }

    const storedImpersonation = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (storedImpersonation) {
      try {
        const impersonation = JSON.parse(storedImpersonation);
        setIsImpersonating(impersonation.isImpersonating);
        setImpersonatedOrgId(impersonation.orgId);
      } catch (error) {
        console.error("Error parsing stored impersonation:", error);
        localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      }
    }
  }, []);

  // Set up auth state listener
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("🔐 Auth state changed:", event, newSession?.user?.email);
        
        const user = transformUser(newSession?.user ?? null);
        const emailConfirmed = newSession?.user?.email_confirmed_at != null;
        
        setSession(newSession);
        setIsEmailConfirmed(emailConfirmed);
        setAuthState({
          user,
          isAuthenticated: !!newSession && emailConfirmed,
        });
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      const user = transformUser(existingSession?.user ?? null);
      const emailConfirmed = existingSession?.user?.email_confirmed_at != null;
      
      setSession(existingSession);
      setIsEmailConfirmed(emailConfirmed);
      setAuthState({
        user,
        isAuthenticated: !!existingSession && emailConfirmed,
      });
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
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
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User; needsEmailConfirmation?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          return { 
            success: false, 
            error: "Por favor confirma tu email antes de iniciar sesión.",
            needsEmailConfirmation: true 
          };
        }
        return { success: false, error: error.message };
      }

      if (!data.user?.email_confirmed_at) {
        return { 
          success: false, 
          error: "Por favor confirma tu email antes de iniciar sesión.",
          needsEmailConfirmation: true 
        };
      }

      const user = transformUser(data.user);
      return { success: true, user: user || undefined };
    } catch (error: any) {
      return { success: false, error: error.message || "Error al iniciar sesión" };
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string; user?: User; needsEmailConfirmation?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: name,
            name: name,
            roles: ["owner"],
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const user = transformUser(data.user);
      
      if (data.user && !data.user.email_confirmed_at) {
        return { 
          success: true, 
          user: user || undefined,
          needsEmailConfirmation: true 
        };
      }

      return { success: true, user: user || undefined, needsEmailConfirmation: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Error al registrarse" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
    localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    setSession(null);
    setAuthState({ user: null, isAuthenticated: false });
    setCurrentOrganizationState(null);
    setIsImpersonating(false);
    setImpersonatedOrgId(null);
    setIsEmailConfirmed(false);
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Error al enviar email" };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Error al actualizar contraseña" };
    }
  };

  const resendConfirmationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Error al reenviar email" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        session,
        isLoading,
        isEmailConfirmed,
        currentOrganization,
        setCurrentOrganization,
        isImpersonating,
        impersonatedOrgId,
        startImpersonation,
        stopImpersonation,
        updateUser,
        login,
        signup,
        logout,
        resetPassword,
        updatePassword,
        resendConfirmationEmail,
      }}
    >
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
