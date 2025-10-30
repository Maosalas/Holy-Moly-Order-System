import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ingredientsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Query key factory para mantener consistencia
export const ingredientKeys = {
  all: ['ingredients'] as const,
  detail: (id: string) => ['ingredients', id] as const,
};

// Hook para obtener todos los ingredientes
export function useIngredients() {
  return useQuery({
    queryKey: ingredientKeys.all,
    queryFn: async () => {
      const { data, error } = await ingredientsApi.getAll();
      if (error) throw new Error(error);
      return (data as any[]) || [];
    },
    staleTime: 60000, // 1 minuto - ingredientes no cambian tan seguido
    refetchOnWindowFocus: true,
  });
}

// Hook para crear un ingrediente
export function useCreateIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ingredient: any) => {
      const { data, error } = await ingredientsApi.create(ingredient);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      toast({
        title: "Ingrediente creado",
        description: "El ingrediente se ha creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el ingrediente",
        variant: "destructive",
      });
    },
  });
}

// Hook para actualizar un ingrediente
export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ingredient }: { id: string; ingredient: any }) => {
      const { data, error } = await ingredientsApi.update(id, ingredient);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      toast({
        title: "Ingrediente actualizado",
        description: "Los cambios se han guardado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el ingrediente",
        variant: "destructive",
      });
    },
  });
}

// Hook para eliminar un ingrediente
export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await ingredientsApi.delete(id);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      toast({
        title: "Ingrediente eliminado",
        description: "El ingrediente se ha eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el ingrediente",
        variant: "destructive",
      });
    },
  });
}
