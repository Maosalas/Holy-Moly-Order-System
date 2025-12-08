import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { fetchOrganizations } = useOrganization();
  const { toast } = useToast();

  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const verifyCheckout = async () => {
      if (!sessionId) {
        console.error('No session ID found');
        setIsVerifying(false);
        setVerificationSuccess(false);
        return;
      }

      console.log('🔍 Verifying checkout session:', sessionId);

      try {
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refresh organizations to get updated subscription info
        console.log('🔄 Refreshing organization data...');
        await fetchOrganizations();

        setVerificationSuccess(true);

        toast({
          title: "¡Suscripción activada!",
          description: "Tu pago ha sido procesado exitosamente. Redirigiendo al dashboard...",
        });

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);

      } catch (error) {
        console.error('Error verifying checkout:', error);
        setVerificationSuccess(false);

        toast({
          title: "Verificación en proceso",
          description: "Tu pago está siendo procesado. Esto puede tomar unos momentos.",
          variant: "default",
        });

        // Still try to redirect after a delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 5000);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyCheckout();
  }, [isAuthenticated, sessionId, navigate, fetchOrganizations, toast]);

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
          {isVerifying ? (
            <>
              <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              </div>
              <CardTitle>Verificando pago...</CardTitle>
              <CardDescription>
                Estamos procesando tu suscripción. Por favor espera un momento.
              </CardDescription>
            </>
          ) : verificationSuccess ? (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-green-600">¡Pago exitoso!</CardTitle>
              <CardDescription>
                Tu suscripción ha sido activada correctamente. Serás redirigido al dashboard en breve.
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-yellow-600" />
              </div>
              <CardTitle className="text-yellow-600">Procesando pago</CardTitle>
              <CardDescription>
                Tu pago está siendo procesado. Puede tardar unos minutos en reflejarse en tu cuenta.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!isVerifying && (
            <div className="space-y-2">
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full"
                variant={verificationSuccess ? "default" : "outline"}
              >
                Ir al Dashboard
              </Button>
              {!verificationSuccess && (
                <p className="text-xs text-muted-foreground text-center">
                  Si tu suscripción no se refleja inmediatamente, por favor espera unos minutos y recarga la página.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;
