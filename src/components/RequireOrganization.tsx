import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Loader2 } from "lucide-react";

interface RequireOrganizationProps {
  children: React.ReactNode;
}

/**
 * Component that ensures user has created an organization
 * Redirects to /create-organization if they don't have one
 * Super admins are exempt from this requirement
 */
export const RequireOrganization = ({ children }: RequireOrganizationProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { organizations, isInitializing } = useOrganization();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Super admins no necesitan organización
    if (user?.roles.includes("super_admin")) {
      return;
    }

    // Wait for both auth and organization loading to complete
    if (!isAuthLoading && !isInitializing && organizations.length === 0) {
      navigate("/create-organization");
    }
  }, [isAuthenticated, isAuthLoading, isInitializing, organizations, navigate, user]);

  // Super admins pueden acceder sin organización
  const isSuperAdmin = user?.roles.includes("super_admin");

  if (isAuthLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin && organizations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};
