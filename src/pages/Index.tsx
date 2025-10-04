import { useState, useEffect } from "react";
import { Recipe, RecipeFormData } from "@/types/recipe";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipeList } from "@/components/RecipeList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { recipesApi } from "@/lib/api";

const Index = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      const result = await recipesApi.getAll();
      if (result.data) {
        const recipesData = Array.isArray(result.data) ? result.data : [];
        setRecipes(recipesData.map((r: any) => ({
          ...r,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at)
        })));
      }
      setIsLoading(false);
    };
    fetchRecipes();
  }, []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  const handleSubmit = async (data: RecipeFormData) => {
    if (editingRecipe) {
      const result = await recipesApi.update(editingRecipe.id, data);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        return;
      }
      setRecipes(
        recipes.map((r) =>
          r.id === editingRecipe.id
            ? { ...data, id: r.id, createdAt: r.createdAt, updatedAt: new Date() }
            : r
        )
      );
        toast({
          title: "Receta Actualizada",
          description: `${data.name} ha sido actualizada exitosamente.`,
        });
    } else {
      const result = await recipesApi.create(data);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        return;
      }
      const recipeData = (result.data as any).recipe || result.data;
      const newRecipe: Recipe = {
        ...data,
        id: recipeData.id,
        createdAt: new Date(recipeData.created_at),
        updatedAt: new Date(recipeData.updated_at),
      };
      setRecipes([...recipes, newRecipe]);
      toast({
        title: "Receta Creada",
        description: `${data.name} ha sido agregada exitosamente.`,
      });
    }
    setIsFormOpen(false);
    setEditingRecipe(undefined);
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
      const recipe = recipes.find((r) => r.id === recipeToDelete);
      const result = await recipesApi.delete(recipeToDelete);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setRecipeToDelete(null);
        return;
      }
      setRecipes(recipes.filter((r) => r.id !== recipeToDelete));
      setDeleteDialogOpen(false);
      setRecipeToDelete(null);
      toast({
        title: "Receta Eliminada",
        description: `${recipe?.name} ha sido eliminada.`,
      });
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
