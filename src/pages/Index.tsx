import { useState } from "react";
import { Recipe, RecipeFormData } from "@/types/recipe";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipeList } from "@/components/RecipeList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from "@/hooks/use-recipes";

const Index = () => {
  // Usar React Query hooks
  const { data: recipesData = [], isLoading } = useRecipes();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();

  // Transformar datos del API
  const recipes: Recipe[] = recipesData.map((r: any) => ({
    ...r,
    createdAt: new Date(r.created_at || r.createdAt),
    updatedAt: new Date(r.updated_at || r.updatedAt)
  }));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  const handleSubmit = async (data: RecipeFormData) => {
    try {
      if (editingRecipe) {
        await updateRecipe.mutateAsync({ id: editingRecipe.id, recipe: data });
      } else {
        await createRecipe.mutateAsync(data);
      }
      setIsFormOpen(false);
      setEditingRecipe(undefined);
    } catch (error) {
      // Los errores ya son manejados por los hooks
      console.error("Error submitting recipe:", error);
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setRecipeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (recipeToDelete) {
      try {
        await deleteRecipe.mutateAsync(recipeToDelete);
        setDeleteDialogOpen(false);
        setRecipeToDelete(null);
      } catch (error) {
        // Los errores ya son manejados por los hooks
        console.error("Error deleting recipe:", error);
        setDeleteDialogOpen(false);
        setRecipeToDelete(null);
      }
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingRecipe(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Recetas</h2>
          <p className="text-muted-foreground mt-1">Administra tu base de datos de recetas</p>
        </div>
        {!isFormOpen && (
          <Button
            onClick={() => setIsFormOpen(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Nueva Receta
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <RecipeForm
          recipe={editingRecipe}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <RecipeList
          recipes={recipes}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          isDeleting={deleteRecipe.isPending}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Receta"
        description={`¿Estás seguro de que deseas eliminar "${recipes.find((r) => r.id === recipeToDelete)?.name || ""}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};

export default Index;
