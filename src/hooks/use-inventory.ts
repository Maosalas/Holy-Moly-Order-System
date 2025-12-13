import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { InventoryItemFormData, InventoryPurchaseFormData } from "@/types/inventory";

export const inventoryKeys = {
  all: ['inventory'] as const,
  items: ['inventory', 'items'] as const,
  item: (id: string) => ['inventory', 'items', id] as const,
  alerts: ['inventory', 'alerts'] as const,
  purchases: ['inventory', 'purchases'] as const,
  movements: ['inventory', 'movements'] as const,
};

// Hook para obtener todos los items de inventario
export function useInventoryItems() {
  return useQuery({
    queryKey: inventoryKeys.items,
    queryFn: async () => {
      const result = await inventoryApi.getItems();
      if (result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as any)?.message || "Error al obtener inventario";
        throw new Error(errorMsg);
      }
      const items = (result as any).data || [];
      // Transform backend fields to frontend expected format
      return items.map((item: any) => ({
        ...item,
        itemName: item.itemName || item.item_name || item.name,
        itemType: item.itemType || item.item_type || item.category,
        currentStock: item.currentStock ?? item.current_stock,
        minStockThreshold: item.minStockThreshold ?? item.min_stock_threshold ?? item.minimumStock,
        isLowStock: item.isLowStock ?? item.is_low_stock ?? (item.currentStock < (item.minimumStock || item.minStockThreshold || 0)),
        lastRestockDate: item.lastRestockDate || item.last_restock_date,
        createdAt: item.createdAt || item.created_at,
        updatedAt: item.updatedAt || item.updated_at,
        organizationId: item.organizationId || item.organization_id,
        ingredientId: item.ingredientId || item.ingredient_id,
        supplyId: item.supplyId || item.supply_id,
      }));
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

// Hook para obtener alertas de inventario
export function useInventoryAlerts() {
  return useQuery({
    queryKey: inventoryKeys.alerts,
    queryFn: async () => {
      const result = await inventoryApi.getAlerts();
      if (result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as any)?.message || "Error al obtener alertas";
        throw new Error(errorMsg);
      }
      const alerts = (result as any).data || [];
      // Transform snake_case to camelCase
      return alerts.map((alert: any) => ({
        ...alert,
        itemName: alert.itemName || alert.item_name,
        currentStock: alert.currentStock ?? alert.current_stock,
        minStockThreshold: alert.minStockThreshold ?? alert.min_stock_threshold,
        alertType: alert.alertType || alert.alert_type,
        isRead: alert.isRead ?? alert.is_read,
        isResolved: alert.isResolved ?? alert.is_resolved,
        createdAt: alert.createdAt || alert.created_at,
        resolvedAt: alert.resolvedAt || alert.resolved_at,
        organizationId: alert.organizationId || alert.organization_id,
        inventoryItemId: alert.inventoryItemId || alert.inventory_item_id,
      }));
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch cada minuto para alertas actualizadas
  });
}

// Hook para obtener historial de compras
export function useInventoryPurchases() {
  return useQuery({
    queryKey: inventoryKeys.purchases,
    queryFn: async () => {
      const result = await inventoryApi.getPurchases();
      if (result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as any)?.message || "Error al obtener compras";
        throw new Error(errorMsg);
      }
      const purchases = (result as any).data || [];
      // Transform snake_case to camelCase
      return purchases.map((purchase: any) => ({
        ...purchase,
        itemName: purchase.itemName || purchase.item_name,
        supplierName: purchase.supplierName || purchase.supplier_name,
        purchaseDate: purchase.purchaseDate || purchase.purchase_date,
        createdAt: purchase.createdAt || purchase.created_at,
        organizationId: purchase.organizationId || purchase.organization_id,
        inventoryItemId: purchase.inventoryItemId || purchase.inventory_item_id,
      }));
    },
    staleTime: 60000,
  });
}

// Hook para obtener historial de movimientos
export function useInventoryMovements() {
  return useQuery({
    queryKey: inventoryKeys.movements,
    queryFn: async () => {
      const result = await inventoryApi.getMovements();
      if (result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as any)?.message || "Error al obtener movimientos";
        throw new Error(errorMsg);
      }
      const movements = (result as any).data || [];
      // Transform snake_case to camelCase
      return movements.map((movement: any) => ({
        ...movement,
        itemName: movement.itemName || movement.item_name,
        movementType: movement.movementType || movement.movement_type,
        previousStock: movement.previousStock ?? movement.previous_stock,
        newStock: movement.newStock ?? movement.new_stock,
        referenceType: movement.referenceType || movement.reference_type,
        referenceId: movement.referenceId || movement.reference_id,
        createdAt: movement.createdAt || movement.created_at,
        organizationId: movement.organizationId || movement.organization_id,
        inventoryItemId: movement.inventoryItemId || movement.inventory_item_id,
      }));
    },
    staleTime: 60000,
  });
}

// Hook para crear/actualizar item de inventario
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: InventoryItemFormData) => {
      const result = await inventoryApi.createItem(item);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al crear item de inventario";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts });
      toast({
        title: "Item agregado",
        description: "El item se ha agregado al inventario",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para actualizar item de inventario
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, item }: { id: string; item: Partial<InventoryItemFormData> }) => {
      const result = await inventoryApi.updateItem(id, item);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al actualizar inventario";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts });
      toast({
        title: "Inventario actualizado",
        description: "Los cambios se han guardado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para registrar una compra/reposición
export function useCreatePurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (purchase: InventoryPurchaseFormData) => {
      const result = await inventoryApi.createPurchase(purchase);
      if (result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as any)?.message || "Error al registrar compra";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.purchases });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts });
      toast({
        title: "Compra registrada",
        description: "El inventario ha sido actualizado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para marcar alerta como resuelta
export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const result = await inventoryApi.resolveAlert(alertId);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al resolver alerta";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts });
      toast({
        title: "Alerta resuelta",
        description: "La alerta ha sido marcada como resuelta",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para marcar alerta como leída
export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const result = await inventoryApi.markAlertRead(alertId);
      if (result.error) {
        throw new Error("Error al marcar alerta como leída");
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts });
    },
  });
}

// Hook para eliminar item de inventario
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const result = await inventoryApi.deleteItem(itemId);
      if (result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as any)?.message || "Error al eliminar item de inventario";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts });
      toast({
        title: "Item eliminado",
        description: "El item ha sido eliminado del inventario",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
