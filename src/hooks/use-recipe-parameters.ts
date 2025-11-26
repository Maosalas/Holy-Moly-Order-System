import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeParametersApi } from "@/lib/api";
import { RecipeParameter, RecipeParameterFormData } from "@/types/recipe-parameter";
import { useToast } from "@/hooks/use-toast";

export function useRecipeParameters() {
  return useQuery({
    queryKey: ["recipe-parameters"],
    queryFn: async () => {
      const result = await recipeParametersApi.getAll();
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error al obtener parámetros";
        throw new Error(errorMsg);
      }
      const data = (result as any).data || [];
      return (data as any[]).map((p: any) => ({
        ...p,
        createdAt: new Date(p.created_at || p.createdAt),
        updatedAt: new Date(p.updated_at || p.updatedAt),
      })) as RecipeParameter[];
    },
  });
}

export function useCreateRecipeParameter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RecipeParameterFormData) => {
      const result = await recipeParametersApi.create(data);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error al crear parámetro";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-parameters"] });
      toast({
        title: "Parámetro creado",
        description: "El parámetro global ha sido creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el parámetro",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateRecipeParameter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecipeParameterFormData> }) => {
      const result = await recipeParametersApi.update(id, data);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error al actualizar parámetro";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-parameters"] });
      toast({
        title: "Parámetro actualizado",
        description: "El parámetro global ha sido actualizado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el parámetro",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRecipeParameter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await recipeParametersApi.delete(id);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error al eliminar parámetro";
        throw new Error(errorMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-parameters"] });
      toast({
        title: "Parámetro eliminado",
        description: "El parámetro global ha sido eliminado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el parámetro",
        variant: "destructive",
      });
    },
  });
}
