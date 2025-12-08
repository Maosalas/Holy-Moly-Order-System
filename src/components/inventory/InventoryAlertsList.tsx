import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle2, ShoppingCart, Eye } from "lucide-react";
import { InventoryAlert } from "@/types/inventory";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface InventoryAlertsListProps {
  alerts: InventoryAlert[];
  isLoading: boolean;
  onResolve: (alertId: string) => void;
  onMarkRead: (alertId: string) => void;
  onRestock: (alert: InventoryAlert) => void;
}

export function InventoryAlertsList({ alerts, isLoading, onResolve, onMarkRead, onRestock }: InventoryAlertsListProps) {
  const [showResolved, setShowResolved] = useState(false);

  const filteredAlerts = showResolved ? alerts : alerts.filter(a => !a.isResolved);
  const unresolvedCount = alerts.filter(a => !a.isResolved).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Cargando alertas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas de Inventario
            {unresolvedCount > 0 && (
              <Badge variant="destructive">{unresolvedCount}</Badge>
            )}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? "Ocultar resueltas" : "Mostrar resueltas"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-muted-foreground">
              {showResolved ? "No hay alertas" : "¡No hay alertas pendientes!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 rounded-lg border transition-colors ${
                  alert.isResolved 
                    ? "bg-muted/50 border-muted" 
                    : alert.alertType === "out_of_stock"
                      ? "bg-destructive/5 border-destructive/20"
                      : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                } ${!alert.isRead && !alert.isResolved ? "ring-2 ring-primary ring-offset-2" : ""}`}
              >
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      alert.isResolved 
                        ? "bg-muted" 
                        : alert.alertType === "out_of_stock"
                          ? "bg-destructive/10"
                          : "bg-amber-100 dark:bg-amber-900/50"
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${
                        alert.isResolved 
                          ? "text-muted-foreground" 
                          : alert.alertType === "out_of_stock"
                            ? "text-destructive"
                            : "text-amber-600"
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{alert.itemName}</h4>
                        <Badge variant={alert.alertType === "out_of_stock" ? "destructive" : "outline"} className={alert.alertType !== "out_of_stock" ? "border-amber-500 text-amber-600" : ""}>
                          {alert.alertType === "out_of_stock" ? "Sin Stock" : "Stock Bajo"}
                        </Badge>
                        {alert.isResolved && (
                          <Badge variant="secondary">Resuelto</Badge>
                        )}
                        {!alert.isRead && !alert.isResolved && (
                          <Badge variant="default" className="text-xs">Nueva</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Stock actual: <span className="font-medium">{alert.currentStock} {alert.unit}</span>
                        {" · "}
                        Mínimo: <span className="font-medium">{alert.minStockThreshold} {alert.unit}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                  
                  {!alert.isResolved && (
                    <div className="flex gap-2 sm:flex-col">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => onRestock(alert)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Reponer
                      </Button>
                      {!alert.isRead && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onMarkRead(alert.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Marcar leída
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onResolve(alert.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Resolver
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
