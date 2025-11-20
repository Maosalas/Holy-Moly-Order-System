import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Query key factory para mantener consistencia
export const quotationKeys = {
  all: ['quotations'] as const,
  detail: (id: string) => ['quotations', id] as const,
  fillingMultipliers: (recipeId: string) => ['quotations', 'fillingMultipliers', recipeId] as const,
  coveringMultipliers: (recipeId: string) => ['quotations', 'coveringMultipliers', recipeId] as const,
  cakeMultipliers: (recipeId: string) => ['quotations', 'cakeMultipliers', recipeId] as const,
};

// Hook para obtener todas las cotizaciones
export function useQuotations() {
  return useQuery({
    queryKey: quotationKeys.all,
    queryFn: async () => {
      const result = await quotationsApi.getAll();
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener cotizaciones";
        throw new Error(errorMsg);
      }
      return (result as any).data || [];
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

// Hook para obtener multiplicadores de rellenos
export function useFillingMultipliers(recipeId: string) {
  return useQuery({
    queryKey: quotationKeys.fillingMultipliers(recipeId),
    queryFn: async () => {
      const result = await quotationsApi.getFillingMultipliers(recipeId);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener multiplicadores de rellenos";
        throw new Error(errorMsg);
      }
      return (result as any).data || [];
    },
    enabled: !!recipeId,
    staleTime: 60000,
  });
}

// Hook para obtener multiplicadores de coberturas
export function useCoveringMultipliers(recipeId: string) {
  return useQuery({
    queryKey: quotationKeys.coveringMultipliers(recipeId),
    queryFn: async () => {
      const result = await quotationsApi.getCoveringMultipliers(recipeId);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener multiplicadores de coberturas";
        throw new Error(errorMsg);
      }
      return (result as any).data || [];
    },
    enabled: !!recipeId,
    staleTime: 60000,
  });
}

// Hook para obtener multiplicadores de pasteles
export function useCakeMultipliers(recipeId: string) {
  return useQuery({
    queryKey: quotationKeys.cakeMultipliers(recipeId),
    queryFn: async () => {
      const result = await quotationsApi.getCakeMultipliers(recipeId);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener multiplicadores de pasteles";
        throw new Error(errorMsg);
      }
      return (result as any).data || [];
    },
    enabled: !!recipeId,
    staleTime: 60000,
  });
}

// Hook para crear una cotización
export function useCreateQuotation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quotation: any) => {
      const result = await quotationsApi.create(quotation);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al crear cotización";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      toast({
        title: "Cotización creada",
        description: "La cotización se ha creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la cotización",
        variant: "destructive",
      });
    },
  });
}

// Hook para actualizar una cotización
export function useUpdateQuotation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, quotation }: { id: string; quotation: any }) => {
      const result = await quotationsApi.update(id, quotation);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al actualizar cotización";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      toast({
        title: "Cotización actualizada",
        description: "Los cambios se han guardado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la cotización",
        variant: "destructive",
      });
    },
  });
}

// Hook para eliminar una cotización
export function useDeleteQuotation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await quotationsApi.delete(id);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al eliminar cotización";
        throw new Error(errorMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      toast({
        title: "Cotización eliminada",
        description: "La cotización se ha eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la cotización",
        variant: "destructive",
      });
    },
  });
}

// Hook para guardar multiplicadores de rellenos
export function useSaveFillingMultipliers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ recipeId, multipliers }: { recipeId: string; multipliers: Array<{ size: string; multiplier: number }> }) => {
      const result = await quotationsApi.saveFillingMultipliers(recipeId, multipliers);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al guardar multiplicadores de rellenos";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.fillingMultipliers(variables.recipeId) });
      toast({
        title: "Multiplicadores guardados",
        description: "Los multiplicadores de rellenos se han guardado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los multiplicadores",
        variant: "destructive",
      });
    },
  });
}

// Hook para guardar multiplicadores de coberturas
export function useSaveCoveringMultipliers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ recipeId, multipliers }: { recipeId: string; multipliers: Array<{ size: string; multiplier: number }> }) => {
      const result = await quotationsApi.saveCoveringMultipliers(recipeId, multipliers);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al guardar multiplicadores de coberturas";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.coveringMultipliers(variables.recipeId) });
      toast({
        title: "Multiplicadores guardados",
        description: "Los multiplicadores de coberturas se han guardado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los multiplicadores",
        variant: "destructive",
      });
    },
  });
}

// Hook para guardar multiplicadores de pasteles
export function useSaveCakeMultipliers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ recipeId, multipliers }: { recipeId: string; multipliers: Array<{ size: string; multiplier: number }> }) => {
      const result = await quotationsApi.saveCakeMultipliers(recipeId, multipliers);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al guardar multiplicadores de pasteles";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.cakeMultipliers(variables.recipeId) });
      toast({
        title: "Multiplicadores guardados",
        description: "Los multiplicadores de pasteles se han guardado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los multiplicadores",
        variant: "destructive",
      });
    },
  });
}
