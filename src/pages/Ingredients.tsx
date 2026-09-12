import { useState } from "react";
import { Ingredient, IngredientFormData } from "@/types/ingredient";
import { IngredientForm } from "@/components/IngredientForm";
import { IngredientList } from "@/components/IngredientList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { useIngredients, useCreateIngredient, useUpdateIngredient, useDeleteIngredient } from "@/hooks/use-ingredients";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { ingredientsApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { ingredientKeys } from "@/hooks/use-ingredients";

const Ingredients = () => {
  // Usar React Query hooks
  const { data: ingredientsData = [], isLoading } = useIngredients();
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();

  // Transformar datos del API
  const ingredients: Ingredient[] = ingredientsData.map((i: any) => ({
    ...i,
    createdAt: new Date(i.created_at || i.createdAt),
    updatedAt: new Date(i.updated_at || i.updatedAt)
  }));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const queryClient = useQueryClient();
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<string | null>(null);

  const handleSubmit = async (data: IngredientFormData) => {
    try {
      if (editingIngredient) {
        await updateIngredient.mutateAsync({ id: editingIngredient.id, ingredient: data });
      } else {
        await createIngredient.mutateAsync(data);
      }
      setIsFormOpen(false);
      setEditingIngredient(undefined);
    } catch (error) {
      // Los errores ya son manejados por los hooks
      console.error("Error submitting ingredient:", error);
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setIngredientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (ingredientToDelete) {
      try {
        await deleteIngredient.mutateAsync(ingredientToDelete);
        setDeleteDialogOpen(false);
        setIngredientToDelete(null);
      } catch (error) {
        // Los errores ya son manejados por los hooks
        console.error("Error deleting ingredient:", error);
        setDeleteDialogOpen(false);
        setIngredientToDelete(null);
      }
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingIngredient(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Ingredientes</h2>
          <p className="text-muted-foreground mt-1">Administra tu inventario de ingredientes</p>
        </div>
        {!isFormOpen && (
          <div className="flex gap-2">
            <Button
              onClick={() => setIsImportOpen(true)}
              size="lg"
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-5 w-5" />
              Importar CSV
            </Button>
            <Button
              onClick={() => setIsFormOpen(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Nuevo Ingrediente
            </Button>
          </div>
        )}
      </div>

      {isFormOpen ? (
        <IngredientForm
          ingredient={editingIngredient}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <IngredientList
          ingredients={ingredients}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          isDeleting={deleteIngredient.isPending}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Ingrediente"
        description={`¿Estás seguro de que deseas eliminar "${ingredients.find((i) => i.id === ingredientToDelete)?.name || ""}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};

export default Ingredients;
