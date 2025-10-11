import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Upload, ImageIcon } from "lucide-react";
import { Recipe, RecipeIngredient, RecipeFormData, Category } from "@/types/recipe";
import { Ingredient } from "@/types/ingredient";
import { toast } from "@/hooks/use-toast";
import { ingredientsApi } from "@/lib/api";
import { Textarea } from "./ui/textarea";

interface RecipeFormProps {
  recipe?: Recipe;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
}

export const RecipeForm = ({ recipe, onSubmit, onCancel }: RecipeFormProps) => {
  const [name, setName] = useState(recipe?.name || "");
  const [category, setCategory] = useState(recipe?.category || "queque");
  const [notes, setNotes] = useState(recipe?.notes || "");
  const [image, setImage] = useState(recipe?.image || "");
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients || []
  );
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchIngredients = async () => {
      const result = await ingredientsApi.getAll();
      if (result.data) {
        const ingredientsData = Array.isArray(result.data) ? result.data : [];
        setAvailableIngredients(ingredientsData.map((i: any) => ({
          ...i,
          createdAt: new Date(i.created_at),
          updatedAt: new Date(i.updated_at)
        })));
      }
    };
    fetchIngredients();
  }, []);

  const calculateTotalCost = (ingredients: RecipeIngredient[]) => {
    return ingredients.reduce((sum, ing) => sum + ing.cost, 0);
  };

  const addIngredient = () => {
    if (availableIngredients.length === 0) {
      toast({
        title: "No hay ingredientes disponibles",
        description: "Por favor ingrese ingredientes antes de agregar a la receta.",
        variant: "destructive",
      });
      return;
    }
    setRecipeIngredients([
      ...recipeIngredients,
      {
        id: getUUID(),
        ingredientId: "",
        ingredientName: "",
        quantity: 0,
        units: "",
        cost: 0,
      },
    ]);
  };

  const removeIngredient = (id: string) => {
    setRecipeIngredients(recipeIngredients.filter((ing) => ing.id !== id));
  };

  const updateIngredientSelection = (id: string, ingredientId: string) => {
    const selectedIngredient = availableIngredients.find((i) => i.id === ingredientId);
    if (!selectedIngredient) return;

    setRecipeIngredients(
      recipeIngredients.map((ing) =>
        ing.id === id
          ? {
            ...ing,
            ingredientId: selectedIngredient.id,
            ingredientName: selectedIngredient.name,
            units: selectedIngredient.units,
            cost: 0, // Will be calculated when quantity is set
          }
          : ing
      )
    );
  };

  const updateIngredientQuantity = (id: string, quantity: number) => {
    setRecipeIngredients(
      recipeIngredients.map((ing) => {
        if (ing.id === id) {
          const baseIngredient = availableIngredients.find((i) => i.id === ing.ingredientId);
          if (!baseIngredient) return ing;

          // Calculate cost: (quantity / qtyProvider) * cost
          const cost = (quantity / baseIngredient.qtyProvider) * baseIngredient.cost;

          return { ...ing, quantity, cost };
        }
        return ing;
      })
    );
  };

  const compressImage = (base64: string, callback: (compressed: string) => void) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Max dimensions
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      // Compress to JPEG with 0.7 quality (70%)
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      console.log('Image compressed from', base64.length, 'to', compressed.length, 'characters');
      callback(compressed);
    };
    img.src = base64;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress the image before setting it
        compressImage(reader.result as string, (compressed) => {
          setImage(compressed);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Recipe name is required",
        variant: "destructive",
      });
      return;
    }

    if (recipeIngredients.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one ingredient is required",
        variant: "destructive",
      });
      return;
    }

    const hasInvalidIngredients = recipeIngredients.some(
      (ing) => !ing.ingredientId || ing.quantity <= 0
    );

    if (hasInvalidIngredients) {
      toast({
        title: "Validation Error",
        description: "All ingredients must have a selection and quantity",
        variant: "destructive",
      });
      return;
    }

    const totalCost = calculateTotalCost(recipeIngredients);

    try {
      await onSubmit({
        name: name.trim(),
        image: image || undefined,
        ingredients: recipeIngredients,
        totalCost,
        category: category,
        notes: notes,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = calculateTotalCost(recipeIngredients);

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">
          {recipe ? "Edit Recipe" : "Add New Recipe"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Recipe Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter recipe name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="queque">Queque</SelectItem>
                <SelectItem value="relleno">Relleno</SelectItem>
                <SelectItem value="cubierta">Cubierta</SelectItem>
                <SelectItem value="unidad">Unidad</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ingrese notas adicionales sobre la receta"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Recipe Image</Label>
            {image ? (
              <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                <img
                  src={image}
                  alt="Recipe preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-32 border-dashed relative"
                asChild
              >
                <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ingredients *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredient}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Ingredient</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>

            <div className="space-y-3">
              {recipeIngredients.map((ingredient) => (
                <div key={ingredient.id} className="flex flex-col sm:flex-row gap-2 items-start p-3 border rounded-lg">
                  <div className="w-full sm:flex-1">
                    <Select
                      value={ingredient.ingredientId}
                      onValueChange={(value) =>
                        updateIngredientSelection(ingredient.id, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ingredient" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIngredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name} ({ing.units})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:w-28">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ingredient.quantity || ""}
                        onChange={(e) =>
                          updateIngredientQuantity(
                            ingredient.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="Qty"
                        required
                        disabled={!ingredient.ingredientId}
                      />
                    </div>
                    <div className="flex-1 sm:w-24">
                      <Input
                        value={ingredient.units}
                        placeholder="Unit"
                        disabled
                      />
                    </div>
                    <div className="flex-1 sm:w-28">
                      <Input
                        value={ingredient.cost.toFixed(2)}
                        placeholder="Cost"
                        disabled
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removeIngredient(ingredient.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Total Cost:</Label>
              <span className="text-2xl font-bold text-primary">
                ₡{totalCost.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : (recipe ? "Update Recipe" : "Create Recipe")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

function getUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: generate a simple UUID (not cryptographically secure)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}