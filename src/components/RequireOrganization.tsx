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
 */
export const RequireOrganization = ({ children }: RequireOrganizationProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { organizations, isInitializing } = useOrganization();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (!isInitializing && organizations.length === 0) {
      navigate("/create-organization");
    }
  }, [isAuthenticated, isInitializing, organizations, navigate]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};
