import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { StripeCheckout } from "@/components/StripeCheckout";
import logo from "@/assets/Orderly-logo.png";

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { currentOrganization } = useOrganization();
  const { plans, isLoading: plansLoading } = useSubscriptionPlans(true);

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // Clean up localStorage when checkout is initiated
  const handleCheckoutOpen = () => {
    setShowCheckout(true);
    // Clean up after user clicks to go to Stripe
    localStorage.removeItem('selected_plan');
    localStorage.removeItem('selected_plan_slug');
  };

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Get plan from URL and save it to localStorage before redirecting to auth
      const planSlug = searchParams.get('plan');
      if (planSlug) {
        localStorage.setItem('selected_plan_slug', planSlug);
        navigate(`/auth?plan=${planSlug}`);
      } else {
        navigate('/auth');
      }
      return;
    }

    // Get selected plan from localStorage or URL params
    const planSlug = searchParams.get('plan') ||
                     localStorage.getItem('selected_plan_slug');

    if (!planSlug) {
      navigate('/');
      return;
    }

    // Find the plan from the database
    if (!plansLoading && plans.length > 0) {
      const plan = plans.find(p => p.slug === planSlug);
      if (plan) {
        setSelectedPlan(plan);
      } else {
        // Plan not found, redirect to home
        navigate('/');
      }
    }
  }, [isAuthenticated, searchParams, plans, plansLoading, navigate]);

  useEffect(() => {
    // Check if organization already has an active subscription
    if (currentOrganization && currentOrganization.subscriptionStatus === 'active') {
      // Already subscribed, redirect to dashboard
      navigate('/dashboard');
    }
  }, [currentOrganization, navigate]);

  if (!isAuthenticated || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Plan no encontrado</CardTitle>
            <CardDescription>
              El plan seleccionado no está disponible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Holy Moly Logo" className="h-10 w-50" />
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Completa tu suscripción</h1>
          <p className="text-muted-foreground">
            Estás a un paso de comenzar con {selectedPlan.name}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{selectedPlan.name}</CardTitle>
                <Badge variant="default">Seleccionado</Badge>
              </div>
              <CardDescription>
                {selectedPlan.slug === "starter" ? "Perfecto para comenzar" :
                 selectedPlan.slug === "professional" ? "Para negocios en crecimiento" :
                 selectedPlan.slug === "enterprise" ? "Para operaciones a gran escala" :
                 "Plan personalizado"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing */}
              <div className="text-center py-4 bg-primary/5 rounded-lg">
                <div className="text-3xl font-bold">${selectedPlan.priceMonthly}</div>
                <div className="text-sm text-muted-foreground">por mes</div>
                {selectedPlan.priceYearly && (
                  <div className="mt-2 text-sm">
                    o ${selectedPlan.priceYearly}/año
                    <span className="text-green-600 ml-1">
                      (Ahorra ${(selectedPlan.priceMonthly * 12 - selectedPlan.priceYearly).toFixed(2)})
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div>
                <h3 className="font-semibold mb-3">Incluye:</h3>
                <ul className="space-y-2">
                  {selectedPlan.maxOrdersPerMonth === -1 ? (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Órdenes ilimitadas</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Hasta {selectedPlan.maxOrdersPerMonth} órdenes/mes</span>
                    </li>
                  )}
                  {selectedPlan.maxUsers === -1 ? (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Usuarios ilimitados</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{selectedPlan.maxUsers} usuarios incluidos</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{selectedPlan.maxStorageGb} GB almacenamiento</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Método de pago</CardTitle>
              <CardDescription>
                Procesado de forma segura a través de Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Al hacer clic en "Proceder al pago", serás redirigido a Stripe para completar de forma segura tu información de pago.
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckoutOpen}
              >
                Proceder al Pago
              </Button>

              <div className="text-xs text-center text-muted-foreground space-y-1">
                <p>✓ Encriptación SSL de 256 bits</p>
                <p>✓ Cancela en cualquier momento</p>
                <p>✓ Garantía de devolución de 30 días</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold">¿Tienes preguntas?</h3>
              <p className="text-sm text-muted-foreground">
                Contáctanos en soporte@holymoly.com o revisa nuestras{" "}
                <a href="#" className="text-primary hover:underline">
                  preguntas frecuentes
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stripe Checkout Dialog */}
      {currentOrganization && (
        <StripeCheckout
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          priceMonthly={selectedPlan.priceMonthly}
          priceYearly={selectedPlan.priceYearly}
          organizationId={currentOrganization.id}
          open={showCheckout}
          onOpenChange={setShowCheckout}
        />
      )}
    </div>
  );
}
