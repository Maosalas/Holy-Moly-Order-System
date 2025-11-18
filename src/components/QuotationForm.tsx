import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { recipesApi, quotationsApi, suppliesApi, recipeTypesApi, ingredientsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Quotation, QuotationRecipe, QuotationSupply, QuotationAdditionalExpense, RecipeType, QuotationIngredient } from "@/types/quotation";
import type { Recipe } from "@/types/recipe";
import type { Supply } from "@/types/supply";
import { Loader2, Plus, Trash2, Check, ChevronsUpDown, Package, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Ingredient } from "@/types/ingredient";
import { set } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRecipeParameters } from "@/hooks/use-recipe-parameters";
import { findRecipesByParameter, calculateRequiredAmount, calculateComplementaryCost, getUsedParameters } from "@/lib/quotationHelpers";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuotationFormProps {
  quotation?: Quotation;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function QuotationForm({ quotation, onSubmit, onCancel }: QuotationFormProps) {
  const { currentOrganization } = useOrganization();
  const { data: recipeParameters = [] } = useRecipeParameters();
  const [clientName, setClientName] = useState(quotation?.clientName || "");
  const [notes, setNotes] = useState(quotation?.notes || "");
  const [sellingPrice, setSellingPrice] = useState<number>(quotation?.sellingPrice || 0);

  const [selectedRecipes, setSelectedRecipes] = useState<QuotationRecipe[]>(quotation?.recipes || []);
  const [selectedSupplies, setSelectedSupplies] = useState<QuotationSupply[]>(quotation?.selectedSupplies || []);
  const [additionalExpenses, setAdditionalExpenses] = useState<QuotationAdditionalExpense[]>(quotation?.additionalExpenses || []);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<QuotationIngredient[]>(quotation?.additionalIngredients || []);

  const [recipeTypes, setRecipeTypes] = useState<RecipeType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // State for variation selection
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [selectedRecipeForVariation, setSelectedRecipeForVariation] = useState<{ recipeId: string, recipeTypeName: string } | null>(null);

  // State for complementary recipes suggestions
  const [showComplementaryDialog, setShowComplementaryDialog] = useState(false);
  const [complementarySuggestions, setComplementarySuggestions] = useState<{
    mainRecipeId: string;
    mainRecipeName: string;
    variationId?: string;
    variationName?: string;
    units: number;
    parameterKey: string;
    suggestions: Recipe[];
    availableParameters?: Array<{
      parameterKey: string;
      units: number;
      mainRecipeId: string;
      mainRecipeName: string;
      variationId?: string;
    }>;
  } | null>(null);

  // Update form fields when quotation prop changes
  useEffect(() => {
    if (quotation) {
      setClientName(quotation.clientName || "");
      setNotes(quotation.notes || "");
      setSelectedRecipes(quotation.recipes || []);
      setSelectedSupplies(quotation.selectedSupplies || []);
      setAdditionalExpenses(quotation.additionalExpenses || []);
      setSelectedIngredients(quotation.additionalIngredients || []);
      setSellingPrice(quotation.sellingPrice || 0);
    } else {
      // Reset form when creating new quotation
      setClientName("");
      setNotes("");
      setSelectedRecipes([]);
      setSelectedSupplies([]);
      setAdditionalExpenses([]);
      setSelectedIngredients([]);
      setSellingPrice(0);
    }
  }, [quotation]);

  useEffect(() => {
    loadRecipeTypes();
    loadRecipes();
    loadSupplies();
    loadIngredients();
  }, []);

  const loadRecipeTypes = async () => {
    const result = await recipeTypesApi.getAll();
    if (result.data) {
      const recipeTypesData = Array.isArray(result.data) ? result.data : [];
      setRecipeTypes(recipeTypesData);
    }
  };

  const loadRecipes = async () => {
    const { data, error } = await recipesApi.getAll();
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las recetas",
        variant: "destructive",
      });
    } else {
      const recipesData = (data as any[]) || [];
      const loadedRecipes: Recipe[] = recipesData.map((r: any) => ({
        ...r,
        categories: r.categories || (r.category ? [r.category] : ["unidad"]),
        usedParameters: r.used_parameters || r.usedParameters || [],
        createdAt: new Date(r.created_at || r.createdAt),
        updatedAt: new Date(r.updated_at || r.updatedAt)
      }));
      setRecipes(loadedRecipes);
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

  const loadIngredients = async () => {
    // Implement if needed
    const result = await ingredientsApi.getAll();
    if (result.data) {
      const ingredientsData = Array.isArray(result.data) ? result.data : [];
      setIngredients(ingredientsData.map((i: any) => ({
        ...i,
        createdAt: i.created_at
      })));
    }
  }

  // Calculate cost for a specific variation
  const calculateVariationCost = (recipe: Recipe, variationId?: string) => {
    if (!variationId || !recipe.variations || recipe.variations.length === 0) {
      return recipe.totalCost;
    }

    const variation = recipe.variations.find(v => v.id === variationId);
    if (!variation) return recipe.totalCost;

    // Use the pre-calculated totalCost from the variation
    return variation.totalCost || recipe.totalCost;
  };

  const handleRecipeSelection = (recipeId: string, recipeTypeName: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    console.log('=== handleRecipeSelection ===');
    console.log('Recipe:', recipe.name);
    console.log('Recipe Type:', recipeTypeName);
    console.log('Has Variations:', recipe.variations?.length || 0);

    const hasVariations = recipe.variations && recipe.variations.length > 0;

    // Check if this is a complementary recipe (relleno/cubierta) and if there are available parameters
    const isComplementary = recipeTypeName === 'relleno' || recipeTypeName === 'cubierta';
    console.log('Is Complementary:', isComplementary);

    if (isComplementary) {
      console.log('Searching for available parameters...');
      console.log('Currently selected recipes:', selectedRecipes.length);

      // Find all matching parameters from selected recipes
      const availableParameters: Array<{
        parameterKey: string;
        units: number;
        mainRecipeId: string;
        mainRecipeName: string;
        variationId?: string;
      }> = [];

      for (const selectedRecipe of selectedRecipes) {
        const mainRecipe = recipes.find(r => r.id === selectedRecipe.recipeId);
        console.log('  Checking recipe:', selectedRecipe.recipeName);

        if (!mainRecipe) continue;

        // Get the variation if this recipe has one selected
        const variation = selectedRecipe.variationId && mainRecipe.variations
          ? mainRecipe.variations.find(v => v.id === selectedRecipe.variationId)
          : null;

        // Get parameters from variation if it has them, otherwise from recipe
        const usedParams = getUsedParameters(mainRecipe, variation);
        console.log('  Used parameters:', usedParams);

        if (!usedParams || usedParams.length === 0) continue;

        // Find parameters that match the recipe type
        for (const paramKey of usedParams) {
          const lowerKey = paramKey.toLowerCase();
          const matchesType =
            (recipeTypeName === 'relleno' && lowerKey.includes('relleno')) ||
            (recipeTypeName === 'cubierta' && (lowerKey.includes('cubierta') || lowerKey.includes('cobertura')));

          console.log('  Parameter:', paramKey, '- Matches?', matchesType);

          if (matchesType) {
            // IMPORTANT: selectedRecipe.quantity now represents the number of individual units
            // No need to multiply by variation.units since quantity is already the total units
            const totalUnits = selectedRecipe.quantity;

            // Skip if quantity is 0 - user needs to input quantity first
            if (totalUnits === 0) {
              console.log('  ⚠ Skipping parameter (quantity is 0):', paramKey);
              continue;
            }

            console.log('  ✓ Adding parameter:', paramKey, 'total units:', totalUnits);
            availableParameters.push({
              parameterKey: paramKey,
              units: totalUnits,
              mainRecipeId: mainRecipe.id,
              mainRecipeName: selectedRecipe.recipeName,
              variationId: selectedRecipe.variationId,
            });
          }
        }
      }

      console.log('Available parameters found:', availableParameters.length);

      // If we found available parameters, show selection dialog
      if (availableParameters.length > 0) {
        console.log('→ Showing parameter selection dialog');
        setComplementarySuggestions({
          mainRecipeId: recipe.id,
          mainRecipeName: recipe.name,
          units: 1, // Will be updated when user selects
          parameterKey: '', // Will be updated when user selects
          suggestions: [], // Not used in this flow
          availableParameters: availableParameters,
        } as any);
        setSelectedRecipeForVariation({ recipeId, recipeTypeName });
        setShowComplementaryDialog(true);
        return;
      } else {
        console.log('→ No parameters found, continuing to normal flow');

        // Check if there are recipes that need quantity input
        const recipesNeedingQuantity = selectedRecipes.filter(sr => {
          const r = recipes.find(rec => rec.id === sr.recipeId);
          if (!r) return false;
          const v = sr.variationId && r.variations ? r.variations.find(vr => vr.id === sr.variationId) : null;
          const params = getUsedParameters(r, v);
          return params.some(p => {
            const lowerKey = p.toLowerCase();
            return (recipeTypeName === 'relleno' && lowerKey.includes('relleno')) ||
                   (recipeTypeName === 'cubierta' && (lowerKey.includes('cubierta') || lowerKey.includes('cobertura')));
          }) && sr.quantity === 0;
        });

        if (recipesNeedingQuantity.length > 0) {
          toast({
            title: "Ingrese la cantidad primero",
            description: `Hay recetas que necesitan ${recipeTypeName} pero no tienen cantidad ingresada. Ingrese la cantidad de unidades requeridas antes de agregar ${recipeTypeName}es.`,
            variant: "destructive",
          });
        }
      }
    }

    // Normal flow: If has variations, show dialog, otherwise add directly
    if (hasVariations) {
      setSelectedRecipeForVariation({ recipeId, recipeTypeName });
      setShowVariationDialog(true);
    } else {
      addRecipe(recipeId, recipeTypeName);
    }
  };

  const handleVariationSelection = (variationId: string) => {
    if (!selectedRecipeForVariation) return;

    const recipe = recipes.find(r => r.id === selectedRecipeForVariation.recipeId);
    if (!recipe) return;

    const variation = recipe.variations?.find(v => v.id === variationId);

    // Add the recipe with selected variation
    addRecipe(
      selectedRecipeForVariation.recipeId,
      selectedRecipeForVariation.recipeTypeName,
      variationId
    );

    setShowVariationDialog(false);
    setSelectedRecipeForVariation(null);

    // Check if recipe/variation uses parameters and show complementary suggestions
    // IMPORTANT: Pass variation to get its specific parameters if they exist
    const usedParams = getUsedParameters(recipe, variation);
    if (usedParams.length > 0 && variation) {
      // Find all complementary recipes for all parameters
      const allComplementaryRecipes: Map<string, Recipe[]> = new Map();

      usedParams.forEach(parameterKey => {
        const complementaryRecipes = findRecipesByParameter(recipes, parameterKey);
        if (complementaryRecipes.length > 0) {
          allComplementaryRecipes.set(parameterKey, complementaryRecipes);
        }
      });

      // Show suggestions for the first parameter (can be extended to handle multiple)
      if (allComplementaryRecipes.size > 0) {
        const firstParamKey = usedParams[0];
        const suggestions = allComplementaryRecipes.get(firstParamKey) || [];

        setComplementarySuggestions({
          mainRecipeId: recipe.id,
          mainRecipeName: recipe.name,
          variationId: variation.id,
          variationName: variation.name,
          units: variation.units,
          parameterKey: firstParamKey,
          suggestions: suggestions,
        });
        setShowComplementaryDialog(true);
      }
    }
  };

  const handleParameterSelection = (selectedParam: {
    parameterKey: string;
    units: number;
    mainRecipeName: string;
    mainRecipeId: string;
    variationId?: string;
  }) => {
    if (!selectedRecipeForVariation || !complementarySuggestions) return;

    const recipe = recipes.find(r => r.id === complementarySuggestions.mainRecipeId);
    if (!recipe) return;

    const recipeTypeName = selectedRecipeForVariation.recipeTypeName;

    // Use global parameter calculation
    const parameter = recipeParameters.find(p => p.parameterKey === selectedParam.parameterKey);
    if (!parameter) {
      toast({
        title: "Error",
        description: `No se encontró el parámetro ${selectedParam.parameterKey}`,
        variant: "destructive",
      });
      return;
    }

    // Calculate required amount
    const { amount, unit } = calculateRequiredAmount(parameter, selectedParam.units);

    // IMPORTANT: Check if recipe has totalWeight defined
    if (!recipe.totalWeight || recipe.totalWeight === 0) {
      toast({
        title: "Error - Peso no definido",
        description: `La receta "${recipe.name}" no tiene peso total definido. No se puede calcular el costo proporcional. Por favor, edite la receta y agregue el peso total en la sección de Unidades/Peso.`,
        variant: "destructive",
      });
      console.error('Recipe missing totalWeight:', {
        recipeName: recipe.name,
        recipeId: recipe.id,
        totalWeight: recipe.totalWeight,
        totalWeightUnit: recipe.totalWeightUnit,
      });
      return;
    }

    // Calculate cost based on weight - FIX: Ensure proper cost/weight division
    const { cost, multiplier } = calculateComplementaryCost(recipe, amount, unit);

    console.log('Parameter Calculation:', {
      recipe: recipe.name,
      totalWeight: recipe.totalWeight,
      totalWeightUnit: recipe.totalWeightUnit,
      totalCost: recipe.totalCost,
      requiredAmount: amount,
      requiredUnit: unit,
      multiplier,
      calculatedCost: cost,
    });

    // Find recipe type
    const recipeTypeObj = recipeTypes.find(rt => rt.name === recipeTypeName);
    if (!recipeTypeObj) return;

    // IMPORTANT: Store relationship with main recipe for dynamic updates
    const newRecipe: QuotationRecipe = {
      recipeId: recipe.id,
      recipeName: `${recipe.name} (${amount.toFixed(0)}${unit} para ${selectedParam.mainRecipeName})`,
      recipeType: recipeTypeObj,
      unitCost: cost,
      quantity: 1,
      totalCost: cost,
      // Link to main recipe for automatic recalculation
      linkedToRecipeId: selectedParam.mainRecipeId,
      linkedToVariationId: selectedParam.variationId,
      parameterKey: selectedParam.parameterKey,
      baseRecipeId: recipe.id,
    };

    setSelectedRecipes([...selectedRecipes, newRecipe]);
    setShowComplementaryDialog(false);
    setComplementarySuggestions(null);
    setSelectedRecipeForVariation(null);

    toast({
      title: "Receta agregada con parámetro",
      description: `${recipe.name} agregada con ${amount.toFixed(0)}${unit} (${multiplier.toFixed(2)}x receta base)`,
    });
  };

  const handleComplementarySelection = (complementaryRecipeId: string) => {
    if (!complementarySuggestions) return;

    const complementaryRecipe = recipes.find(r => r.id === complementaryRecipeId);
    if (!complementaryRecipe) return;

    // Use global parameter calculation
    const parameter = recipeParameters.find(p => p.parameterKey === complementarySuggestions.parameterKey);
    if (!parameter) {
      toast({
        title: "Error",
        description: `No se encontró el parámetro ${complementarySuggestions.parameterKey}`,
        variant: "destructive",
      });
      return;
    }

    // Calculate required amount
    const { amount, unit } = calculateRequiredAmount(parameter, complementarySuggestions.units);

    // Calculate cost based on weight
    const { cost, multiplier } = calculateComplementaryCost(complementaryRecipe, amount, unit);

    // Determine recipe type
    let recipeTypeName = 'otro';
    if (complementaryRecipe.categories.includes('relleno')) recipeTypeName = 'relleno';
    else if (complementaryRecipe.categories.includes('cubierta')) recipeTypeName = 'cubierta';
    else if (complementaryRecipe.categories.includes('queque')) recipeTypeName = 'queque';

    // Find recipe type
    const recipeTypeObj = recipeTypes.find(rt => rt.name === recipeTypeName);
    if (!recipeTypeObj) return;

    const newRecipe: QuotationRecipe = {
      recipeId: complementaryRecipe.id,
      recipeName: `${complementaryRecipe.name} (${amount.toFixed(0)}${unit} para ${complementarySuggestions.mainRecipeName})`,
      recipeType: recipeTypeObj,
      unitCost: cost,
      quantity: 1,
      totalCost: cost,
    };

    setSelectedRecipes([...selectedRecipes, newRecipe]);
    setShowComplementaryDialog(false);
    setComplementarySuggestions(null);

    toast({
      title: "Receta complementaria agregada",
      description: `${complementaryRecipe.name} agregada con ${amount.toFixed(0)}${unit} (${multiplier.toFixed(2)}x receta base)`,
    });
  };

  const addRecipe = (recipeId: string, recipeTypeName: string, variationId?: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const recipeTypeObj = recipeTypes.find(rt => rt.name === recipeTypeName);
    if (!recipeTypeObj) return;

    // Calculate cost based on variation or total recipe cost
    let totalVariationCost = recipe.totalCost;
    let recipeName = recipe.name;
    let variationName: string | undefined;
    let units = recipe.units || 1;

    if (variationId && recipe.variations && recipe.variations.length > 0) {
      const variation = recipe.variations.find(v => v.id === variationId);
      if (variation) {
        totalVariationCost = calculateVariationCost(recipe, variationId);
        variationName = variation.name;
        recipeName = `${recipe.name} - ${variation.name}`;
        units = variation.units;
      }
    }

    // IMPORTANT: Calculate unitCost as cost per individual unit
    // unitCost = total cost of variation / number of units it produces
    let unitCost = units > 0 ? totalVariationCost / units : totalVariationCost;

    // For unidad type, use unitCost if available (already per-unit)
    if (recipeTypeName === 'unidad' && recipe.unitCost) {
      unitCost = recipe.unitCost;
    }

    // IMPORTANT: quantity represents number of individual units client wants
    // Start at 0 so user must input the required quantity
    const initialQuantity = 0;

    const newRecipe: QuotationRecipe = {
      recipeId: recipe.id,
      recipeName: recipeName,
      recipeType: recipeTypeObj,
      variationId: variationId,
      variationName: variationName,
      unitCost: unitCost,  // Cost per individual unit
      quantity: initialQuantity,  // Starts at 0, user must input quantity
      totalCost: unitCost * initialQuantity,  // Will be 0 until user inputs quantity
    };

    setSelectedRecipes([...selectedRecipes, newRecipe]);

    // Check if recipe uses parameters and show suggestions for complementary recipes
    // Get the variation object if variationId is provided
    const variation = variationId && recipe.variations
      ? recipe.variations.find(v => v.id === variationId)
      : null;
    const usedParams = getUsedParameters(recipe, variation);

    if (usedParams && usedParams.length > 0) {
      // Show suggestions for each parameter type
      const rellenoParams = usedParams.filter(p => p.toLowerCase().includes('relleno'));
      const cubiertaParams = usedParams.filter(p => p.toLowerCase().includes('cubierta') || p.toLowerCase().includes('cobertura'));

      if (rellenoParams.length > 0 || cubiertaParams.length > 0) {
        // Find complementary recipes
        const rellenoRecipes = recipes.filter(r => r.categories.includes('relleno') && r.totalWeight && r.totalWeight > 0);
        const cubiertaRecipes = recipes.filter(r => r.categories.includes('cubierta') && r.totalWeight && r.totalWeight > 0);

        if (rellenoRecipes.length > 0 || cubiertaRecipes.length > 0) {
          toast({
            title: "Sugerencia: Agregar Complementos",
            description: `${recipe.name} usa parámetros de ${rellenoParams.length > 0 ? 'relleno' : ''}${rellenoParams.length > 0 && cubiertaParams.length > 0 ? ' y ' : ''}${cubiertaParams.length > 0 ? 'cubierta' : ''}. Puede agregar recetas complementarias desde las secciones correspondientes.`,
            duration: 5000,
          });
        }
      }
    }
  };

  const removeRecipe = (index: number) => {
    setSelectedRecipes(selectedRecipes.filter((_, i) => i !== index));
  };

  const updateRecipeQuantity = (index: number, quantity: number) => {
    const updated = [...selectedRecipes];
    const updatedRecipe = updated[index];

    // Update main recipe
    updatedRecipe.quantity = quantity;
    updatedRecipe.totalCost = updatedRecipe.unitCost * quantity;

    // IMPORTANT: Find and update linked complementary recipes (rellenos/cubiertas)
    updated.forEach((linkedRecipe, linkedIndex) => {
      if (linkedIndex === index) return; // Skip the main recipe itself

      // Check if this recipe is linked to the one we're updating
      if (
        linkedRecipe.linkedToRecipeId === updatedRecipe.recipeId &&
        linkedRecipe.linkedToVariationId === updatedRecipe.variationId
      ) {
        console.log('Found linked recipe:', linkedRecipe.recipeName);

        // Get the parameter for recalculation
        const parameter = recipeParameters.find(p => p.parameterKey === linkedRecipe.parameterKey);
        if (!parameter) {
          console.error('Parameter not found:', linkedRecipe.parameterKey);
          return;
        }

        // Get the base recipe to recalculate cost
        const baseRecipe = recipes.find(r => r.id === linkedRecipe.baseRecipeId);
        if (!baseRecipe) {
          console.error('Base recipe not found:', linkedRecipe.baseRecipeId);
          return;
        }

        // Recalculate amount needed based on new quantity
        const { amount, unit } = calculateRequiredAmount(parameter, quantity);

        // Recalculate cost
        if (baseRecipe.totalWeight && baseRecipe.totalWeight > 0) {
          const { cost } = calculateComplementaryCost(baseRecipe, amount, unit);

          // Update the linked recipe
          updated[linkedIndex] = {
            ...linkedRecipe,
            recipeName: `${baseRecipe.name} (${amount.toFixed(0)}${unit} para ${updatedRecipe.recipeName})`,
            unitCost: cost,
            totalCost: cost,
          };

          console.log('Updated linked recipe:', {
            name: baseRecipe.name,
            oldAmount: linkedRecipe.recipeName,
            newAmount: amount,
            newCost: cost,
          });
        }
      }
    });

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

    // Calcular costo por unidad correctamente
    const costPerUnit = supply.cost / supply.quantity;

    const newSupply: QuotationSupply = {
      supplyId: supply.id,
      supplyName: supply.name,
      quantity: 1,
      unit: supply.unit,
      costPerUnit: costPerUnit,
      totalCost: costPerUnit,
    };

    setSelectedSupplies([...selectedSupplies, newSupply]);
  };

  const addIngredient = (ingredientId: string) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return;
    const alreadyAdded = selectedIngredients.find(i => i.ingredientId === ingredientId);
    if (alreadyAdded) {
      toast({
        title: "Ingrediente ya fue agregado",
        description: `${ingredient.name} ya esta en la lista de ingredientes seleccionados.`,
        variant: "destructive",
      });
      return;
    }
    const costPerUnit = ingredient.cost / ingredient.qtyProvider;
    const newIngredient: QuotationIngredient = {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity: 1,
      units: ingredient.units,
      costPerUnit: costPerUnit,
      totalCost: costPerUnit,
    };
    setSelectedIngredients([...selectedIngredients, newIngredient]);
  }

  const updateSupplyQuantity = (supplyId: string, quantity: number) => {
    setSelectedSupplies(prev =>
      prev.map(s =>
        s.supplyId === supplyId
          ? { ...s, quantity, totalCost: s.costPerUnit * quantity }
          : s
      )
    );
  };

  const updateIngredientQuantity = (ingredientId: string, quantity: number) => {
    setSelectedIngredients(prev =>
      prev.map(i =>
        i.ingredientId === ingredientId
          ? { ...i, quantity, totalCost: i.costPerUnit * quantity }
          : i
      )
    );
  };


  const removeSupply = (supplyId: string) => {
    setSelectedSupplies(prev => prev.filter(s => s.supplyId !== supplyId));
  };
  const removeIngredient = (ingredientId: string) => {
    setSelectedIngredients(prev => prev.filter(i => i.ingredientId !== ingredientId));
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
    const ingredientsTotal = selectedIngredients.reduce((sum, i) => sum + i.totalCost, 0);
    return recipesTotal + suppliesTotal + expensesTotal + ingredientsTotal;
  };

  const calculateProfit = () => {
    const totalCost = calculateTotal();
    return sellingPrice - totalCost;
  };

  const calculateProfitMargin = () => {
    const totalCost = calculateTotal();
    if (totalCost === 0) return 0;
    const profit = calculateProfit();
    return (profit / totalCost) * 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Transform recipes to send recipeTypeId instead of the full object
    const recipesForAPI = selectedRecipes.map(recipe => ({
      recipeId: recipe.recipeId,
      recipeName: recipe.recipeName,
      recipeTypeId: recipe.recipeType.id,
      unitCost: recipe.unitCost,
      quantity: recipe.quantity,
      totalCost: recipe.totalCost,
    }));

    const totalCost = calculateTotal();
    const profit = calculateProfit();
    const profitMargin = calculateProfitMargin();

    const quotationData = {
      organizationId: currentOrganization?.id || "",
      clientName,
      recipes: recipesForAPI,
      selectedSupplies,
      additionalIngredients: selectedIngredients.length > 0 ? selectedIngredients : undefined,
      additionalExpenses: additionalExpenses.length > 0 ? additionalExpenses : undefined,
      totalCost,
      sellingPrice: sellingPrice > 0 ? sellingPrice : undefined,
      profit: sellingPrice > 0 ? profit : undefined,
      profitMargin: sellingPrice > 0 ? profitMargin : undefined,
      notes,
    };
    await onSubmit(quotationData);
    setIsLoading(false);
  };

  const recipesByType = {
    queque: recipes.filter(r => (r.categories || [(r as any).category]).includes('queque')),
    relleno: recipes.filter(r => (r.categories || [(r as any).category]).includes('relleno')),
    cubierta: recipes.filter(r => (r.categories || [(r as any).category]).includes('cubierta')),
    unidad: recipes.filter(r => (r.categories || [(r as any).category]).includes('unidad')),
  };

  return (
    <Card>
      <CardHeader></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nombre del Cliente</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Recetas Seleccionadas</Label>

            {/* Resumen de Parámetros Globales Utilizados */}
            {selectedRecipes.length > 0 && (() => {
              const usedParametersSet = new Set<string>();
              selectedRecipes.forEach(sr => {
                const recipe = recipes.find(r => r.id === sr.recipeId);
                if (!recipe) return;

                // Get the variation if this recipe has one selected
                const variation = sr.variationId && recipe.variations
                  ? recipe.variations.find(v => v.id === sr.variationId)
                  : null;

                // Get parameters from variation if it has them, otherwise from recipe
                const usedParams = getUsedParameters(recipe, variation);
                if (usedParams) {
                  usedParams.forEach(param => usedParametersSet.add(param));
                }
              });
              const usedParametersArray = Array.from(usedParametersSet);

              if (usedParametersArray.length > 0) {
                return (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <div className="font-semibold mb-2 text-blue-900">Parámetros Globales Utilizados:</div>
                      <div className="space-y-1 text-sm text-blue-800">
                        {usedParametersArray.map(paramKey => {
                          const param = recipeParameters.find(p => p.parameterKey === paramKey);
                          return (
                            <div key={paramKey} className="flex items-center justify-between">
                              <span>• {paramKey.replace(/_/g, ' ')}</span>
                              {param && (
                                <span className="font-medium">{param.value}{param.unit} por unidad</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              }
              return null;
            })()}

            {/* Recetas Principales (Queque y Unidad) */}
            {['queque', 'unidad'].map((type) => {
              const recipesOfType = selectedRecipes.filter(r => r.recipeType.name === type);
              return (
                <Card key={type}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold capitalize text-lg">{type === 'queque' ? 'Queques / Pasteles' : 'Productos por Unidad'}</h4>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
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
                            <CommandInput placeholder={`Buscar ${type}...`} />
                            <CommandList>
                              <CommandEmpty>No se encontró receta.</CommandEmpty>
                              <CommandGroup>
                                {recipesByType[type as keyof typeof recipesByType].map((recipe) => (
                                  <CommandItem
                                    key={recipe.id}
                                    value={recipe.name}
                                    onSelect={() => handleRecipeSelection(recipe.id, type as any)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex flex-col">
                                        <span>{recipe.name}</span>
                                        {recipe.usedParameters && recipe.usedParameters.length > 0 && (
                                          <span className="text-xs text-blue-600 mt-0.5">
                                            Usa: {recipe.usedParameters.map(p => p.replace(/_/g, ' ')).join(', ')}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {recipe.variations && recipe.variations.length > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            ({recipe.variations.length} variaciones)
                                          </span>
                                        )}
                                        <span className="text-muted-foreground">
                                          ₡{type === 'unidad' ? (recipe.unitCost || recipe.totalCost).toFixed(2) : recipe.totalCost.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {recipesOfType.map((recipe, index) => {
                      const actualIndex = selectedRecipes.findIndex(r => r === recipe);
                      const originalRecipe = recipes.find(r => r.id === recipe.recipeId);

                      // Get the variation if this recipe has one selected
                      const selectedVariation = recipe.variationId && originalRecipe?.variations
                        ? originalRecipe.variations.find(v => v.id === recipe.variationId)
                        : null;

                      // Get parameters from variation if it has them, otherwise from recipe
                      const displayedParams = originalRecipe
                        ? getUsedParameters(originalRecipe, selectedVariation)
                        : [];

                      return (
                        <div key={actualIndex} className="mb-3">
                          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border border-blue-100">
                            <div className="flex-1">
                              <div className="font-medium">{recipe.recipeName}</div>
                              {displayedParams && displayedParams.length > 0 && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Requiere: {displayedParams.map(p => p.replace(/_/g, ' ')).join(', ')}
                                </div>
                              )}
                            </div>
                            <Input
                              type="number"
                              min="0.1"
                              step="any"
                              value={recipe.quantity}
                              onChange={(e) => updateRecipeQuantity(actualIndex, parseFloat(e.target.value))}
                              className="w-20"
                            />
                            <span className="w-24 text-right font-semibold">₡{recipe.totalCost.toFixed(2)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRecipe(actualIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Mostrar complementos relacionados */}
                          {(() => {
                            const complementRecipes = selectedRecipes.filter(r =>
                              (r.recipeType.name === 'relleno' || r.recipeType.name === 'cubierta') &&
                              r.recipeName.includes(`para ${recipe.recipeName}`)
                            );
                            if (complementRecipes.length > 0) {
                              return (
                                <div className="ml-6 mt-2 space-y-2 border-l-2 border-blue-200 pl-4">
                                  {complementRecipes.map(comp => {
                                    const compIndex = selectedRecipes.findIndex(r => r === comp);
                                    return (
                                      <div key={compIndex} className="flex items-center gap-3 p-2 bg-green-50 rounded border border-green-100">
                                        <span className="flex-1 text-sm">↳ {comp.recipeName}</span>
                                        <Input
                                          type="number"
                                          min="0.1"
                                          step="any"
                                          value={comp.quantity}
                                          onChange={(e) => updateRecipeQuantity(compIndex, parseFloat(e.target.value))}
                                          className="w-20"
                                        />
                                        <span className="w-24 text-right font-medium text-sm">₡{comp.totalCost.toFixed(2)}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeRecipe(compIndex)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}

            {/* Recetas Complementarias (Relleno y Cubierta) */}
            {['relleno', 'cubierta'].map((type) => {
              const recipesOfType = selectedRecipes.filter(r =>
                r.recipeType.name === type &&
                !r.recipeName.includes('para ')
              );
              return (
                <Card key={type}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold capitalize text-lg">{type === 'relleno' ? 'Rellenos' : 'Cubiertas'}</h4>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
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
                            <CommandInput placeholder={`Buscar ${type}...`} />
                            <CommandList>
                              <CommandEmpty>No se encontró receta.</CommandEmpty>
                              <CommandGroup>
                                {recipesByType[type as keyof typeof recipesByType].map((recipe) => (
                                  <CommandItem
                                    key={recipe.id}
                                    value={recipe.name}
                                    onSelect={() => handleRecipeSelection(recipe.id, type as any)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex flex-col">
                                        <span>{recipe.name}</span>
                                        {recipe.totalWeight && (
                                          <span className="text-xs text-muted-foreground">
                                            Produce: {recipe.totalWeight}{recipe.totalWeightUnit}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-muted-foreground">
                                        ₡{recipe.totalCost.toFixed(2)}
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

                    {recipesOfType.map((recipe, index) => {
                      const actualIndex = selectedRecipes.findIndex(r => r === recipe);
                      return (
                        <div key={actualIndex} className="flex items-center gap-3 mb-2 p-2 bg-muted rounded">
                          <span className="flex-1">{recipe.recipeName}</span>
                          <Input
                            type="number"
                            min="0.1"
                            step="any"
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
              );
            })}
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
                              min="0.1"
                              step="any"
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
          {/* Ingredients Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Ingredientes</Label>
                <p className="text-sm text-muted-foreground mt-1">Seleccione múltiples ingredientes necesarios</p>
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
                      Escoja un ingrediente a agregar...
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Busca ingredientes..." />
                    <CommandList>
                      <CommandEmpty>
                        {ingredients.length === 0
                          ? "No hay ingredientes a la mano. Agregue ingredientes en la página de ingredientes primero."
                          : "No se encontraron ingredientes."}
                      </CommandEmpty>
                      <CommandGroup>
                        {ingredients.map((ingrediente) => (
                          <CommandItem
                            key={ingrediente.id}
                            value={ingrediente.name}
                            onSelect={() => addIngredient(ingrediente.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="font-medium">{ingrediente.name}</span>
                              <span className="text-muted-foreground text-sm">
                                ₡{ingrediente.cost} / {ingrediente.qtyProvider}
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

            {selectedIngredients.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingrediente</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Costo por Unidad</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedIngredients.map((ingrediente) => (
                        <TableRow key={ingrediente.ingredientId}>
                          <TableCell className="font-medium">
                            {ingrediente.ingredientName}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.1"
                              step="any"
                              value={ingrediente.quantity}
                              onChange={(e) =>
                                updateIngredientQuantity(ingrediente.ingredientId, parseFloat(e.target.value) || 0)
                              }
                              className="w-24 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            ₡{ingrediente.costPerUnit.toFixed(2)} / {ingrediente.quantity}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₡{ingrediente.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIngredient(ingrediente.ingredientId)}
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
                              min="0.1"
                              step="any"
                              value={expense.unitPrice}
                              onChange={(e) => updateAdditionalExpense(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-32 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.1"
                              step="any"
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

          {/* Cost Summary and Profit Calculation */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Costo Total:</span>
                <span className="text-2xl font-bold">₡{calculateTotal().toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Precio de Venta (Opcional)</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  min="0"
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  placeholder="Ingrese el precio de venta"
                />
              </div>

              {sellingPrice > 0 && (
                <>
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-muted-foreground">Ganancia:</span>
                      <span className={`text-xl font-bold ${calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₡{calculateProfit().toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-muted-foreground">Margen de Ganancia:</span>
                      <span className={`text-xl font-bold ${calculateProfitMargin() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {calculateProfitMargin().toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {calculateProfit() < 0 && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        El precio de venta es menor que el costo total. Estás teniendo pérdidas.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>

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

        {/* Variation Selection Dialog */}
        <Dialog open={showVariationDialog} onOpenChange={setShowVariationDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Seleccionar Variación</DialogTitle>
              <DialogDescription>
                {selectedRecipeForVariation && (() => {
                  const recipe = recipes.find(r => r.id === selectedRecipeForVariation.recipeId);
                  return recipe ? `Esta receta tiene ${recipe.variations?.length || 0} variaciones. Selecciona una:` : '';
                })()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedRecipeForVariation && (() => {
                const recipe = recipes.find(r => r.id === selectedRecipeForVariation.recipeId);
                if (!recipe || !recipe.variations) return null;

                return recipe.variations.map((variation) => {
                  const variationCost = calculateVariationCost(recipe, variation.id);
                  return (
                    <Card
                      key={variation.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleVariationSelection(variation.id)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-base">{variation.name}</h4>
                              {variation.isDefault && (
                                <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                                  Predeterminada
                                </span>
                              )}
                            </div>
                            {variation.description && (
                              <p className="text-sm text-muted-foreground mb-2">{variation.description}</p>
                            )}
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div>{variation.units} unidades</div>
                              <div>Multiplicador: {variation.ingredientMultiplier}x</div>
                              <div>₡{variation.unitCost?.toFixed(2)}/unidad</div>
                            </div>
                            {recipe.usedParameters && recipe.usedParameters.length > 0 && (
                              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                                <div className="text-xs font-semibold text-blue-900 mb-1">Requiere parámetros:</div>
                                <div className="space-y-0.5">
                                  {recipe.usedParameters.map(paramKey => {
                                    const param = recipeParameters.find(p => p.parameterKey === paramKey);
                                    const { amount } = param ? calculateRequiredAmount(param, variation.units) : { amount: 0 };
                                    return (
                                      <div key={paramKey} className="text-xs text-blue-800">
                                        • {paramKey.replace(/_/g, ' ')}: {param ? `${amount.toFixed(0)}${param.unit}` : 'N/A'}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm text-muted-foreground">Costo</div>
                            <div className="text-xl font-bold text-primary">
                              ₡{variationCost.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVariationDialog(false);
                  setSelectedRecipeForVariation(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Parameter Selection Dialog for Complementary Recipes */}
        <Dialog open={showComplementaryDialog} onOpenChange={setShowComplementaryDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Seleccionar Parámetro</DialogTitle>
              <DialogDescription>
                {complementarySuggestions?.availableParameters && complementarySuggestions.availableParameters.length > 0
                  ? `Seleccione para qué receta desea agregar ${complementarySuggestions.mainRecipeName}`
                  : complementarySuggestions && (() => {
                      const parameter = recipeParameters.find(p => p.parameterKey === complementarySuggestions.parameterKey);
                      if (!parameter) return '';
                      const { amount, unit } = calculateRequiredAmount(parameter, complementarySuggestions.units);
                      return `${complementarySuggestions.mainRecipeName} (${complementarySuggestions.variationName}) necesita ${amount.toFixed(0)}${unit} de ${parameter.parameterKey.replace(/_/g, ' ')}`;
                    })()}
              </DialogDescription>
            </DialogHeader>

            {complementarySuggestions && (() => {
              // If we have availableParameters, show parameter selection
              if (complementarySuggestions.availableParameters && complementarySuggestions.availableParameters.length > 0) {
                return (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Seleccione el parámetro global que desea usar para calcular la cantidad necesaria
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {complementarySuggestions.availableParameters.map((paramOption, index) => {
                        const parameter = recipeParameters.find(p => p.parameterKey === paramOption.parameterKey);
                        if (!parameter) return null;

                        const { amount, unit } = calculateRequiredAmount(parameter, paramOption.units);
                        const recipe = recipes.find(r => r.id === complementarySuggestions.mainRecipeId);
                        if (!recipe) return null;

                        // Check if recipe has weight defined
                        const hasWeight = recipe.totalWeight && recipe.totalWeight > 0;
                        const { cost, multiplier } = hasWeight
                          ? calculateComplementaryCost(recipe, amount, unit)
                          : { cost: recipe.totalCost, multiplier: 1 };

                        return (
                          <Card
                            key={index}
                            className={`cursor-pointer transition-colors ${!hasWeight ? 'border-destructive/50 bg-destructive/5' : 'hover:border-primary'}`}
                            onClick={() => handleParameterSelection({
                              parameterKey: paramOption.parameterKey,
                              units: paramOption.units,
                              mainRecipeName: paramOption.mainRecipeName,
                              mainRecipeId: paramOption.mainRecipeId,
                              variationId: paramOption.variationId,
                            })}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-base mb-2">{paramOption.mainRecipeName}</h4>
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    <div>Parámetro: {parameter.parameterKey.replace(/_/g, ' ')}</div>
                                    <div>Valor: {parameter.value}{parameter.unit} por unidad</div>
                                    <div>Unidades: {paramOption.units}</div>
                                    <div className="font-semibold text-foreground">Necesitas: {amount.toFixed(0)}{unit}</div>
                                    {hasWeight ? (
                                      <>
                                        <div>Receta produce: {recipe.totalWeight}{recipe.totalWeightUnit}</div>
                                        <div>Multiplicador: {multiplier.toFixed(2)}x receta base</div>
                                      </>
                                    ) : (
                                      <div className="text-destructive font-semibold">⚠️ Peso no definido - usará costo total</div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-sm text-muted-foreground">Costo {hasWeight ? 'calculado' : 'total'}</div>
                                  <div className={`text-xl font-bold ${hasWeight ? 'text-primary' : 'text-destructive'}`}>
                                    ₡{cost.toFixed(2)}
                                  </div>
                                  {hasWeight && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      (₡{recipe.totalCost.toFixed(2)} × {multiplier.toFixed(2)})
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowComplementaryDialog(false);
                          setComplementarySuggestions(null);
                          setSelectedRecipeForVariation(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          // Add without parameter
                          if (selectedRecipeForVariation) {
                            addRecipe(complementarySuggestions.mainRecipeId, selectedRecipeForVariation.recipeTypeName);
                          }
                          setShowComplementaryDialog(false);
                          setComplementarySuggestions(null);
                          setSelectedRecipeForVariation(null);
                        }}
                      >
                        Agregar sin parámetro
                      </Button>
                    </div>
                  </div>
                );
              }

              // Otherwise, show recipe suggestions
              const parameter = recipeParameters.find(p => p.parameterKey === complementarySuggestions.parameterKey);
              if (!parameter) return null;
              const { amount, unit } = calculateRequiredAmount(parameter, complementarySuggestions.units);

              return (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Selecciona una receta de {parameter.parameterKey.replace(/_/g, ' ').toLowerCase()} o puedes omitir y agregarlo después.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {complementarySuggestions.suggestions.map((suggestion) => {
                      const { cost, multiplier } = calculateComplementaryCost(suggestion, amount, unit);
                      return (
                        <Card
                          key={suggestion.id}
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => handleComplementarySelection(suggestion.id)}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-base mb-2">{suggestion.name}</h4>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <div>Produce: {suggestion.totalWeight?.toFixed(0)}{suggestion.totalWeightUnit || 'gr'}</div>
                                  <div>Necesitas: {amount.toFixed(0)}{unit}</div>
                                  <div>Multiplicador: {multiplier.toFixed(2)}x receta base</div>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-sm text-muted-foreground">Costo calculado</div>
                                <div className="text-xl font-bold text-primary">
                                  ₡{cost.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  (₡{suggestion.totalCost.toFixed(2)} × {multiplier.toFixed(2)})
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowComplementaryDialog(false);
                        setComplementarySuggestions(null);
                      }}
                    >
                      Omitir
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
