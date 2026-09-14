import { useState, useMemo } from "react";
import { Recipe } from "@/types/recipe";
import { RecipeList } from "@/components/RecipeList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useRecipes, useDeleteRecipe } from "@/hooks/use-recipes";

/**
 * Pantalla heredada de recetas: SOLO LECTURA.
 * Las recetas nuevas se crean en Elaboraciones y Productos.
 * Aquí no se crea ni se edita nada para no escribir en las columnas jsonb antiguas.
 */
const Index = () => {
  const { data: recipesData = [] } = useRecipes();
  const deleteRecipe = useDeleteRecipe();

  const recipes: Recipe[] = useMemo(() => {
    return recipesData.map((r: any) => ({
      ...r,
      categories: r.categories || (r.category ? [r.category] : ["unidad"]),
      usedParameters: r.used_parameters || r.usedParameters || [],
      createdAt: new Date(r.created_at || r.createdAt),
      updatedAt: new Date(r.updated_at || r.updatedAt),
      elaborations: (r.elaborations || []).map((elab: any) => ({
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
          units: ing.units || ing.unit || "",
          cost: ing.cost || 0,
        })),
      })),
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
            units: ing.units || ing.unit || "",
            cost: ing.cost || 0,
          })),
        })),
      })),
    }));
  }, [recipesData]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setRecipeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recipeToDelete) return;
    try {
      await deleteRecipe.mutateAsync(recipeToDelete);
    } catch (error) {
      console.error("Error deleting recipe:", error);
    }
    setDeleteDialogOpen(false);
    setRecipeToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Recetas (archivo)</h2>
        <p className="text-muted-foreground mt-1">
          Registro histórico de solo lectura
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Esta pantalla ya no recibe datos nuevos</AlertTitle>
        <AlertDescription>
          Las recetas ahora se crean en <strong>Elaboraciones</strong> (masas,
          rellenos, cubiertas) y en <strong>Productos</strong> (lo que se vende,
          con sus tamaños y variantes). Acá solo podés consultar o eliminar lo
          antiguo.
        </AlertDescription>
      </Alert>

      <RecipeList
        recipes={recipes}
        onDelete={handleDeleteClick}
        isDeleting={deleteRecipe.isPending}
      />

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
