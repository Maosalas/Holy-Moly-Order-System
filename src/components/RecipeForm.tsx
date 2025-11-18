import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Upload, ImageIcon, Check, ChevronsUpDown, Tag, Divide, GripVertical, Trash2, Package } from "lucide-react";
import { Recipe, RecipeIngredient, RecipeFormData, Category, RecipeElaboration, RecipeVariation } from "@/types/recipe";
import { Ingredient } from "@/types/ingredient";
import { toast } from "@/hooks/use-toast";
import { ingredientsApi, suppliesApi } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Textarea } from "./ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { migrateRecipeToElaborations } from "@/lib/recipeUtils";
import { useOrganization } from "@/contexts/OrganizationContext";
import { VariationEditor } from "./VariationEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { useRecipeParameters, useCreateRecipeParameter } from "@/hooks/use-recipe-parameters";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface RecipeFormProps {
  recipe?: Recipe;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
}

export const RecipeForm = ({ recipe, onSubmit, onCancel }: RecipeFormProps) => {
  const { currentOrganization } = useOrganization();
  const { data: recipeParameters = [] } = useRecipeParameters();
  const createParameter = useCreateRecipeParameter();

  // Aplicar migración si la receta existe y lo necesita
  const migratedRecipe = recipe ? migrateRecipeToElaborations(recipe) : undefined;

  const [name, setName] = useState(migratedRecipe?.name || "");
  const [categories, setCategories] = useState<Category[]>(() => {
    if (migratedRecipe?.categories && Array.isArray(migratedRecipe.categories) && migratedRecipe.categories.length > 0) {
      return migratedRecipe.categories;
    }
    if ((migratedRecipe as any)?.category) {
      return [(migratedRecipe as any).category];
    }
    return ["unidad"];
  });
  const [notes, setNotes] = useState(migratedRecipe?.notes || "");
  const [url, setUrl] = useState(migratedRecipe?.url || "");
  const [unidades, setUnidades] = useState(migratedRecipe?.units || 0);
  const [image, setImage] = useState(migratedRecipe?.image || "");
  const [variations, setVariations] = useState<RecipeVariation[]>(
    migratedRecipe?.variations || []
  );
  const [totalWeight, setTotalWeight] = useState(migratedRecipe?.totalWeight || 0);
  const [totalWeightUnit, setTotalWeightUnit] = useState(migratedRecipe?.totalWeightUnit || "gr");
  const [useManualWeight, setUseManualWeight] = useState(!!migratedRecipe?.totalWeight);
  const [usedParameters, setUsedParameters] = useState<string[]>(
    migratedRecipe?.usedParameters || []
  );

  // States for new parameter dialog
  const [showNewParameterDialog, setShowNewParameterDialog] = useState(false);
  const [newParameterKey, setNewParameterKey] = useState("");
  const [newParameterValue, setNewParameterValue] = useState("");
  const [newParameterUnit, setNewParameterUnit] = useState("gr");
  const [newParameterDescription, setNewParameterDescription] = useState("");

  // Set default images for relleno and cubierta when categories change
  useEffect(() => {
    if (!migratedRecipe && !image) {
      if (categories.includes('relleno')) {
        setImage('/src/assets/temp_relleno.png');
      } else if (categories.includes('cubierta')) {
        setImage('/src/assets/temp_cubierta.png');
      }
    }
  }, [categories, migratedRecipe, image]);
  const [elaborations, setElaborations] = useState<RecipeElaboration[]>(
    migratedRecipe?.elaborations && migratedRecipe.elaborations.length > 0
      ? migratedRecipe.elaborations
      : [{
          id: crypto.randomUUID(),
          name: "",
          order: 1,
          cost: 0,
          ingredients: []
        }]
  );
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [availableSupplies, setAvailableSupplies] = useState<any[]>([]);
  const [selectedSupplies, setSelectedSupplies] = useState<any[]>(
    migratedRecipe?.supplies || []
  );
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
    const fetchSupplies = async () => {
      const result = await suppliesApi.getAll();
      if (result.data) {
        const suppliesData = Array.isArray(result.data) ? result.data : [];
        setAvailableSupplies(suppliesData.map((s: any) => ({
          ...s,
          createdAt: new Date(s.created_at),
          updatedAt: new Date(s.updated_at)
        })));
      }
    };
    fetchIngredients();
    fetchSupplies();
  }, []);

  const calculateTotalCost = () => {
    const ingredientsCost = elaborations.reduce((total, elab) => {
      return total + elab.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    }, 0);
    const suppliesCost = selectedSupplies.reduce((sum, supply) => sum + supply.totalCost, 0);
    return ingredientsCost + suppliesCost;
  };

  const calculateTotalWeight = () => {
    // Sum all ingredient quantities across all elaborations
    return elaborations.reduce((total, elab) => {
      return total + elab.ingredients.reduce((sum, ing) => {
        // Only sum if the ingredient unit is weight-based (gr, kg)
        if (ing.units === 'gr' || ing.units === 'g') {
          return sum + ing.quantity;
        } else if (ing.units === 'kg') {
          return sum + (ing.quantity * 1000); // Convert to grams
        }
        // For other units (ml, L, units, etc.), don't include in weight
        return sum;
      }, 0);
    }, 0);
  };

  // Parameter management
  const handleCreateParameter = async () => {
    if (!newParameterKey.trim() || !newParameterValue) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      await createParameter.mutateAsync({
        parameterKey: newParameterKey.trim(),
        value: parseFloat(newParameterValue),
        unit: newParameterUnit,
        description: newParameterDescription.trim() || undefined,
      });

      // Add the new parameter to the selected parameters
      setUsedParameters(prev => [...prev, newParameterKey.trim()]);

      // Reset form and close dialog
      setNewParameterKey("");
      setNewParameterValue("");
      setNewParameterUnit("gr");
      setNewParameterDescription("");
      setShowNewParameterDialog(false);
    } catch (error) {
      // Error is already handled by the mutation
      console.error("Error creating parameter:", error);
    }
  };

  // Elaboration management
  const addElaboration = () => {
    const newElaboration: RecipeElaboration = {
      id: getUUID(),
      name: `Elaboración ${elaborations.length + 1}`,
      order: elaborations.length + 1,
      cost: 0,
      ingredients: [],
    };
    setElaborations([...elaborations, newElaboration]);
  };

  const removeElaboration = (id: string) => {
    if (elaborations.length === 1) {
      toast({
        title: "No se puede eliminar",
        description: "Debe haber al menos una elaboración",
        variant: "destructive",
      });
      return;
    }
    setElaborations(elaborations.filter(elab => elab.id !== id));
  };

  const updateElaborationName = (id: string, name: string) => {
    setElaborations(elaborations.map(elab =>
      elab.id === id ? { ...elab, name } : elab
    ));
  };

  // Ingredient management within elaboration
  const addIngredientToElaboration = (elaborationId: string) => {
    if (availableIngredients.length === 0) {
      toast({
        title: "No hay ingredientes disponibles",
        description: "Por favor ingrese ingredientes antes de agregar a la receta.",
        variant: "destructive",
      });
      return;
    }

    setElaborations(elaborations.map(elab => {
      if (elab.id === elaborationId) {
        return {
          ...elab,
          ingredients: [
            ...elab.ingredients,
            {
              id: getUUID(),
              ingredientId: "",
              ingredientName: "",
              quantity: 0,
              units: "",
              cost: 0,
            }
          ]
        };
      }
      return elab;
    }));
  };

  const removeIngredientFromElaboration = (elaborationId: string, ingredientId: string) => {
    setElaborations(elaborations.map(elab => {
      if (elab.id === elaborationId) {
        return {
          ...elab,
          ingredients: elab.ingredients.filter(ing => ing.id !== ingredientId)
        };
      }
      return elab;
    }));
  };

  const updateIngredientInElaboration = (
    elaborationId: string,
    ingredientId: string,
    selectedIngredientId: string
  ) => {
    const selectedIngredient = availableIngredients.find((i) => i.id === selectedIngredientId);
    if (!selectedIngredient) return;

    setElaborations(elaborations.map(elab => {
      if (elab.id === elaborationId) {
        return {
          ...elab,
          ingredients: elab.ingredients.map(ing =>
            ing.id === ingredientId
              ? {
                  ...ing,
                  ingredientId: selectedIngredient.id,
                  ingredientName: selectedIngredient.name,
                  units: selectedIngredient.units,
                  cost: 0,
                }
              : ing
          )
        };
      }
      return elab;
    }));
  };

  const updateIngredientQuantityInElaboration = (
    elaborationId: string,
    ingredientId: string,
    quantity: number
  ) => {
    setElaborations(elaborations.map(elab => {
      if (elab.id === elaborationId) {
        return {
          ...elab,
          ingredients: elab.ingredients.map(ing => {
            if (ing.id === ingredientId) {
              const baseIngredient = availableIngredients.find((i) => i.id === ing.ingredientId);
              if (!baseIngredient) return ing;

              const cost = (quantity / baseIngredient.qtyProvider) * baseIngredient.cost;
              return { ...ing, quantity, cost };
            }
            return ing;
          })
        };
      }
      return elab;
    }));
  };

  const compressImage = (base64: string, callback: (compressed: string) => void) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;

      let width = img.width;
      let height = img.height;

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

      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      callback(compressed);
    };
    img.src = base64;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "Por favor seleccione una imagen menor a 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
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
        title: "Error de validación",
        description: "El nombre de la receta es requerido",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (elaborations.length === 0 || elaborations.every(elab => elab.ingredients.length === 0)) {
      toast({
        title: "Error de validación",
        description: "Debe haber al menos un ingrediente en alguna elaboración",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const hasInvalidIngredients = elaborations.some(elab =>
      elab.ingredients.some(ing => !ing.ingredientId || ing.quantity <= 0)
    );

    if (hasInvalidIngredients) {
      toast({
        title: "Error de validación",
        description: "Todos los ingredientes deben tener una selección y cantidad",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const totalCost = calculateTotalCost();

    // Determine totalWeight based on manual or auto
    const finalTotalWeight = useManualWeight ? totalWeight : calculateTotalWeight();

    // Calcular cost de cada elaboración
    const elaborationsWithCost = elaborations.map(elab => ({
      ...elab,
      cost: elab.ingredients.reduce((sum, ing) => sum + ing.cost, 0)
    }));

    // Preparar variations con sus elaborations (mantener las elaboraciones específicas)
    const preparedVariations = variations.map(v => {
      const prepared = {
        ...v,
        baseElaborationIds: v.baseElaborationIds || [],  // Ensure baseElaborationIds is included
        base_elaboration_ids: v.baseElaborationIds || [], // Backend expects snake_case
        elaborations: v.elaborations.map(elab => ({
          ...elab,
          cost: elab.ingredients.reduce((sum, ing) => sum + ing.cost, 0)
        }))
      };
      console.log('Prepared variation:', v.name, 'baseElaborationIds:', v.baseElaborationIds);
      return prepared;
    });

    // Preparar usedParameters:
    // - Si NO tiene variaciones: a nivel de receta
    // - Si SÍ tiene variaciones: null a nivel de receta (se envían en cada variación)
    const finalUsedParameters = variations.length === 0 && usedParameters.length > 0
      ? usedParameters
      : undefined;

    try {
      await onSubmit({
        organizationId: currentOrganization?.id || "",
        name: name.trim(),
        image: image || undefined,
        elaborations: elaborationsWithCost,
        usedParameters: finalUsedParameters,
        totalWeight: (categories.includes("relleno") || categories.includes("cubierta")) ? finalTotalWeight : undefined,
        totalWeightUnit: (categories.includes("relleno") || categories.includes("cubierta")) ? totalWeightUnit : undefined,
        variations: preparedVariations.length > 0 ? preparedVariations : undefined,
        supplies: selectedSupplies.length > 0 ? selectedSupplies : undefined,
        totalCost,
        categories: categories,
        notes: notes,
        url: url,
        units: unidades,
        unitCost: totalUnitCost || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = calculateTotalCost();
  const totalUnitCost =
    unidades && unidades > 0
      ? Math.round((totalCost / unidades) * 1000) / 1000
      : 0;
  const totalWholeCost = totalCost; // Costo completo sin dividir
  
  const toggleCategory = (cat: Category) => {
    setCategories(prev => {
      if (prev.includes(cat)) {
        // No permitir eliminar si es la única categoría
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">
          {recipe ? "Editar Receta" : "Nueva Receta"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la receta *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingrese el nombre de la receta"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Categorías *</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "queque", label: "Queque" },
                { value: "relleno", label: "Relleno" },
                { value: "cubierta", label: "Cubierta" },
                { value: "unidad", label: "Unidad" },
                { value: "otro", label: "Otro" },
              ].map((cat) => (
                <Button
                  key={cat.value}
                  type="button"
                  variant={categories.includes(cat.value as Category) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCategory(cat.value as Category)}
                  className="gap-2"
                >
                  {categories.includes(cat.value as Category) && (
                    <Check className="h-4 w-4" />
                  )}
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Parámetros Globales</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {variations.length > 0
                    ? "Los parámetros se configuran individualmente en cada variación"
                    : "Seleccione los parámetros que esta receta utiliza (opcional)"}
                </p>
              </div>
              {variations.length === 0 && (
                <Dialog open={showNewParameterDialog} onOpenChange={setShowNewParameterDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Parámetro
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Parámetro Global</DialogTitle>
                    <DialogDescription>
                      Agregue un nuevo parámetro para usar en sus recetas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="paramKey">Nombre del Parámetro *</Label>
                      <Input
                        id="paramKey"
                        placeholder="Ej: Relleno Cupcake, Crema de Mantequilla, Fondant"
                        value={newParameterKey}
                        onChange={(e) => setNewParameterKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use un nombre descriptivo y único para identificar este parámetro
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paramValue">Valor *</Label>
                        <Input
                          id="paramValue"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Ej: 50"
                          value={newParameterValue}
                          onChange={(e) => setNewParameterValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paramUnit">Unidad *</Label>
                        <Input
                          id="paramUnit"
                          placeholder="Ej: gr, ml"
                          value={newParameterUnit}
                          onChange={(e) => setNewParameterUnit(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paramDescription">Descripción (Opcional)</Label>
                      <Textarea
                        id="paramDescription"
                        placeholder="Breve descripción del parámetro"
                        value={newParameterDescription}
                        onChange={(e) => setNewParameterDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewParameterDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateParameter}
                      disabled={!newParameterKey.trim() || !newParameterValue || createParameter.isPending}
                    >
                      {createParameter.isPending ? "Creando..." : "Crear Parámetro"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}
            </CardHeader>
              <CardContent className="space-y-4">
                {variations.length > 0 ? (
                  <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>⚠️ Esta receta tiene variaciones</p>
                    <p className="text-sm mt-2">
                      Los parámetros globales deben configurarse en cada variación individual
                    </p>
                  </div>
                ) : recipeParameters.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No hay parámetros globales definidos.</p>
                    <p className="text-sm mt-2">
                      Cree un nuevo parámetro usando el botón "Nuevo Parámetro" arriba
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Seleccionar Parámetros</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                          >
                            {usedParameters.length > 0
                              ? `${usedParameters.length} parámetro${usedParameters.length > 1 ? 's' : ''} seleccionado${usedParameters.length > 1 ? 's' : ''}`
                              : "Seleccionar parámetros..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar parámetros..." />
                            <CommandList>
                              <CommandEmpty>No se encontraron parámetros.</CommandEmpty>
                              <CommandGroup>
                                {recipeParameters.map((param) => (
                                  <CommandItem
                                    key={param.id}
                                    value={param.parameterKey}
                                    onSelect={() => {
                                      setUsedParameters(prev =>
                                        prev.includes(param.parameterKey)
                                          ? prev.filter(p => p !== param.parameterKey)
                                          : [...prev, param.parameterKey]
                                      );
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        usedParameters.includes(param.parameterKey) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {param.parameterKey} ({param.value}{param.unit})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <p className="text-xs text-muted-foreground">
                        Los parámetros seleccionados aquí estarán disponibles para usar en las elaboraciones de esta receta
                      </p>
                    </div>

                    {usedParameters.length > 0 && (
                      <div className="space-y-2">
                        <Label>Parámetros Seleccionados</Label>
                        <div className="flex flex-wrap gap-2">
                          {usedParameters.map((paramKey) => {
                            const param = recipeParameters.find(p => p.parameterKey === paramKey);
                            return (
                              <div
                                key={paramKey}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
                              >
                                <span>{param?.parameterKey}</span>
                                <span className="text-xs opacity-70">({param?.value}{param?.unit})</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                  onClick={() => setUsedParameters(prev => prev.filter(p => p !== paramKey))}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

          <div className="grid grid-cols-2 gap-4">
            {categories.includes("unidad") && (
              <div className="space-y-2">
                <Label htmlFor="unidad">Cantidad de unidades</Label>
                <Input
                  id="unidad"
                  type="number"
                  min="0.1"
                  step="any"
                  value={unidades}
                  onChange={(e) => setUnidades(Number(e.target.value))}
                  placeholder="Ingrese la cantidad de unidades"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="url">Link/recurso <small>(Opcional)</small></Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ingrese el link o recurso"
              />
            </div>
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
            <Label>Imagen de la receta</Label>
            {image ? (
              <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                <img
                  src={image}
                  alt="Vista previa de receta"
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
                    Click para subir imagen
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

          {/* Elaborations Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Elaboraciones *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addElaboration}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Elaboración
              </Button>
            </div>

            <Accordion type="single" collapsible defaultValue={elaborations[0]?.id} className="space-y-2">
              {elaborations.map((elaboration, elabIndex) => (
                <AccordionItem key={elaboration.id} value={elaboration.id} className="border rounded-lg px-4">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {elaboration.name}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {elaboration.ingredients.length} ingredientes
                        </span>
                      </div>
                    </AccordionTrigger>
                    {elaborations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeElaboration(elaboration.id)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <AccordionContent className="space-y-3 pt-3">
                    <div className="space-y-2">
                      <Label>Nombre de la elaboración</Label>
                      <Input
                        value={elaboration.name}
                        onChange={(e) => updateElaborationName(elaboration.id, e.target.value)}
                        placeholder="Ej: Masa, Relleno, Decoración"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Ingredientes</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addIngredientToElaboration(elaboration.id)}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline">Agregar Ingrediente</span>
                          <span className="sm:hidden">Agregar</span>
                        </Button>
                      </div>

                      {elaboration.ingredients.map((ingredient) => (
                        <div key={ingredient.id} className="flex flex-col sm:flex-row gap-2 items-start p-3 border rounded-lg bg-muted/50">
                          <div className="w-full sm:flex-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between bg-background"
                                >
                                  {ingredient.ingredientId
                                    ? availableIngredients.find((ing) => ing.id === ingredient.ingredientId)?.name + " (" + availableIngredients.find((ing) => ing.id === ingredient.ingredientId)?.units + ")"
                                    : "Seleccionar ingrediente"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar ingrediente..." />
                                  <CommandList>
                                    <CommandEmpty>No se encontró ingrediente.</CommandEmpty>
                                    <CommandGroup>
                                      {availableIngredients.map((ing) => (
                                        <CommandItem
                                          key={ing.id}
                                          value={ing.name}
                                          onSelect={() => updateIngredientInElaboration(elaboration.id, ingredient.id, ing.id)}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              ingredient.ingredientId === ing.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {ing.name} ({ing.units})
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <div className="flex-1 sm:w-28">
                              <Input
                                type="number"
                                min="0.1"
                                step="any"
                                value={ingredient.quantity || ""}
                                onChange={(e) =>
                                  updateIngredientQuantityInElaboration(
                                    elaboration.id,
                                    ingredient.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="Cant"
                                required
                                disabled={!ingredient.ingredientId}
                              />
                            </div>
                            <div className="flex-1 sm:w-24">
                              <Input
                                value={ingredient.units}
                                placeholder="Unidad"
                                disabled
                              />
                            </div>
                            <div className="flex-1 sm:w-28">
                              <Input
                                value={ingredient.cost.toFixed(2)}
                                placeholder="Costo"
                                disabled
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => removeIngredientFromElaboration(elaboration.id, ingredient.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-2 bg-background rounded border">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold">Costo de elaboración:</span>
                        <span className="font-bold text-primary">
                          ₡{elaboration.ingredients.reduce((sum, ing) => sum + ing.cost, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Weight Section for relleno/cubierta */}
          {(categories.includes("relleno") || categories.includes("cubierta")) && (
            <Card>
              <CardHeader>
                <CardTitle>Peso Total Generado</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Define cuánto peso total produce esta receta
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Peso Calculado Automáticamente</Label>
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="text-lg font-bold">{calculateTotalWeight().toFixed(2)} gr</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Suma de ingredientes en gramos
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        id="useManualWeight"
                        checked={useManualWeight}
                        onCheckedChange={(checked) => setUseManualWeight(!!checked)}
                      />
                      <Label htmlFor="useManualWeight" className="cursor-pointer">
                        Ingresar peso manualmente
                      </Label>
                    </div>
                    {useManualWeight && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={totalWeight}
                          onChange={(e) => setTotalWeight(parseFloat(e.target.value) || 0)}
                          placeholder="Ej: 500"
                        />
                        <select
                          value={totalWeightUnit}
                          onChange={(e) => setTotalWeightUnit(e.target.value)}
                          className="border rounded-md px-3 py-2 bg-background"
                        >
                          <option value="gr">gr</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="L">L</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Variations Section */}
          <VariationEditor
            variations={variations}
            onVariationsChange={setVariations}
            baseTotalCost={totalCost}
            baseElaborations={elaborations.filter(e => !e.variationId)}
            availableIngredients={availableIngredients}
          />

          {/* Supplies Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Insumos (Opcional)</Label>
                <p className="text-sm text-muted-foreground mt-1">Agregue insumos necesarios para esta receta</p>
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
                      Escoja un insumo a agregar...
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar insumos..." />
                    <CommandList>
                      <CommandEmpty>
                        {availableSupplies.length === 0
                          ? "No hay insumos disponibles. Agregue insumos primero."
                          : "No se encontró insumo."}
                      </CommandEmpty>
                      <CommandGroup>
                        {availableSupplies.map((supply) => (
                          <CommandItem
                            key={supply.id}
                            value={supply.name}
                            onSelect={() => {
                              const alreadyAdded = selectedSupplies.find(s => s.supplyId === supply.id);
                              if (alreadyAdded) {
                                toast({
                                  title: "Insumo ya agregado",
                                  description: `${supply.name} ya está en la lista.`,
                                  variant: "destructive",
                                });
                                return;
                              }
                              const costPerUnit = supply.cost / supply.quantity;
                              setSelectedSupplies([...selectedSupplies, {
                                supplyId: supply.id,
                                supplyName: supply.name,
                                quantity: 1,
                                unit: supply.unit,
                                costPerUnit: costPerUnit,
                                totalCost: costPerUnit,
                              }]);
                            }}
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
              <div className="space-y-2">
                {selectedSupplies.map((supply) => (
                  <div key={supply.supplyId} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                    <span className="flex-1 font-medium">{supply.supplyName}</span>
                    <Input
                      type="number"
                      min="0.1"
                      step="any"
                      value={supply.quantity}
                      onChange={(e) => {
                        const newQuantity = parseFloat(e.target.value) || 0;
                        setSelectedSupplies(prev =>
                          prev.map(s =>
                            s.supplyId === supply.supplyId
                              ? { ...s, quantity: newQuantity, totalCost: s.costPerUnit * newQuantity }
                              : s
                          )
                        );
                      }}
                      className="w-24 text-center"
                    />
                    <span className="text-sm text-muted-foreground w-16">{supply.unit}</span>
                    <span className="w-24 text-right font-medium">₡{supply.totalCost.toFixed(2)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedSupplies(prev => prev.filter(s => s.supplyId !== supply.supplyId))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            {categories.includes("unidad") ? (
              <>
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Costo total:</Label>
                  <span className="text-2xl font-bold text-primary">
                    ₡{totalCost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Costo por unidad:</Label>
                  <span className="text-2xl font-bold text-primary">
                    ₡{totalUnitCost.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Costo total:</Label>
                <span className="text-2xl font-bold text-primary">
                  ₡{totalCost.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : (recipe ? "Actualizar Receta" : "Crear Receta")}
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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
