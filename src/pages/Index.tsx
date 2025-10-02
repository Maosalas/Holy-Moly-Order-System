import { useState, useEffect } from "react";
import { Recipe, RecipeFormData } from "@/types/recipe";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipeList } from "@/components/RecipeList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "holy-moly-recipes";

const Index = () => {
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored).map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt)
    })) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }, [recipes]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  const handleSubmit = (data: RecipeFormData) => {
    if (editingRecipe) {
      setRecipes(
        recipes.map((r) =>
          r.id === editingRecipe.id
            ? { ...data, id: r.id, createdAt: r.createdAt, updatedAt: new Date() }
            : r
        )
      );
      toast({
        title: "Recipe Updated",
        description: `${data.name} has been successfully updated.`,
      });
    } else {
      const newRecipe: Recipe = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setRecipes([...recipes, newRecipe]);
      toast({
        title: "Recipe Created",
        description: `${data.name} has been successfully added.`,
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

  const handleDeleteConfirm = () => {
    if (recipeToDelete) {
      const recipe = recipes.find((r) => r.id === recipeToDelete);
      setRecipes(recipes.filter((r) => r.id !== recipeToDelete));
      toast({
        title: "Recipe Deleted",
        description: `${recipe?.name} has been removed.`,
      });
    }
    setDeleteDialogOpen(false);
    setRecipeToDelete(null);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingRecipe(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Recipes</h2>
          <p className="text-muted-foreground mt-1">Manage your recipe database</p>
        </div>
        {!isFormOpen && (
          <Button
            onClick={() => setIsFormOpen(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            New Recipe
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
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        recipeName={
          recipes.find((r) => r.id === recipeToDelete)?.name || ""
        }
      />
    </div>
  );
};

export default Index;
