import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Ingredients from "./pages/Ingredients";
import Supplies from "./pages/Supplies";
import Orders from "./pages/Orders";
import Expenses from "./pages/Expenses";
import Quotations from "./pages/Quotations";
import Auth from "./pages/Auth";
import Cotizador from "./pages/Cotizador";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/recipes" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
            <Route path="/ingredients" element={<ProtectedRoute><AppLayout><Ingredients /></AppLayout></ProtectedRoute>} />
            <Route path="/supplies" element={<ProtectedRoute><AppLayout><Supplies /></AppLayout></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><AppLayout><Orders /></AppLayout></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><AppLayout><Expenses /></AppLayout></ProtectedRoute>} />
            <Route path="/cotizador" element={<ProtectedRoute><AppLayout><Cotizador/></AppLayout></ProtectedRoute>} />
            <Route path="/quotations" element={<ProtectedRoute><AppLayout><Quotations /></AppLayout></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
