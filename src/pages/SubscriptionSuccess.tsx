import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Calendar, CreditCard, ArrowRight } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrganization } = useOrganization();
  const [planDetails, setPlanDetails] = useState<any>(null);

  useEffect(() => {
    // Clean up localStorage after successful subscription
    localStorage.removeItem('selected_plan');
    localStorage.removeItem('selected_plan_slug');

    // Get plan details from URL params or organization context
    const planName = searchParams.get("plan") || currentOrganization?.subscriptionPlan || "Professional";
    const billingInterval = searchParams.get("interval") || "monthly";
    const nextBillingDate = searchParams.get("next_billing");

    // Mock plan details - in production, this would come from your API
    const plans: any = {
      starter: {
        name: "Starter",
        price: billingInterval === "monthly" ? 29 : 290,
        interval: billingInterval,
        features: [
          "Hasta 100 órdenes por mes",
          "5 usuarios incluidos",
          "10 GB de almacenamiento",
          "Soporte por email",
        ],
      },
      professional: {
        name: "Professional",
        price: billingInterval === "monthly" ? 99 : 990,
        interval: billingInterval,
        features: [
          "Hasta 500 órdenes por mes",
          "15 usuarios incluidos",
          "50 GB de almacenamiento",
          "Soporte prioritario",
          "Análisis avanzados",
        ],
      },
      enterprise: {
        name: "Enterprise",
        price: billingInterval === "monthly" ? 299 : 2990,
        interval: billingInterval,
        features: [
          "Órdenes ilimitadas",
          "Usuarios ilimitados",
          "500 GB de almacenamiento",
          "Soporte dedicado 24/7",
          "Marca personalizada",
          "Acceso a API",
        ],
      },
    };

    const planKey = planName.toLowerCase();
    const plan = plans[planKey] || plans.professional;

    // Calculate next billing date (30 days or 365 days from now)
    const daysToAdd = billingInterval === "monthly" ? 30 : 365;
    const calculatedNextBilling = nextBillingDate 
      ? new Date(nextBillingDate)
      : new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

    setPlanDetails({
      ...plan,
      nextBillingDate: calculatedNextBilling,
    });
  }, [searchParams, currentOrganization]);

  if (!planDetails) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Success Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-green-500/10 p-6 rounded-full">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            ¡Suscripción Exitosa!
          </h1>
          <p className="text-xl text-muted-foreground">
            Bienvenido al plan {planDetails.name}
          </p>
        </div>

        {/* Plan Details Card */}
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <CardTitle className="text-2xl">{planDetails.name}</CardTitle>
              <Badge variant="default" className="text-sm">
                {planDetails.interval === "monthly" ? "Mensual" : "Anual"}
              </Badge>
            </div>
            <CardDescription>
              <div className="flex items-center justify-center gap-2 text-3xl font-bold text-foreground">
                <span>${planDetails.price}</span>
                <span className="text-base text-muted-foreground font-normal">
                  / {planDetails.interval === "monthly" ? "mes" : "año"}
                </span>
              </div>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Separator />

            {/* Billing Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 text-primary" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Próxima Facturación</p>
                  <p className="text-sm text-muted-foreground">
                    {format(planDetails.nextBillingDate, "PPP", { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <CreditCard className="w-5 h-5 text-primary" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Método de Pago</p>
                  <p className="text-sm text-muted-foreground">
                    Gestionado a través de Stripe
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Plan Features */}
            <div className="space-y-3">
              <h3 className="font-semibold text-center">Características Incluidas</h3>
              <ul className="space-y-2">
                {planDetails.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => navigate("/dashboard")}
                className="flex-1"
                size="lg"
              >
                Ir al Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                onClick={() => navigate("/organization/settings")}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Ver Configuración
              </Button>
            </div>

            {/* Additional Info */}
            <p className="text-xs text-center text-muted-foreground pt-2">
              Recibirás un correo de confirmación con los detalles de tu suscripción.
              Puedes gestionar tu suscripción en cualquier momento desde la configuración de la organización.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
