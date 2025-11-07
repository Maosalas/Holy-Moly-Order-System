import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeParametersApi } from "@/lib/api";
import { RecipeParameter, RecipeParameterFormData } from "@/types/recipe-parameter";
import { useToast } from "@/hooks/use-toast";

export function useRecipeParameters() {
  return useQuery({
    queryKey: ["recipe-parameters"],
    queryFn: async () => {
      const { data, error } = await recipeParametersApi.getAll();
      if (error) throw error;
      return (data || []).map((p: any) => ({
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
      const { data: result, error } = await recipeParametersApi.create(data);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-parameters"] });
      toast({
        title: "Parámetro creado",
        description: "El parámetro global ha sido creado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el parámetro",
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
      const { data: result, error } = await recipeParametersApi.update(id, data);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-parameters"] });
      toast({
        title: "Parámetro actualizado",
        description: "El parámetro global ha sido actualizado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el parámetro",
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
      const { error } = await recipeParametersApi.delete(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-parameters"] });
      toast({
        title: "Parámetro eliminado",
        description: "El parámetro global ha sido eliminado",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el parámetro",
        variant: "destructive",
      });
    },
  });
}
