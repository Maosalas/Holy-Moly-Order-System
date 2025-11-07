import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Ingredients from "./pages/Ingredients";
import Supplies from "./pages/Supplies";
import Orders from "./pages/Orders";
import Expenses from "./pages/Expenses";
import Quotations from "./pages/Quotations";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UserSettings from "./pages/UserSettings";
import NotFound from "./pages/NotFound";
import OrganizationSettings from "./pages/OrganizationSettings";
import OrganizationMembers from "./pages/OrganizationMembers";
import SuperAdmin from "./pages/SuperAdmin";
import RecipeParameters from "./pages/RecipeParameters";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 segundos - considera los datos frescos por este tiempo
      gcTime: 1000 * 60 * 5, // 5 minutos - mantiene datos en caché aunque no se usen
      refetchOnWindowFocus: true, // Refresca cuando el usuario vuelve a la ventana
      refetchOnReconnect: true, // Refresca cuando se reconecta a internet
      retry: 1, // Reintenta 1 vez si falla
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/recipes" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
              <Route path="/ingredients" element={<ProtectedRoute><AppLayout><Ingredients /></AppLayout></ProtectedRoute>} />
              <Route path="/supplies" element={<ProtectedRoute><AppLayout><Supplies /></AppLayout></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><AppLayout><Orders /></AppLayout></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><AppLayout><Expenses /></AppLayout></ProtectedRoute>} />
              <Route path="/quotations" element={<ProtectedRoute><AppLayout><Quotations /></AppLayout></ProtectedRoute>} />
              <Route path="/user/settings" element={<ProtectedRoute><AppLayout><UserSettings /></AppLayout></ProtectedRoute>} />
              <Route path="/organization/settings" element={<ProtectedRoute><AppLayout><OrganizationSettings /></AppLayout></ProtectedRoute>} />
              <Route path="/organization/members" element={<ProtectedRoute><AppLayout><OrganizationMembers /></AppLayout></ProtectedRoute>} />
              <Route path="/recipe-parameters" element={<ProtectedRoute><AppLayout><RecipeParameters /></AppLayout></ProtectedRoute>} />
              <Route path="/super-admin" element={<SuperAdminRoute><AppLayout><SuperAdmin /></AppLayout></SuperAdminRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
