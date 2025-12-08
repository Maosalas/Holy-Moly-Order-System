import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PortalReturn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { fetchOrganizations, currentOrganization } = useOrganization();
  const { toast } = useToast();

  const [isSyncing, setIsSyncing] = useState(true);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const orgId = searchParams.get('orgId');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const syncSubscription = async () => {
      if (!orgId) {
        console.error('No organization ID found');
        setIsSyncing(false);
        setSyncSuccess(false);
        return;
      }

      console.log('🔄 Syncing subscription status for organization:', orgId);

      try {
        // Call backend to sync subscription status from Stripe
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const auth = localStorage.getItem("holy-moly-auth");
        const token = auth ? JSON.parse(auth).token : null;

        const response = await fetch(`${apiUrl}/stripe/sync-subscription/${orgId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Error syncing subscription');
        }

        const result = await response.json();
        console.log('✅ Subscription synced:', result);

        // Wait a moment then refresh organizations
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('🔄 Refreshing organization data...');
        await fetchOrganizations();

        setSyncSuccess(true);

        toast({
          title: "Suscripción actualizada",
          description: "Tu información de suscripción ha sido sincronizada correctamente.",
        });

        // Redirect to organization settings after 2 seconds
        setTimeout(() => {
          navigate('/organization/settings');
        }, 2000);

      } catch (error) {
        console.error('Error syncing subscription:', error);

        // Even if sync fails, try to refresh organizations
        try {
          await fetchOrganizations();
        } catch (refreshError) {
          console.error('Error refreshing organizations:', refreshError);
        }

        setSyncSuccess(false);

        toast({
          title: "Sincronización completada",
          description: "Revisa tu plan en la configuración. Si no se refleja, contacta a soporte.",
          variant: "default",
        });

        // Still redirect after delay
        setTimeout(() => {
          navigate('/organization/settings');
        }, 3000);
      } finally {
        setIsSyncing(false);
      }
    };

    syncSubscription();
  }, [isAuthenticated, orgId, navigate, fetchOrganizations, toast]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {isSyncing ? (
            <>
              <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center">
                <RefreshCw className="h-16 w-16 animate-spin text-primary" />
              </div>
              <CardTitle>Sincronizando suscripción...</CardTitle>
              <CardDescription>
                Estamos actualizando tu información de suscripción desde Stripe.
              </CardDescription>
            </>
          ) : syncSuccess ? (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-green-600">¡Sincronización exitosa!</CardTitle>
              <CardDescription>
                Tu suscripción ha sido actualizada. Redirigiendo a configuración...
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-blue-600" />
              </div>
              <CardTitle className="text-blue-600">Sincronización completada</CardTitle>
              <CardDescription>
                Revisa tu configuración de suscripción.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSyncing && (
            <Button
              onClick={() => navigate('/organization/settings')}
              className="w-full"
            >
              Ir a Configuración
            </Button>
          )}
          {currentOrganization && (
            <div className="text-xs text-muted-foreground text-center">
              <p>Plan actual: <strong>{currentOrganization.subscriptionPlan || 'free'}</strong></p>
              <p>Estado: <strong>{currentOrganization.subscriptionStatus || 'trial'}</strong></p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalReturn;
