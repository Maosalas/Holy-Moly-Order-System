import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Check, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { initializeStripeCheckout } from "@/lib/stripe";

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { plans, isLoading: plansLoading } = useSubscriptionPlans(true);
  
  const [selectedPlan, setSelectedPlan] = useState<string>(searchParams.get('plan') || 'starter');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const organizationId = searchParams.get('orgId');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    // If no organization ID, redirect to create one first
    if (!organizationId) {
      navigate('/create-organization');
    }
  }, [isAuthenticated, navigate, organizationId]);

  // Handle canceled checkout
  useEffect(() => {
    if (canceled === 'true') {
      toast({
        title: "Checkout cancelado",
        description: "El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando estés listo.",
        variant: "default",
      });
      // Remove the canceled parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('canceled');
      navigate(`/checkout?${newSearchParams.toString()}`, { replace: true });
    }
  }, [canceled, toast, navigate, searchParams]);

  const plan = plans.find(p => p.slug === selectedPlan);

  const handleProceedToPayment = async () => {
    if (!plan || !user || !organizationId) return;

    setIsProcessing(true);
    try {
      toast({
        title: "Redirigiendo a Stripe...",
        description: "Por favor completa tu pago para continuar.",
      });

      // Clear the selected plan from localStorage
      localStorage.removeItem('selected_plan_slug');

      // Call Stripe checkout with the actual organization ID
      const result = await initializeStripeCheckout({
        planId: plan.id,
        organizationId: organizationId,
        billingInterval
      });

      if (!result) {
        throw new Error('No se pudo iniciar el checkout de Stripe');
      }
      
      // initializeStripeCheckout already redirects to Stripe
    } catch (error) {
      console.error('Error processing checkout:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago. Intenta de nuevo.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Plan no encontrado</CardTitle>
            <CardDescription>El plan seleccionado no está disponible.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  const savings = billingInterval === 'yearly' ? Math.round((plan.priceMonthly * 12 - plan.priceYearly) / (plan.priceMonthly * 12) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Completa tu suscripción</h1>
          <p className="text-muted-foreground">Selecciona la frecuencia de pago y procede al checkout</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                <Badge>{selectedPlan}</Badge>
              </CardTitle>
              <CardDescription>Características del plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{plan.maxOrdersPerMonth === -1 ? 'Órdenes ilimitadas' : `${plan.maxOrdersPerMonth} órdenes/mes`}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{plan.maxUsers === -1 ? 'Usuarios ilimitados' : `${plan.maxUsers} usuarios`}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{plan.maxStorageGb} GB de almacenamiento</span>
                </div>
                {plan.features.support && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Soporte {plan.features.support}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Options */}
          <Card>
            <CardHeader>
              <CardTitle>Opciones de pago</CardTitle>
              <CardDescription>Selecciona la frecuencia de facturación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={billingInterval} onValueChange={(val) => setBillingInterval(val as 'monthly' | 'yearly')}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setBillingInterval('monthly')}>
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <span>Mensual</span>
                      <span className="font-semibold">${plan.priceMonthly.toFixed(2)}/mes</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setBillingInterval('yearly')}>
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span>Anual</span>
                        {savings > 0 && <Badge variant="secondary">Ahorra {savings}%</Badge>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${plan.priceYearly.toFixed(2)}/año</div>
                        <div className="text-xs text-muted-foreground">${(plan.priceYearly / 12).toFixed(2)}/mes</div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${price.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {billingInterval === 'monthly' ? 'Facturado mensualmente' : 'Facturado anualmente'}
                </p>
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleProceedToPayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Proceder al Pago
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
