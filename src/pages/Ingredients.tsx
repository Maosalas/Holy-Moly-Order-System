import { useState, useEffect } from "react";
import { Ingredient, IngredientFormData } from "@/types/ingredient";
import { IngredientForm } from "@/components/IngredientForm";
import { IngredientList } from "@/components/IngredientList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ingredientsApi } from "@/lib/api";

const Ingredients = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

   useEffect(() => {
    const fetchIngredients = async () => {
      const result = await ingredientsApi.getAll();
      if (result.data) {
        const ingredientsData = Array.isArray(result.data) ? result.data : [];
        setIngredients(ingredientsData.map((i: any) => ({
          ...i,
          createdAt: new Date(i.created_at),
          updatedAt: new Date(i.updated_at)
        })));
      }
      setIsLoading(false);
    };
    fetchIngredients();
  }, []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<string | null>(null);

  const handleSubmit = async (data: IngredientFormData) => {
    if (editingIngredient) {
      const result = await ingredientsApi.update(editingIngredient.id, data);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        return;
      }
      setIngredients(
        ingredients.map((i) =>
          i.id === editingIngredient.id
            ? { ...data, id: i.id, createdAt: i.createdAt, updatedAt: new Date() }
            : i
        )
      );
        toast({
          title: "Ingrediente Actualizado",
          description: `${data.name} ha sido actualizado exitosamente.`,
        });
  } else {
      const result = await ingredientsApi.create(data);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        return;
      }
      const ingredientData = (result.data as any).ingredient || result.data;
      const newIngredient: Ingredient = {
        ...data,
        id: ingredientData.id,
        createdAt: new Date(ingredientData.created_at),
        updatedAt: new Date(ingredientData.updated_at),
      };
      setIngredients([...ingredients, newIngredient]);
      toast({
        title: "Ingrediente Creado",
        description: `${data.name} ha sido agregado exitosamente.`,
      });
    }
    setIsFormOpen(false);
    setEditingIngredient(undefined);
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
      setIsDeleting(true);
      const ingredient = ingredients.find((i) => i.id === ingredientToDelete);
      const result = await ingredientsApi.delete(ingredientToDelete);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setIngredientToDelete(null);
        setIsDeleting(false);
        return;
      }
      setIngredients(ingredients.filter((i) => i.id !== ingredientToDelete));
      setDeleteDialogOpen(false);
      setIngredientToDelete(null);
      setIsDeleting(false);
      toast({
        title: "Ingrediente Eliminado",
        description: `${ingredient?.name} ha sido eliminado.`,
      });
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
          <Button
            onClick={() => setIsFormOpen(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Nuevo Ingrediente
          </Button>
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
          isDeleting={isDeleting}
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
