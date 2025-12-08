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
      return (result as any).data || [];
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
      return (result as any).data || [];
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
      return (result as any).data || [];
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
      return (result as any).data || [];
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
