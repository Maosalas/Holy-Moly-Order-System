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
      const { data, error } = await recipesApi.getAll();
      if (error) throw new Error(error);
      return (data as any[]) || [];
    },
    staleTime: 60000, // 1 minuto - recetas no cambian tan seguido
    refetchOnWindowFocus: true,
  });
}

// Hook para crear una receta
export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (recipe: any) => {
      const { data, error } = await recipesApi.create(recipe);
      if (error) throw new Error(error);
      return data;
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
      const { data, error } = await recipesApi.update(id, recipe);
      if (error) throw new Error(error);
      return data;
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
      const { error } = await recipesApi.delete(id);
      if (error) throw new Error(error);
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
      const { data, error } = await recipesApi.migrateToElaborations();
      if (error) throw new Error(error);
      return data;
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
