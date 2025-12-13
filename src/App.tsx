import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { RequireOrganization } from "./components/RequireOrganization";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
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
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import PortalReturn from "./pages/PortalReturn";
import CreateOrganization from "./pages/CreateOrganization";
import EnterpriseAnalytics from "./pages/EnterpriseAnalytics";
import Inventory from "./pages/Inventory";
import CustomerPortal from "./pages/CustomerPortal";

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
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/portal/:token" element={<CustomerPortal />} />
              
              {/* Checkout and organization setup - authenticated but no org required */}
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/checkout-success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
              <Route path="/portal-return" element={<ProtectedRoute><PortalReturn /></ProtectedRoute>} />
              <Route path="/create-organization" element={<ProtectedRoute><CreateOrganization /></ProtectedRoute>} />
              <Route path="/subscription/success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />

              {/* Protected routes that require organization */}
              <Route path="/dashboard" element={<ProtectedRoute><RequireOrganization><AppLayout><Dashboard /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/recipes" element={<ProtectedRoute><RequireOrganization><AppLayout><Index /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/ingredients" element={<ProtectedRoute><RequireOrganization><AppLayout><Ingredients /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/supplies" element={<ProtectedRoute><RequireOrganization><AppLayout><Supplies /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><RequireOrganization><AppLayout><Orders /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><RequireOrganization><AppLayout><Expenses /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/quotations" element={<ProtectedRoute><RequireOrganization><AppLayout><Quotations /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/user/settings" element={<ProtectedRoute><RequireOrganization><AppLayout><UserSettings /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/organization/settings" element={<ProtectedRoute><RequireOrganization><AppLayout><OrganizationSettings /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/settings/subscription" element={<ProtectedRoute><RequireOrganization><AppLayout><OrganizationSettings /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/organization/members" element={<ProtectedRoute><RequireOrganization><AppLayout><OrganizationMembers /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/recipe-parameters" element={<ProtectedRoute><RequireOrganization><AppLayout><RecipeParameters /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><RequireOrganization><AppLayout><EnterpriseAnalytics /></AppLayout></RequireOrganization></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><RequireOrganization><AppLayout><Inventory /></AppLayout></RequireOrganization></ProtectedRoute>} />
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
