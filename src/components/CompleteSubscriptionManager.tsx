import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SubscriptionPlansManager from "./SubscriptionPlansManager";
import SubscriptionFeaturesManager from "./SubscriptionFeaturesManager";
import PlanFeaturesEditor from "./PlanFeaturesEditor";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Componente completo para gestionar suscripciones
 * Incluye:
 * - Gestión de Planes
 * - Gestión de Features disponibles
 * - Asignación de Features a Planes
 */
export default function CompleteSubscriptionManager() {
  const { plans } = useSubscriptionPlans(false);
  const [selectedPlan, setSelectedPlan] = useState<{id: string; name: string} | null>(null);

  return (
    <div className="space-y-6">
      {selectedPlan ? (
        // Vista de edición de features del plan
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedPlan(null)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Planes
          </Button>
          <PlanFeaturesEditor
            planId={selectedPlan.id}
            planName={selectedPlan.name}
          />
        </div>
      ) : (
        // Vista principal con tabs
        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plans">
              Planes
              <Badge variant="secondary" className="ml-2">
                {plans.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="features">
              Features Disponibles
            </TabsTrigger>
            <TabsTrigger value="assignment">
              Asignar Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <SubscriptionPlansManager />
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <SubscriptionFeaturesManager />
          </TabsContent>

          <TabsContent value="assignment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Asignar Features a Planes</CardTitle>
                <CardDescription>
                  Selecciona un plan para configurar sus features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedPlan({ id: plan.id, name: plan.name })}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          {plan.active ? (
                            <Badge variant="default">Activo</Badge>
                          ) : (
                            <Badge variant="secondary">Inactivo</Badge>
                          )}
                        </div>
                        <CardDescription className="font-mono text-xs">
                          {plan.slug}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold">
                            ${plan.priceMonthly}/mes
                          </p>
                          <div className="text-muted-foreground space-y-1">
                            <p>📦 {plan.maxOrdersPerMonth === -1 ? 'Ilimitado' : plan.maxOrdersPerMonth} pedidos/mes</p>
                            <p>👥 {plan.maxUsers === -1 ? 'Ilimitados' : plan.maxUsers} usuarios</p>
                            <p>💾 {plan.maxStorageGb} GB storage</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlan({ id: plan.id, name: plan.name });
                            }}
                          >
                            Configurar Features →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {plans.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-muted-foreground">
                      <p>No hay planes disponibles</p>
                      <p className="text-sm">Crea un plan primero en la pestaña "Planes"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
