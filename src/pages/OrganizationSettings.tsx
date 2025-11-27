import { useState, useEffect } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Users, Upload, Wallet, CreditCard, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import defaultLogo from "@/assets/Orderly-logo.png";
import { PaymentMethodsList } from "@/components/PaymentMethodsList";
import { CardTypesList } from "@/components/CardTypesList";
import { subscriptionPlansApi } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { StripeCheckout } from "@/components/StripeCheckout";
import { createCustomerPortalSession } from "@/lib/stripe";

export default function OrganizationSettings() {
  const { currentOrganization, updateOrganization, isLoading, fetchOrganizations } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState(currentOrganization?.name || "");
  const [logoUrl, setLogoUrl] = useState(currentOrganization?.logoUrl || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(currentOrganization?.logoUrl || defaultLogo);
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);

  useEffect(() => {
    console.log("🔍 OrganizationSettings - currentOrganization FULL:", currentOrganization);

    // Verificación de datos de suscripción según FRONTEND_INTEGRATION_GUIDE.md
    if (currentOrganization) {
      console.log("📊 Subscription Data Verification:");
      console.log("   Plan:", currentOrganization.subscriptionPlan);
      console.log("   Status:", currentOrganization.subscriptionStatus);
      console.log("   Stripe Customer ID:", currentOrganization.subscriptionStripeCustomerId);
      console.log("   Stripe Subscription ID:", currentOrganization.subscriptionStripeSubscriptionId);
      console.log("   Trial Ends At:", currentOrganization.trialEndsAt);

      // Alertas si se están usando valores por defecto
      if (currentOrganization.subscriptionPlan === "free" && currentOrganization.subscriptionStatus === "trial") {
        console.warn("⚠️ WARNING: Using default values for subscription. Backend might not be sending data correctly.");
      } else {
        console.log("✅ Subscription data loaded correctly from backend");
      }
    }

    loadPlanDetails();
  }, [currentOrganization?.subscriptionPlan]);

  const loadPlanDetails = async () => {
    if (!currentOrganization?.subscriptionPlan) {
      setIsLoadingPlan(false);
      return;
    }

    setIsLoadingPlan(true);

    // First try to find in active plans
    let result = await subscriptionPlansApi.getAll(true); // Solo planes activos
    
    // Save available plans for checkout
    if (result.data) {
      setAvailablePlans(result.data as any[]);
    }

    console.log("🔍 Organization Settings - Debug:", {
      currentOrgPlan: currentOrganization.subscriptionPlan,
      currentOrgStatus: currentOrganization.subscriptionStatus,
      currentOrgId: currentOrganization.id,
      currentOrgName: currentOrganization.name,
      allPlansFromAPI: result.data
    });

    let currentPlan = null;

    if (result.data) {
      const plans = result.data as any[];
      currentPlan = plans.find(p => p.slug === currentOrganization.subscriptionPlan);

      console.log("🔍 Plan matching (active plans):", {
        searchingFor: currentOrganization.subscriptionPlan,
        foundPlan: currentPlan,
        availableSlugs: plans.map(p => p.slug)
      });

      // If not found in active plans, search in all plans (including inactive)
      if (!currentPlan) {
        console.log("🔍 Plan not found in active plans, searching in all plans...");
        const allPlansResult = await subscriptionPlansApi.getAll(false);

        if (allPlansResult.data) {
          const allPlans = allPlansResult.data as any[];
          currentPlan = allPlans.find(p => p.slug === currentOrganization.subscriptionPlan);

          console.log("🔍 Plan matching (all plans):", {
            searchingFor: currentOrganization.subscriptionPlan,
            foundPlan: currentPlan,
            availableSlugs: allPlans.map(p => p.slug)
          });
        }
      }

      setPlanDetails(currentPlan || null);
    }
    setIsLoadingPlan(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona un archivo de imagen válido",
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La imagen no debe superar los 5MB",
      });
      return;
    }

    setLogoFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!currentOrganization) return;
    
    let logoBase64 = logoUrl;

    // Si hay un archivo nuevo, convertir a base64
    if (logoFile) {
      const reader = new FileReader();
      logoBase64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoFile);
      });
    }

    const success = await updateOrganization(currentOrganization.id, {
      name,
      logoUrl: logoBase64,
    });

    if (success) {
      setLogoFile(null);
      // Recargar las organizaciones para actualizar el logo en todo el sistema
      await fetchOrganizations();
    }
  };

  const handleSubscribeToPlan = (plan: any) => {
    setSelectedPlanForCheckout(plan);
    setIsCheckoutOpen(true);
  };

  const handleManageSubscription = async () => {
    if (!currentOrganization) return;
    
    await createCustomerPortalSession(currentOrganization.id);
  };

  if (!currentOrganization) {
    return (
      <div className="container max-w-4xl py-6">
        <p className="text-muted-foreground">No hay organización seleccionada</p>
      </div>
    );
  }

  const canManage = ["owner", "admin"].includes(currentOrganization.userRole);

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Configuración de Organización</h1>
          <p className="text-muted-foreground">
            Administra los detalles de tu organización
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Building2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Miembros
          </TabsTrigger>
          <TabsTrigger value="payment-methods">
            <Wallet className="h-4 w-4 mr-2" />
            Métodos de Pago
          </TabsTrigger>
          <TabsTrigger value="card-types">
            <CreditCard className="h-4 w-4 mr-2" />
            Tipos de Tarjetas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Información básica sobre tu organización
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManage}
                  placeholder="Nombre de la organización"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={currentOrganization.slug}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  El slug no se puede modificar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoFile">Logo de la Organización</Label>
                {logoPreview && (
                  <div className="mb-4 flex justify-center">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="h-24 w-24 object-contain rounded-lg border border-border"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    id="logoFile"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={!canManage}
                    className="cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!canManage}
                    onClick={() => document.getElementById('logoFile')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos aceptados: JPG, PNG, GIF. Máximo 5MB.
                </p>
              </div>

              {canManage && (
                <Button onClick={handleSave} disabled={isLoading}>
                  Guardar Cambios
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suscripción</CardTitle>
              <CardDescription>
                Detalles de tu plan de suscripción
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingPlan ? (
                <div className="text-center py-4 text-muted-foreground">
                  Cargando detalles del plan...
                </div>
              ) : planDetails ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Plan:</span>
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {planDetails.name}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estado:</span>
                      <Badge
                        variant={
                          currentOrganization.subscriptionStatus === "active"
                            ? "default"
                            : currentOrganization.subscriptionStatus === "trial"
                            ? "secondary"
                            : "destructive"
                        }
                        className="capitalize"
                      >
                        {currentOrganization.subscriptionStatus}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Precio:</span>
                      <span className="text-sm">
                        ${parseFloat(planDetails.priceMonthly).toFixed(2)}/mes
                      </span>
                    </div>

                    {currentOrganization.trialEndsAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Fin de prueba:</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(currentOrganization.trialEndsAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Límites del Plan</h4>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pedidos por mes:</span>
                        <span className="text-sm font-medium">
                          {planDetails.maxOrdersPerMonth === -1
                            ? "Ilimitado"
                            : planDetails.maxOrdersPerMonth}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Usuarios:</span>
                        <span className="text-sm font-medium">
                          {planDetails.maxUsers === -1
                            ? "Ilimitado"
                            : planDetails.maxUsers}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Almacenamiento:</span>
                        <span className="text-sm font-medium">
                          {planDetails.maxStorageGb} GB
                        </span>
                      </div>
                    </div>

                    {planDetails.features && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold">Características</h4>

                          {planDetails.features.support && (
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-sm">
                                Soporte: {planDetails.features.support === 'community' ? 'Comunidad' :
                                         planDetails.features.support === 'email' ? 'Email' :
                                         planDetails.features.support === 'priority' ? 'Prioritario' :
                                         planDetails.features.support === 'dedicated' ? 'Dedicado' : planDetails.features.support}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            {planDetails.features.api_access ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">Acceso a API</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {planDetails.features.custom_branding ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">Personalización de marca</span>
                          </div>

                          {planDetails.features.advanced_analytics !== undefined && (
                            <div className="flex items-center gap-2">
                              {planDetails.features.advanced_analytics ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm">Analíticas avanzadas</span>
                            </div>
                           )}
                         </div>
                       </>
                     )}
                   </div>

                   <Separator className="my-4" />

                   {/* Subscription Actions */}
                   <div className="space-y-3">
                     {currentOrganization.subscriptionStripeCustomerId ? (
                       <Button
                         onClick={handleManageSubscription}
                         variant="outline"
                         className="w-full"
                       >
                         Gestionar Suscripción
                       </Button>
                     ) : (
                       <Button
                         onClick={() => handleSubscribeToPlan(planDetails)}
                         className="w-full"
                       >
                         Activar Suscripción
                       </Button>
                     )}
                   </div>
                 </>
               ) : (
                 <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">Plan:</span>
                     <Badge variant="secondary" className="capitalize">
                       {currentOrganization.subscriptionPlan}
                     </Badge>
                   </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estado:</span>
                    <Badge
                      variant={
                        currentOrganization.subscriptionStatus === "active"
                          ? "default"
                          : currentOrganization.subscriptionStatus === "trial"
                          ? "secondary"
                          : "destructive"
                      }
                      className="capitalize"
                    >
                      {currentOrganization.subscriptionStatus}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Plans Card */}
          <Card>
            <CardHeader>
              <CardTitle>Planes Disponibles</CardTitle>
              <CardDescription>
                Explora y compara los planes de suscripción disponibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPlan ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando planes...
                </div>
              ) : availablePlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay planes disponibles
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availablePlans.map((plan) => {
                    const isCurrentPlan = plan.slug === currentOrganization.subscriptionPlan;
                    const monthlyPrice = parseFloat(plan.priceMonthly) || 0;
                    const yearlyPrice = parseFloat(plan.priceYearly) || 0;
                    
                    return (
                      <Card 
                        key={plan.id} 
                        className={isCurrentPlan ? "border-primary shadow-md" : ""}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            {isCurrentPlan && (
                              <Badge variant="default">Actual</Badge>
                            )}
                          </div>
                          <CardDescription className="text-2xl font-bold">
                            ${monthlyPrice.toFixed(2)}
                            <span className="text-sm font-normal text-muted-foreground">/mes</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Pedidos/mes:</span>
                              <span className="font-medium">
                                {plan.maxOrdersPerMonth === -1 ? "Ilimitado" : plan.maxOrdersPerMonth}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Usuarios:</span>
                              <span className="font-medium">
                                {plan.maxUsers === -1 ? "Ilimitado" : plan.maxUsers}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Almacenamiento:</span>
                              <span className="font-medium">{plan.maxStorageGb} GB</span>
                            </div>
                          </div>
                          
                          {canManage && !isCurrentPlan && (
                            <Button
                              onClick={() => handleSubscribeToPlan(plan)}
                              className="w-full"
                              variant="outline"
                            >
                              Cambiar a este plan
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Miembros de la Organización</CardTitle>
              <CardDescription>
                Administra los miembros y sus permisos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/organization/members")}
                variant="default"
              >
                Gestionar Miembros
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
              <CardDescription>
                Configura los métodos de pago disponibles para los pedidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="card-types">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Tarjetas</CardTitle>
              <CardDescription>
                Configura los tipos de tarjetas aceptadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CardTypesList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stripe Checkout Dialog */}
      {selectedPlanForCheckout && (
        <StripeCheckout
          planId={selectedPlanForCheckout.id}
          planName={selectedPlanForCheckout.name}
          priceMonthly={parseFloat(selectedPlanForCheckout.priceMonthly) || 0}
          priceYearly={parseFloat(selectedPlanForCheckout.priceYearly) || 0}
          organizationId={currentOrganization.id}
          open={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
        />
      )}
    </div>
  );
}
