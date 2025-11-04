import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  console.log("🛡️ SuperAdminRoute check - authenticated:", isAuthenticated);
  console.log("🛡️ SuperAdminRoute check - user:", user);
  console.log("🛡️ SuperAdminRoute check - roles:", user?.roles);
  console.log("🛡️ SuperAdminRoute check - has super_admin:", user?.roles.includes("super_admin"));

  if (!isAuthenticated) {
    console.log("❌ Not authenticated, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  if (!user?.roles.includes("super_admin")) {
    console.log("❌ Not super_admin, redirecting to /");
    return <Navigate to="/" replace />;
  }

  console.log("✅ Super admin access granted");
  return <>{children}</>;
};
