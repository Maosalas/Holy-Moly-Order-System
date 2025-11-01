import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Upload, ImageIcon, Check, ChevronsUpDown, Tag, Divide, GripVertical, Trash2 } from "lucide-react";
import { Recipe, RecipeIngredient, RecipeFormData, Category, RecipeMultiplier, RecipeElaboration } from "@/types/recipe";
import { Ingredient } from "@/types/ingredient";
import { toast } from "@/hooks/use-toast";
import { ingredientsApi } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Textarea } from "./ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { migrateRecipeToElaborations } from "@/lib/recipeUtils";

interface RecipeFormProps {
  recipe?: Recipe;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
}

export const RecipeForm = ({ recipe, onSubmit, onCancel }: RecipeFormProps) => {
  // Aplicar migración si la receta existe y lo necesita
  const migratedRecipe = recipe ? migrateRecipeToElaborations(recipe) : undefined;
  
  const [name, setName] = useState(migratedRecipe?.name || "");
  const [category, setCategory] = useState(migratedRecipe?.category || "unidad");
  const [notes, setNotes] = useState(migratedRecipe?.notes || "");
  const [url, setUrl] = useState(migratedRecipe?.url || "");
  const [unidades, setUnidades] = useState(migratedRecipe?.units || 0);
  const [image, setImage] = useState(migratedRecipe?.image || "");

  // Set default images for relleno and cubierta when category changes
  useEffect(() => {
    if (!migratedRecipe && !image) {
      if (category === 'relleno') {
        setImage('/src/assets/temp_relleno.png');
      } else if (category === 'cubierta') {
        setImage('/src/assets/temp_cubierta.png');
      }
    }
  }, [category, migratedRecipe, image]);
  const [elaborations, setElaborations] = useState<RecipeElaboration[]>(
    migratedRecipe?.elaborations && migratedRecipe.elaborations.length > 0
      ? migratedRecipe.elaborations
      : [{
          id: getUUID(),
          name: "Elaboración principal",
          order: 1,
          ingredients: []
        }]
  );
  const [multipliers, setMultipliers] = useState<RecipeMultiplier[]>(
    migratedRecipe?.multipliers || []
  );
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default sizes for multipliers
  const defaultSizes = ["mini", "pequeño", "mediano", "grande"];

  // Initialize multipliers when category changes to queque, relleno, or cubierta
  useEffect(() => {
    if (["queque", "relleno", "cubierta"].includes(category)) {
      if (multipliers.length === 0) {
        setMultipliers(
          defaultSizes.map((size) => ({
            id: getUUID(),
            size,
            multiplier: 1.0,
          }))
        );
      }
    } else {
      setMultipliers([]);
    }
  }, [category]);

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

  const calculateTotalCost = () => {
    return elaborations.reduce((total, elab) => {
      return total + elab.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    }, 0);
  };

  // Elaboration management
  const addElaboration = () => {
    const newElaboration: RecipeElaboration = {
      id: getUUID(),
      name: `Elaboración ${elaborations.length + 1}`,
      order: elaborations.length + 1,
      ingredients: []
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

    try {
      await onSubmit({
        name: name.trim(),
        image: image || undefined,
        elaborations: elaborations,
        multipliers: multipliers.length > 0 ? multipliers : undefined,
        totalCost,
        category: category,
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {category === "queque" ? "Queque" : category === "relleno" ? "Relleno" : category === "cubierta" ? "Cubierta" : category === "unidad" ? "Unidad" : "Otro"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar categoría..." />
                    <CommandList>
                      <CommandEmpty>No se encontró categoría.</CommandEmpty>
                      <CommandGroup>
                        {[
                          { value: "queque", label: "Queque" },
                          { value: "relleno", label: "Relleno" },
                          { value: "cubierta", label: "Cubierta" },
                          { value: "unidad", label: "Unidad" },
                          { value: "otro", label: "Otro" },
                        ].map((cat) => (
                          <CommandItem
                            key={cat.value}
                            value={cat.value}
                            onSelect={() => setCategory(cat.value as Category)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                category === cat.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {cat.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {category === "unidad" && (
              <div className="space-y-2">
                <Label htmlFor="unidad">Cantidad de unidades</Label>
                <Input
                  id="unidad"
                  type="number"
                  min="0"
                  step="1"
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

          {["queque", "relleno", "cubierta"].includes(category) && (
            <div className="space-y-3">
              <Label className="text-lg font-semibold">
                Multiplicadores por tamaño
              </Label>
              <div className="grid grid-cols-2 gap-4">
                {multipliers.map((multiplier, index) => (
                  <div key={multiplier.id || index} className="space-y-2">
                    <Label htmlFor={`multiplier-${index}`} className="capitalize">
                      {multiplier.size}
                    </Label>
                    <Input
                      id={`multiplier-${index}`}
                      type="number"
                      min="0"
                      step="0.1"
                      value={multiplier.multiplier}
                      onChange={(e) => {
                        const newMultipliers = [...multipliers];
                        newMultipliers[index] = {
                          ...newMultipliers[index],
                          multiplier: parseFloat(e.target.value) || 0,
                        };
                        setMultipliers(newMultipliers);
                      }}
                      placeholder="Multiplicador"
                      required
                    />
                    <div className="flex justify-between items-center">
                      <Label className="text-lg font-semibold">Costo total:</Label>
                      <span className="text-2xl font-bold text-primary">
                        ₡{Math.round(totalCost * multiplier.multiplier).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        <span className="font-semibold">
                          {elaboration.name} ({elaboration.ingredients.length} ingredientes)
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
                                min="0"
                                step="0.01"
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

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            {category === "unidad" || category === undefined ? (
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
