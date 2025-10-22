import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { recipesApi, quotationsApi, suppliesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Quotation, QuotationRecipe, QuotationSupply, QuotationAdditionalExpense } from "@/types/quotation";
import type { Recipe } from "@/types/recipe";
import type { Supply } from "@/types/supply";
import { Loader2, Plus, Trash2, Ruler, Check, ChevronsUpDown, Package } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface QuotationFormProps {
  quotation?: Quotation;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function QuotationForm({ quotation, onSubmit, onCancel }: QuotationFormProps) {
  const [clientName, setClientName] = useState(quotation?.clientName || "");
  const [size, setSize] = useState<'mini' | 'pequeño' | 'mediano' | 'grande'>(quotation?.size || 'pequeño');
  const [notes, setNotes] = useState(quotation?.notes || "");
  const [selectedRecipes, setSelectedRecipes] = useState<QuotationRecipe[]>(quotation?.recipes || []);
  const [selectedSupplies, setSelectedSupplies] = useState<QuotationSupply[]>(quotation?.selectedSupplies || []);
  const [additionalExpenses, setAdditionalExpenses] = useState<QuotationAdditionalExpense[]>(quotation?.additionalExpenses || []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [recipeMultipliers, setRecipeMultipliers] = useState<Record<string, Array<{ size: string, multiplier: number }>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const previousSizeRef = useRef(size);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    loadRecipes();
    loadSupplies();
  }, []);

  // Recalculate recipe quantities when size changes
  useEffect(() => {
    // Skip if we're in the middle of updating or size hasn't changed
    if (isUpdatingRef.current || previousSizeRef.current === size) return;
    if (selectedRecipes.length === 0) return;

    isUpdatingRef.current = true;
    previousSizeRef.current = size;

    const updatedRecipes = selectedRecipes.map(recipe => {
      const multipliers = recipeMultipliers[recipe.recipeId];

      // Only update if this recipe has multipliers (relleno, cubierta, queque)
      if (multipliers && Array.isArray(multipliers)) {
        const sizeMultiplier = multipliers.find(m => m.size === size);
        if (sizeMultiplier) {
          const newQuantity = sizeMultiplier.multiplier;
          return {
            ...recipe,
            quantity: newQuantity,
            totalCost: recipe.unitCost * newQuantity,
          };
        }
      }

      return recipe;
    });

    setSelectedRecipes(updatedRecipes);
    isUpdatingRef.current = false;
  }, [size, recipeMultipliers, selectedRecipes]);

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

      // Load multipliers for queque, relleno and cubierta recipes
      const multipliersToLoad = loadedRecipes.filter(r =>
        r.category === 'queque' || r.category === 'relleno' || r.category === 'cubierta'
      );

      const multiplierPromises = multipliersToLoad.map(async (recipe) => {
        let result;
        
        if (recipe.category === 'queque') {
          result = await quotationsApi.getCakeMultipliers(recipe.id);
        } else if (recipe.category === 'relleno') {
          result = await quotationsApi.getFillingMultipliers(recipe.id);
        } else if (recipe.category === 'cubierta') {
          result = await quotationsApi.getCoveringMultipliers(recipe.id);
        }

        if (result && result.data && Array.isArray(result.data)) {
          return { recipeId: recipe.id, multipliers: result.data };
        }
        return null;
      });

      const results = await Promise.all(multiplierPromises);
      const newRecipeMultipliers: Record<string, Array<{ size: string, multiplier: number }>> = {};
      results.forEach(result => {
        if (result) {
          newRecipeMultipliers[result.recipeId] = result.multipliers;
        }
      });
      setRecipeMultipliers(newRecipeMultipliers);
    }
  };

  const loadSupplies = async () => {
    const result = await suppliesApi.getAll();
    if (result.data) {
      const suppliesData = Array.isArray(result.data) ? result.data : [];
      setSupplies(suppliesData.map((s: any) => ({
        ...s,
        createdAt: s.created_at
      })));
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

    const unitCost = recipeType === 'unidad' ? (recipe.unitCost || recipe.totalCost) : recipe.totalCost;
    
    const newRecipe: QuotationRecipe = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeType,
      unitCost: unitCost,
      quantity,
      totalCost: unitCost * quantity,
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

  const addSupply = (supplyId: string) => {
    const supply = supplies.find(s => s.id === supplyId);
    if (!supply) return;

    const alreadyAdded = selectedSupplies.find(s => s.supplyId === supplyId);
    if (alreadyAdded) {
      toast({
        title: "Suministro ya fue agregado",
        description: `${supply.name} ya esta en la lista de suministros seleccionados.`,
        variant: "destructive",
      });
      return;
    }

    const newSupply: QuotationSupply = {
      supplyId: supply.id,
      supplyName: supply.name,
      quantity: 1,
      unit: supply.unit,
      costPerUnit: supply.cost,
      totalCost: supply.cost,
    };

    setSelectedSupplies([...selectedSupplies, newSupply]);
  };

  const updateSupplyQuantity = (supplyId: string, quantity: number) => {
    setSelectedSupplies(prev =>
      prev.map(s =>
        s.supplyId === supplyId
          ? { ...s, quantity, totalCost: s.costPerUnit * quantity }
          : s
      )
    );
  };

  const removeSupply = (supplyId: string) => {
    setSelectedSupplies(prev => prev.filter(s => s.supplyId !== supplyId));
  };

  const addAdditionalExpense = () => {
    const newExpense: QuotationAdditionalExpense = {
      expenseName: "",
      unitPrice: 0,
      quantity: 1,
      totalPrice: 0,
    };
    setAdditionalExpenses([...additionalExpenses, newExpense]);
  };

  const updateAdditionalExpense = (index: number, field: keyof QuotationAdditionalExpense, value: string | number) => {
    const updated = [...additionalExpenses];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'unitPrice' || field === 'quantity') {
      updated[index].totalPrice = updated[index].unitPrice * updated[index].quantity;
    }

    setAdditionalExpenses(updated);
  };

  const removeAdditionalExpense = (index: number) => {
    setAdditionalExpenses(additionalExpenses.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const recipesTotal = selectedRecipes.reduce((sum, r) => sum + r.totalCost, 0);
    const suppliesTotal = selectedSupplies.reduce((sum, s) => sum + s.totalCost, 0);
    const expensesTotal = additionalExpenses.reduce((sum, e) => sum + e.totalPrice, 0);
    return recipesTotal + suppliesTotal + expensesTotal;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const quotationData = {
      clientName,
      size,
      recipes: selectedRecipes,
      selectedSupplies,
      additionalExpenses: additionalExpenses.length > 0 ? additionalExpenses : undefined,
      totalCost: calculateTotal(),
      notes,
    };
    console.log('Submitting quotation data:', quotationData);
    await onSubmit(quotationData);
    setIsLoading(false);
  };

  const recipesByType = {
    queque: recipes.filter(r => r.category === 'queque'),
    relleno: recipes.filter(r => r.category === 'relleno'),
    cubierta: recipes.filter(r => r.category === 'cubierta'),
    unidad: recipes.filter(r => r.category === 'unidad'),
  };

  return (
    <Card>
      <CardHeader></CardHeader>
      <CardContent>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      {size === "pequeño" ? "Pequeño" : size === "mediano" ? "Mediano" : "Grande"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search size..." />
                    <CommandList>
                      <CommandEmpty>No size found.</CommandEmpty>
                      <CommandGroup>
                        {[
                          { value: "mini", label: "Mini" },
                          { value: "pequeño", label: "Pequeño" },
                          { value: "mediano", label: "Mediano" },
                          { value: "grande", label: "Grande" },
                        ].map((s) => (
                          <CommandItem
                            key={s.value}
                            value={s.value}
                            onSelect={() => setSize(s.value as any)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                size === s.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {s.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Recetas Seleccionadas</Label>

            {['queque', 'relleno', 'cubierta', 'unidad'].map((type) => (
              <Card key={type}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold capitalize">{type}</h4>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-[200px] justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar {type}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder={`Search ${type}...`} />
                          <CommandList>
                            <CommandEmpty>No recipe found.</CommandEmpty>
                            <CommandGroup>
                              {recipesByType[type as keyof typeof recipesByType].map((recipe) => (
                                <CommandItem
                                  key={recipe.id}
                                  value={recipe.name}
                                  onSelect={() => addRecipe(recipe.id, type as any)}
                                >
                                  {recipe.name} (₡{type === 'unidad' ? (recipe.unitCost || recipe.totalCost).toFixed(2) : recipe.totalCost.toFixed(2)})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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

          {/* Supplies Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Suministros</Label>
                <p className="text-sm text-muted-foreground mt-1">Seleccione múltiples suministros necesarios</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="flex-1 h-11 bg-background border-2 hover:border-primary/50 transition-colors justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Escoja un suministro a agregar...
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search supplies..." />
                    <CommandList>
                      <CommandEmpty>
                        {supplies.length === 0
                          ? "No supplies available. Add supplies in the Supplies page first."
                          : "No supply found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {supplies.map((supply) => (
                          <CommandItem
                            key={supply.id}
                            value={supply.name}
                            onSelect={() => addSupply(supply.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="font-medium">{supply.name}</span>
                              <span className="text-muted-foreground text-sm">
                                ₡{supply.cost.toFixed(2)} / {supply.unit}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedSupplies.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Suministro</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Costo por Unidad</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSupplies.map((supply) => (
                        <TableRow key={supply.supplyId}>
                          <TableCell className="font-medium">
                            {supply.supplyName}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={supply.quantity}
                              onChange={(e) =>
                                updateSupplyQuantity(supply.supplyId, parseFloat(e.target.value) || 0)
                              }
                              className="w-24 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            ₡{supply.costPerUnit.toFixed(2)} / {supply.unit}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₡{supply.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSupply(supply.supplyId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Additional Expenses Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Otros Gastos (Opcional)</Label>
                <p className="text-sm text-muted-foreground mt-1">Agregue gastos adicionales como entrega, montaje, etc.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAdditionalExpense}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Gasto
              </Button>
            </div>

            {additionalExpenses.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre del Gasto</TableHead>
                        <TableHead className="text-center">Precio Unitario</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Precio Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {additionalExpenses.map((expense, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Ej: Entrega a domicilio"
                              value={expense.expenseName}
                              onChange={(e) => updateAdditionalExpense(index, 'expenseName', e.target.value)}
                              className="min-w-[200px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={expense.unitPrice}
                              onChange={(e) => updateAdditionalExpense(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-32 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={expense.quantity}
                              onChange={(e) => updateAdditionalExpense(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-24 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₡{expense.totalPrice.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAdditionalExpense(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
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
      </CardContent>
    </Card>
  );
}
