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
      const { data, error } = await suppliesApi.getAll();
      if (error) throw new Error(error);
      return (data as any[]) || [];
    },
    staleTime: 60000, // 1 minuto - suministros no cambian tan seguido
    refetchOnWindowFocus: true,
  });
}

// Hook para crear un suministro
export function useCreateSupply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (supply: any) => {
      const { data, error } = await suppliesApi.create(supply);
      if (error) throw new Error(error);
      return data;
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
      const { data, error } = await suppliesApi.update(id, supply);
      if (error) throw new Error(error);
      return data;
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
      const { error } = await suppliesApi.delete(id);
      if (error) throw new Error(error);
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
