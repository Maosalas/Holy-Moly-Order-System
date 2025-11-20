import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Query key factory para mantener consistencia
export const recipeKeys = {
  all: ['recipes'] as const,
  detail: (id: string) => ['recipes', id] as const,
};

// Hook para obtener todas las recetas
export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.all,
    queryFn: async () => {
      const result = await recipesApi.getAll();
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener recetas";
        throw new Error(errorMsg);
      }
      return (result as any).data || [];
    },
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
}

// Hook para crear una receta
export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (recipe: any) => {
      const result = await recipesApi.create(recipe);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al crear receta";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      toast({
        title: "Receta creada",
        description: "La receta se ha creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la receta",
        variant: "destructive",
      });
    },
  });
}

// Hook para actualizar una receta
export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, recipe }: { id: string; recipe: any }) => {
      const result = await recipesApi.update(id, recipe);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al actualizar receta";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      toast({
        title: "Receta actualizada",
        description: "Los cambios se han guardado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la receta",
        variant: "destructive",
      });
    },
  });
}

// Hook para eliminar una receta
export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await recipesApi.delete(id);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al eliminar receta";
        throw new Error(errorMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      toast({
        title: "Receta eliminada",
        description: "La receta se ha eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la receta",
        variant: "destructive",
      });
    },
  });
}

// Hook para migrar recetas a elaboraciones
export function useMigrateRecipes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const result = await recipesApi.migrateToElaborations();
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al migrar recetas";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      toast({
        title: "Migración completada",
        description: "Las recetas se han migrado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo completar la migración",
        variant: "destructive",
      });
    },
  });
}
