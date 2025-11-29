import { useOrdersUsage } from "@/hooks/use-orders";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface OrderLimitIndicatorProps {
  variant?: "badge" | "alert" | "inline";
  showUpgradeButton?: boolean;
}

export function OrderLimitIndicator({
  variant = "badge",
  showUpgradeButton = false
}: OrderLimitIndicatorProps) {
  const { data: usage, isLoading } = useOrdersUsage();
  const navigate = useNavigate();

  if (isLoading || !usage) {
    return null;
  }

  // Si es plan ilimitado, no mostrar nada o mostrar un indicador simple
  if (usage.isUnlimited) {
    if (variant === "badge") {
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Package className="h-3 w-3" />
          <span>Pedidos ilimitados</span>
        </Badge>
      );
    }
    return null;
  }

  // Calcular el porcentaje de uso
  const usagePercentage = usage.limit ? (usage.currentCount / usage.limit) * 100 : 0;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = !usage.canCreate;

  // Variante Badge (para header/topbar)
  if (variant === "badge") {
    return (
      <Badge
        variant={isAtLimit ? "destructive" : isNearLimit ? "outline" : "secondary"}
        className="gap-1.5"
      >
        <Package className="h-3 w-3" />
        <span>
          {usage.currentCount} de {usage.limit} pedidos
        </span>
      </Badge>
    );
  }

  // Variante Alert (para mostrar advertencias)
  if (variant === "alert" && (isAtLimit || isNearLimit)) {
    return (
      <Alert variant={isAtLimit ? "destructive" : "default"} className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            {isAtLimit ? (
              <p>
                <strong>Límite alcanzado:</strong> Has usado {usage.currentCount} de {usage.limit} pedidos este mes.
                Para crear más pedidos, actualiza tu plan o espera hasta el próximo mes.
              </p>
            ) : (
              <p>
                <strong>Cerca del límite:</strong> Has usado {usage.currentCount} de {usage.limit} pedidos este mes
                ({Math.round(usagePercentage)}%). Te quedan {usage.remaining} pedidos.
              </p>
            )}
          </div>
          {showUpgradeButton && (
            <Button
              variant={isAtLimit ? "default" : "outline"}
              size="sm"
              onClick={() => navigate("/settings")}
              className="ml-4 shrink-0"
            >
              Actualizar plan
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Variante Inline (para mostrar en formularios o listas)
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Package className="h-4 w-4" />
        <span>
          {usage.currentCount} de {usage.limit} pedidos usados este mes
          {usage.remaining !== null && usage.remaining > 0 && (
            <span className="ml-1">({usage.remaining} restantes)</span>
          )}
        </span>
      </div>
    );
  }

  return null;
}
