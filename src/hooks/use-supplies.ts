import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Query key factory para mantener consistencia
export const supplyKeys = {
  all: ['supplies'] as const,
  detail: (id: string) => ['supplies', id] as const,
};

// Hook para obtener todos los suministros
export function useSupplies() {
  return useQuery({
    queryKey: supplyKeys.all,
    queryFn: async () => {
      const result = await suppliesApi.getAll();
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener suministros";
        throw new Error(errorMsg);
      }
      return (result as any).data || [];
    },
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
}

// Hook para crear un suministro
export function useCreateSupply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (supply: any) => {
      const result = await suppliesApi.create(supply);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al crear suministro";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplyKeys.all });
      toast({
        title: "Suministro creado",
        description: "El suministro se ha creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el suministro",
        variant: "destructive",
      });
    },
  });
}

// Hook para actualizar un suministro
export function useUpdateSupply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, supply }: { id: string; supply: any }) => {
      const result = await suppliesApi.update(id, supply);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al actualizar suministro";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplyKeys.all });
      toast({
        title: "Suministro actualizado",
        description: "Los cambios se han guardado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el suministro",
        variant: "destructive",
      });
    },
  });
}

// Hook para eliminar un suministro
export function useDeleteSupply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await suppliesApi.delete(id);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al eliminar suministro";
        throw new Error(errorMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplyKeys.all });
      toast({
        title: "Suministro eliminado",
        description: "El suministro se ha eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el suministro",
        variant: "destructive",
      });
    },
  });
}
