import { useState, useMemo } from "react";
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

  // Transformar datos del API con useMemo para estabilizar referencias
  const recipes: Recipe[] = useMemo(() => {
    return recipesData.map((r: any) => ({
      ...r,
      categories: r.categories || (r.category ? [r.category] : ["unidad"]),
      usedParameters: r.used_parameters || r.usedParameters || [],
      createdAt: new Date(r.created_at || r.createdAt),
      updatedAt: new Date(r.updated_at || r.updatedAt),
      // Mapear elaboraciones y sus ingredientes
      elaborations: (r.elaborations || []).map((elab: any) => ({
        id: elab.id,
        name: elab.name,
        order: elab.order,
        cost: elab.cost || 0,
        variationId: elab.variation_id || elab.variationId || null,
        // Mapear ingredientes dentro de la elaboración
        ingredients: (elab.ingredients || []).map((ing: any) => ({
          id: ing.id,
          ingredientId: ing.ingredient_id || ing.ingredientId,
          ingredientName: ing.ingredient_name || ing.ingredientName || ing.name,
          quantity: ing.quantity || 0,
          units: ing.units || ing.unit || '',
          cost: ing.cost || 0
        }))
      })),
      // Mapear variaciones si existen
      variations: (r.variations || []).map((v: any) => ({
        ...v,
        createdAt: v.created_at ? new Date(v.created_at) : new Date(),
        updatedAt: v.updated_at ? new Date(v.updated_at) : new Date(),
        variationId: v.variation_id || v.variationId,
        baseElaborationIds: v.base_elaboration_ids || v.baseElaborationIds || [],
        usedParameters: v.used_parameters || v.usedParameters || [],
        totalCost: v.total_cost || v.totalCost,
        unitCost: v.unit_cost || v.unitCost,
        orderNumber: v.order_number || v.orderNumber || 0,
        isDefault: v.is_default !== undefined ? v.is_default : v.isDefault,
        // Mapear elaboraciones de la variación
        elaborations: (v.elaborations || []).map((elab: any) => ({
          id: elab.id,
          name: elab.name,
          order: elab.order,
          cost: elab.cost || 0,
          variationId: elab.variation_id || elab.variationId || null,
          ingredients: (elab.ingredients || []).map((ing: any) => ({
            id: ing.id,
            ingredientId: ing.ingredient_id || ing.ingredientId,
            ingredientName: ing.ingredient_name || ing.ingredientName || ing.name,
            quantity: ing.quantity || 0,
            units: ing.units || ing.unit || '',
            cost: ing.cost || 0
          }))
        }))
      }))
    }));
  }, [recipesData]);
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
