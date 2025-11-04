import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!user?.roles.includes("super_admin")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
