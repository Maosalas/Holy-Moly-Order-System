import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import type { Order } from "@/types/order";
import { useToast } from "@/hooks/use-toast";

// Query key factory para mantener consistencia
export const orderKeys = {
  all: ['orders'] as const,
  detail: (id: string) => ['orders', id] as const,
  usage: ['orders', 'usage'] as const,
};

// Hook para obtener todos los pedidos
export function useOrders() {
  return useQuery({
    queryKey: orderKeys.all,
    queryFn: async () => {
      const result = await ordersApi.getAll();
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener pedidos";
        throw new Error(errorMsg);
      }
      return (result as any).data || [];
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

// Hook para obtener un pedido por ID
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => {
      const result = await ordersApi.getById(id);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener pedido";
        throw new Error(errorMsg);
      }
      return (result as any).data as Order;
    },
    enabled: !!id,
  });
}

// Hook para crear un pedido
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (order: any) => {
      const result = await ordersApi.create(order);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al crear pedido";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      // Invalida y refresca la lista de pedidos y el usage
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.usage });
      toast({
        title: "Pedido creado",
        description: "El pedido se ha creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el pedido",
        variant: "destructive",
      });
    },
  });
}

// Hook para actualizar un pedido
export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, order }: { id: string; order: any }) => {
      const result = await ordersApi.update(id, order);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al actualizar pedido";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: (_, variables) => {
      // Invalida la lista completa y el detalle específico
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
      toast({
        title: "Pedido actualizado",
        description: "Los cambios se han guardado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el pedido",
        variant: "destructive",
      });
    },
  });
}

// Hook para eliminar un pedido
export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await ordersApi.delete(id);
      if (result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as any)?.message || "Error al eliminar pedido";
        throw new Error(errorMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.usage });
      toast({
        title: "Pedido eliminado",
        description: "El pedido se ha eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el pedido",
        variant: "destructive",
      });
    },
  });
}

// Hook para obtener el uso de órdenes del mes actual
export function useOrdersUsage() {
  return useQuery({
    queryKey: orderKeys.usage,
    queryFn: async () => {
      const result = await ordersApi.getUsage();
      if (result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as any)?.message || "Error al obtener uso de órdenes";
        throw new Error(errorMsg);
      }
      return (result as any).data as {
        currentCount: number;
        limit: number | null;
        canCreate: boolean;
        planSlug: string;
        remaining: number | null;
        isUnlimited: boolean;
      };
    },
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch cada minuto para mantener actualizado
  });
}
