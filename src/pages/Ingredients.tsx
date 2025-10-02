import { useState, useEffect } from "react";
import { Ingredient, IngredientFormData } from "@/types/ingredient";
import { IngredientForm } from "@/components/IngredientForm";
import { IngredientList } from "@/components/IngredientList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "holy-moly-ingredients";

const Ingredients = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ingredients));
  }, [ingredients]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<string | null>(null);

  const handleSubmit = (data: IngredientFormData) => {
    if (editingIngredient) {
      setIngredients(
        ingredients.map((i) =>
          i.id === editingIngredient.id
            ? { ...data, id: i.id, createdAt: i.createdAt, updatedAt: new Date() }
            : i
        )
      );
      toast({
        title: "Ingredient Updated",
        description: `${data.name} has been successfully updated.`,
      });
    } else {
      const newIngredient: Ingredient = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setIngredients([...ingredients, newIngredient]);
      toast({
        title: "Ingredient Created",
        description: `${data.name} has been successfully added.`,
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

  const handleDeleteConfirm = () => {
    if (ingredientToDelete) {
      const ingredient = ingredients.find((i) => i.id === ingredientToDelete);
      setIngredients(ingredients.filter((i) => i.id !== ingredientToDelete));
      toast({
        title: "Ingredient Deleted",
        description: `${ingredient?.name} has been removed.`,
      });
    }
    setDeleteDialogOpen(false);
    setIngredientToDelete(null);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingIngredient(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Ingredients</h2>
          <p className="text-muted-foreground mt-1">Manage your ingredient inventory</p>
        </div>
        {!isFormOpen && (
          <Button
            onClick={() => setIsFormOpen(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            New Ingredient
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
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Ingredient"
        description={`Are you sure you want to delete "${ingredients.find((i) => i.id === ingredientToDelete)?.name || ""}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Ingredients;
