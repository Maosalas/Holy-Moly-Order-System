import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { recipesApi, quotationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Quotation, QuotationRecipe } from "@/types/quotation";
import type { Recipe } from "@/types/recipe";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface QuotationFormProps {
  quotation?: Quotation;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function QuotationForm({ quotation, onSubmit, onCancel }: QuotationFormProps) {
  const [clientName, setClientName] = useState(quotation?.clientName || "");
  const [size, setSize] = useState<'pequeño' | 'mediano' | 'grande'>(quotation?.size || 'pequeño');
  const [notes, setNotes] = useState(quotation?.notes || "");
  const [selectedRecipes, setSelectedRecipes] = useState<QuotationRecipe[]>(quotation?.recipes || []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeMultipliers, setRecipeMultipliers] = useState<Record<string, Array<{size: string, multiplier: number}>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    const { data, error } = await recipesApi.getAll();
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las recetas",
        variant: "destructive",
      });
    } else {
      const loadedRecipes = (data as Recipe[]) || [];
      setRecipes(loadedRecipes);
      
      // Load multipliers for relleno and cubierta recipes
      const multipliersToLoad = loadedRecipes.filter(r => 
        r.name.toLowerCase().includes('relleno') || r.name.toLowerCase().includes('cubierta')
      );
      
      const multiplierPromises = multipliersToLoad.map(async (recipe) => {
        const isRelleno = recipe.name.toLowerCase().includes('relleno');
        const result = isRelleno 
          ? await quotationsApi.getFillingMultipliers(recipe.id)
          : await quotationsApi.getCoveringMultipliers(recipe.id);
        
        if (result.data && Array.isArray(result.data)) {
          return { recipeId: recipe.id, multipliers: result.data };
        }
        return null;
      });
      
      const results = await Promise.all(multiplierPromises);
      const newRecipeMultipliers: Record<string, Array<{size: string, multiplier: number}>> = {};
      results.forEach(result => {
        if (result) {
          newRecipeMultipliers[result.recipeId] = result.multipliers;
        }
      });
      setRecipeMultipliers(newRecipeMultipliers);
    }
  };

  const addRecipe = (recipeId: string, recipeType: 'queque' | 'relleno' | 'cubierta' | 'unidad') => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    let quantity = 1;
    const multipliers = recipeMultipliers[recipeId];
    if (multipliers && Array.isArray(multipliers)) {
      const sizeMultiplier = multipliers.find(m => m.size === size);
      if (sizeMultiplier) {
        quantity = sizeMultiplier.multiplier;
      }
    }

    const newRecipe: QuotationRecipe = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeType,
      unitCost: recipe.totalCost,
      quantity,
      totalCost: recipe.totalCost * quantity,
    };

    setSelectedRecipes([...selectedRecipes, newRecipe]);
  };

  const removeRecipe = (index: number) => {
    setSelectedRecipes(selectedRecipes.filter((_, i) => i !== index));
  };

  const updateRecipeQuantity = (index: number, quantity: number) => {
    const updated = [...selectedRecipes];
    updated[index].quantity = quantity;
    updated[index].totalCost = updated[index].unitCost * quantity;
    setSelectedRecipes(updated);
  };

  const calculateTotal = () => {
    return selectedRecipes.reduce((sum, r) => sum + r.totalCost, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const quotationData = {
      clientName,
      size,
      recipes: selectedRecipes,
      totalCost: calculateTotal(),
      notes,
    };

    await onSubmit(quotationData);
    setIsLoading(false);
  };

  const recipesByType = {
    queque: recipes.filter(r => r.name.toLowerCase().includes('queque')),
    relleno: recipes.filter(r => r.name.toLowerCase().includes('relleno')),
    cubierta: recipes.filter(r => r.name.toLowerCase().includes('cubierta')),
    unidad: recipes.filter(r => !r.name.toLowerCase().includes('queque') && 
                                 !r.name.toLowerCase().includes('relleno') && 
                                 !r.name.toLowerCase().includes('cubierta')),
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clientName">Nombre del Cliente</Label>
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="size">Tamaño</Label>
          <Select value={size} onValueChange={(value: any) => setSize(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pequeño">Pequeño</SelectItem>
              <SelectItem value="mediano">Mediano</SelectItem>
              <SelectItem value="grande">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Recetas Seleccionadas</Label>
        
        {['queque', 'relleno', 'cubierta', 'unidad'].map((type) => (
          <Card key={type}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold capitalize">{type}</h4>
                <Select onValueChange={(value) => addRecipe(value, type as any)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={`Agregar ${type}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {recipesByType[type as keyof typeof recipesByType].map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name} (₡{recipe.totalCost})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRecipes
                .filter(r => r.recipeType === type)
                .map((recipe, index) => {
                  const actualIndex = selectedRecipes.findIndex(r => r === recipe);
                  return (
                    <div key={actualIndex} className="flex items-center gap-3 mb-2 p-2 bg-muted rounded">
                      <span className="flex-1">{recipe.recipeName}</span>
                      <Input
                        type="number"
                        min="1"
                        step="0.5"
                        value={recipe.quantity}
                        onChange={(e) => updateRecipeQuantity(actualIndex, parseFloat(e.target.value))}
                        className="w-20"
                      />
                      <span className="w-24 text-right">₡{recipe.totalCost.toFixed(2)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecipe(actualIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <span className="text-lg font-semibold">Costo Total:</span>
        <span className="text-2xl font-bold">₡{calculateTotal().toFixed(2)}</span>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || selectedRecipes.length === 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {quotation ? "Actualizar" : "Crear"} Cotización
        </Button>
      </div>
    </form>
  );
}
