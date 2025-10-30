import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import type { Order } from "@/types/order";
import { useToast } from "@/hooks/use-toast";

// Query key factory para mantener consistencia
export const orderKeys = {
  all: ['orders'] as const,
  detail: (id: string) => ['orders', id] as const,
};

// Hook para obtener todos los pedidos
export function useOrders() {
  return useQuery({
    queryKey: orderKeys.all,
    queryFn: async () => {
      const { data, error } = await ordersApi.getAll();
      if (error) throw new Error(error);
      return (data as Order[]) || [];
    },
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true,
  });
}

// Hook para obtener un pedido por ID
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await ordersApi.getById(id);
      if (error) throw new Error(error);
      return data as Order;
    },
    enabled: !!id, // Solo ejecuta si hay un ID válido
  });
}

// Hook para crear un pedido
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (order: any) => {
      const { data, error } = await ordersApi.create(order);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      // Invalida y refresca la lista de pedidos
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
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
      const { data, error } = await ordersApi.update(id, order);
      if (error) throw new Error(error);
      return data;
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
      const { error } = await ordersApi.delete(id);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
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
