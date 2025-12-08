import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  History, 
  Plus, 
  Bell,
  TrendingDown,
  CheckCircle2
} from "lucide-react";
import { FeatureGuard } from "@/components/FeatureGuard";
import { useInventoryItems, useInventoryAlerts, useInventoryPurchases, useInventoryMovements, useResolveAlert, useMarkAlertRead } from "@/hooks/use-inventory";
import { InventoryItemsList } from "@/components/inventory/InventoryItemsList";
import { InventoryAlertsList } from "@/components/inventory/InventoryAlertsList";
import { InventoryPurchaseForm } from "@/components/inventory/InventoryPurchaseForm";
import { InventoryPurchaseHistory } from "@/components/inventory/InventoryPurchaseHistory";
import { InventoryMovementHistory } from "@/components/inventory/InventoryMovementHistory";
import { AddInventoryItemDialog } from "@/components/inventory/AddInventoryItemDialog";
import { InventoryItem, InventoryAlert } from "@/types/inventory";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("items");
  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<InventoryItem | null>(null);

  const { data: items = [], isLoading: isLoadingItems } = useInventoryItems();
  const { data: alerts = [], isLoading: isLoadingAlerts } = useInventoryAlerts();
  const { data: purchases = [], isLoading: isLoadingPurchases } = useInventoryPurchases();
  const { data: movements = [], isLoading: isLoadingMovements } = useInventoryMovements();
  const resolveAlertMutation = useResolveAlert();
  const markAlertReadMutation = useMarkAlertRead();

  // Stats
  const stats = useMemo(() => {
    const lowStockItems = (items as InventoryItem[]).filter(item => item.isLowStock);
    const outOfStockItems = (items as InventoryItem[]).filter(item => item.currentStock === 0);
    const unresolvedAlerts = (alerts as InventoryAlert[]).filter(alert => !alert.isResolved);
    const unreadAlerts = unresolvedAlerts.filter(alert => !alert.isRead);

    return {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      alertsCount: unresolvedAlerts.length,
      unreadAlertsCount: unreadAlerts.length,
    };
  }, [items, alerts]);

  const handleRestock = (item: InventoryItem) => {
    setSelectedItemForPurchase(item);
    setIsPurchaseFormOpen(true);
  };

  const handleResolveAlert = async (alertId: string) => {
    await resolveAlertMutation.mutateAsync(alertId);
  };

  const handleMarkAlertRead = async (alertId: string) => {
    await markAlertReadMutation.mutateAsync(alertId);
  };

  return (
    <FeatureGuard 
      feature="inventory_alerts"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Gestión de Inventario</h2>
          <p className="text-muted-foreground max-w-md mb-4">
            El control de inventario con alertas de stock bajo está disponible en el plan Enterprise.
          </p>
          <Button variant="default" onClick={() => window.location.href = "/settings/subscription"}>
            Ver planes disponibles
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Inventario</h1>
            <p className="text-muted-foreground mt-1">
              Controla tu stock, recibe alertas y registra compras
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAddItemDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Item
            </Button>
            <Button onClick={() => setIsPurchaseFormOpen(true)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Registrar Compra
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stats.totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats.lowStockCount > 0 ? "border-amber-500" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock Bajo</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.lowStockCount}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats.outOfStockCount > 0 ? "border-destructive" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sin Stock</p>
                  <p className="text-2xl font-bold text-destructive">{stats.outOfStockCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats.unreadAlertsCount > 0 ? "border-primary" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{stats.alertsCount}</p>
                    {stats.unreadAlertsCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {stats.unreadAlertsCount} nuevas
                      </Badge>
                    )}
                  </div>
                </div>
                <Bell className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Inventario</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2 relative">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alertas</span>
              {stats.unreadAlertsCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {stats.unreadAlertsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Compras</span>
            </TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Movimientos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <InventoryItemsList 
              items={items as InventoryItem[]} 
              isLoading={isLoadingItems}
              onRestock={handleRestock}
            />
          </TabsContent>

          <TabsContent value="alerts">
            <InventoryAlertsList 
              alerts={alerts as InventoryAlert[]} 
              isLoading={isLoadingAlerts}
              onResolve={handleResolveAlert}
              onMarkRead={handleMarkAlertRead}
              onRestock={(alert) => {
                const item = (items as InventoryItem[]).find(i => i.id === alert.inventoryItemId);
                if (item) handleRestock(item);
              }}
            />
          </TabsContent>

          <TabsContent value="purchases">
            <InventoryPurchaseHistory 
              purchases={purchases} 
              isLoading={isLoadingPurchases}
            />
          </TabsContent>

          <TabsContent value="movements">
            <InventoryMovementHistory 
              movements={movements} 
              isLoading={isLoadingMovements}
            />
          </TabsContent>
        </Tabs>

        {/* Purchase Form Dialog */}
        <InventoryPurchaseForm 
          isOpen={isPurchaseFormOpen}
          onClose={() => {
            setIsPurchaseFormOpen(false);
            setSelectedItemForPurchase(null);
          }}
          selectedItem={selectedItemForPurchase}
          items={items as InventoryItem[]}
        />

        {/* Add Item Dialog */}
        <AddInventoryItemDialog
          isOpen={isAddItemDialogOpen}
          onClose={() => setIsAddItemDialogOpen(false)}
        />
      </div>
    </FeatureGuard>
  );
}
