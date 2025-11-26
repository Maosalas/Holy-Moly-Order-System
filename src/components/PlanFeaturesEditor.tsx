import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { subscriptionFeaturesApi, subscriptionPlansApi } from "@/lib/api";
import { Loader2, Save, RefreshCw, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface SubscriptionFeature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  valueType: 'boolean' | 'number' | 'string' | 'json';
  defaultValue: any;
  displayOrder: number;
}

interface PlanFeaturesEditorProps {
  planId: string;
  planName: string;
}

/**
 * Componente para editar los features asignados a un plan de suscripción
 */
export default function PlanFeaturesEditor({ planId, planName }: PlanFeaturesEditorProps) {
  const [availableFeatures, setAvailableFeatures] = useState<SubscriptionFeature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changedFeatures, setChangedFeatures] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [planId]);

  const loadData = async () => {
    setIsLoading(true);

    // Cargar features disponibles
    const featuresResult = await subscriptionFeaturesApi.getAll();
    if (featuresResult.error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los features disponibles",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Cargar features del plan
    const planFeaturesResult = await subscriptionPlansApi.getPlanFeatures(planId);
    if (planFeaturesResult.error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los features del plan",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setAvailableFeatures((featuresResult.data as SubscriptionFeature[]) || []);
    setPlanFeatures((planFeaturesResult.data as Record<string, any>) || {});
    setChangedFeatures(new Set());
    setIsLoading(false);
  };

  const handleFeatureChange = (featureKey: string, value: any) => {
    setPlanFeatures((prev) => ({
      ...prev,
      [featureKey]: value,
    }));

    setChangedFeatures((prev) => new Set(prev).add(featureKey));
  };

  const handleSaveFeature = async (featureKey: string) => {
    setIsSaving(true);

    const result = await subscriptionPlansApi.updatePlanFeature(
      planId,
      featureKey,
      { value: planFeatures[featureKey] }
    );

    if (result.error) {
      const errorMsg = typeof result.error === 'string'
        ? result.error
        : (result.error as any)?.message || "Error al guardar el feature";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    toast({
      title: "Éxito",
      description: `Feature "${featureKey}" actualizado`,
    });

    // Remover de la lista de cambios
    setChangedFeatures((prev) => {
      const newSet = new Set(prev);
      newSet.delete(featureKey);
      return newSet;
    });

    setIsSaving(false);
  };

  const handleSaveAll = async () => {
    if (changedFeatures.size === 0) {
      toast({
        title: "Info",
        description: "No hay cambios para guardar",
      });
      return;
    }

    setIsSaving(true);

    let errorCount = 0;
    for (const featureKey of changedFeatures) {
      const result = await subscriptionPlansApi.updatePlanFeature(
        planId,
        featureKey,
        { value: planFeatures[featureKey] }
      );

      if (result.error) {
        errorCount++;
      }
    }

    if (errorCount > 0) {
      toast({
        title: "Advertencia",
        description: `${errorCount} feature(s) no se pudieron guardar`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Todos los cambios se guardaron correctamente",
      });
      setChangedFeatures(new Set());
    }

    setIsSaving(false);
    loadData();
  };

  const handleRemoveFeature = async (featureKey: string) => {
    if (!confirm(`¿Eliminar el feature "${featureKey}" de este plan?`)) {
      return;
    }

    const result = await subscriptionPlansApi.deletePlanFeature(planId, featureKey);

    if (result.error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el feature",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Éxito",
      description: `Feature "${featureKey}" eliminado del plan`,
    });

    loadData();
  };

  const renderFeatureInput = (feature: SubscriptionFeature) => {
    const value = planFeatures[feature.key] ?? feature.defaultValue;
    const hasChanged = changedFeatures.has(feature.key);

    switch (feature.valueType) {
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={value}
              onCheckedChange={(checked) => handleFeatureChange(feature.key, checked)}
            />
            <span className="text-sm text-muted-foreground">
              {value ? 'Habilitado' : 'Deshabilitado'}
            </span>
            {hasChanged && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaveFeature(feature.key)}
                disabled={isSaving}
              >
                <Save className="h-3 w-3 mr-1" />
                Guardar
              </Button>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFeatureChange(feature.key, parseFloat(e.target.value))}
              className="w-32"
            />
            {hasChanged && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaveFeature(feature.key)}
                disabled={isSaving}
              >
                <Save className="h-3 w-3 mr-1" />
                Guardar
              </Button>
            )}
          </div>
        );

      case 'string':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={value}
              onChange={(e) => handleFeatureChange(feature.key, e.target.value)}
              className="w-64"
            />
            {hasChanged && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaveFeature(feature.key)}
                disabled={isSaving}
              >
                <Save className="h-3 w-3 mr-1" />
                Guardar
              </Button>
            )}
          </div>
        );

      case 'json':
        return (
          <div className="flex flex-col gap-2">
            <textarea
              value={JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  handleFeatureChange(feature.key, JSON.parse(e.target.value));
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              className="w-full min-h-[100px] p-2 border rounded font-mono text-xs"
            />
            {hasChanged && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaveFeature(feature.key)}
                disabled={isSaving}
                className="self-start"
              >
                <Save className="h-3 w-3 mr-1" />
                Guardar
              </Button>
            )}
          </div>
        );

      default:
        return <span className="text-muted-foreground">Tipo no soportado</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Features del Plan: {planName}</CardTitle>
            <CardDescription>
              Configura qué features están disponibles para este plan
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
            {changedFeatures.size > 0 && (
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Todos ({changedFeatures.size})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground mt-2">Cargando features...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableFeatures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay features disponibles en el sistema</p>
                <p className="text-sm">Crea features primero en la sección de Features</p>
              </div>
            ) : (
              availableFeatures
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((feature, index) => (
                  <div key={feature.key}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-semibold">
                              {feature.name}
                            </Label>
                            <Badge variant="outline" className="text-xs font-mono">
                              {feature.key}
                            </Badge>
                            {changedFeatures.has(feature.key) && (
                              <Badge variant="secondary" className="text-xs">
                                Sin guardar
                              </Badge>
                            )}
                          </div>
                          {feature.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {feature.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Tipo: <code>{feature.valueType}</code> | Valor por defecto:{' '}
                            <code>{JSON.stringify(feature.defaultValue)}</code>
                          </p>
                        </div>
                        {planFeatures[feature.key] !== undefined && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFeature(feature.key)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                      <div className="mt-2">
                        {renderFeatureInput(feature)}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
