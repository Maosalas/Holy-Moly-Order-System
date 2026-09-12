import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, GripVertical } from "lucide-react";
import { RecipeElaboration, RecipeIngredient } from "@/types/recipe";
import { Ingredient } from "@/types/ingredient";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

function getUUID() {
  return crypto.randomUUID();
}

interface ElaborationEditorProps {
  elaborations: RecipeElaboration[];
  onElaborationsChange: (elaborations: RecipeElaboration[]) => void;
  availableIngredients: Ingredient[];
}

export function ElaborationEditor({
  elaborations,
  onElaborationsChange,
  availableIngredients,
}: ElaborationEditorProps) {
  const addElaboration = () => {
    const newElaboration: RecipeElaboration = {
      id: getUUID(),
      name: `Elaboración ${elaborations.length + 1}`,
      order: elaborations.length + 1,
      cost: 0,              // Inicializar costo en 0
      variationId: null,    // null = elaboración común a todas las variaciones
      ingredients: [],
    };
    onElaborationsChange([...elaborations, newElaboration]);
  };

  const removeElaboration = (id: string) => {
    if (elaborations.length === 1) {
      return; // Must have at least one elaboration
    }
    onElaborationsChange(elaborations.filter((e) => e.id !== id));
  };

  const updateElaboration = (id: string, updates: Partial<RecipeElaboration>) => {
    onElaborationsChange(
      elaborations.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const addIngredient = (elaborationId: string) => {
    const newIngredient: RecipeIngredient = {
      id: getUUID(),
      ingredientId: "",
      ingredientName: "",
      quantity: 0,
      units: "",
      cost: 0,
    };
    onElaborationsChange(
      elaborations.map((e) =>
        e.id === elaborationId
          ? { ...e, ingredients: [...e.ingredients, newIngredient] }
          : e
      )
    );
  };

  const removeIngredient = (elaborationId: string, ingredientId: string) => {
    onElaborationsChange(
      elaborations.map((e) =>
        e.id === elaborationId
          ? { ...e, ingredients: e.ingredients.filter((i) => i.id !== ingredientId) }
          : e
      )
    );
  };

  const updateIngredient = (
    elaborationId: string,
    ingredientId: string,
    selectedIngredientId: string
  ) => {
    const selectedIngredient = availableIngredients.find(
      (i) => i.id === selectedIngredientId
    );
    if (!selectedIngredient) return;

    onElaborationsChange(
      elaborations.map((e) =>
        e.id === elaborationId
          ? {
              ...e,
              ingredients: e.ingredients.map((ing) =>
                ing.id === ingredientId
                  ? {
                      ...ing,
                      ingredientId: selectedIngredient.id,
                      ingredientName: selectedIngredient.name,
                      units: selectedIngredient.units,
                      cost: 0,
                    }
                  : ing
              ),
            }
          : e
      )
    );
  };

  const updateIngredientQuantity = (
    elaborationId: string,
    ingredientId: string,
    quantity: number
  ) => {
    onElaborationsChange(
      elaborations.map((e) =>
        e.id === elaborationId
          ? {
              ...e,
              ingredients: e.ingredients.map((ing) => {
                if (ing.id === ingredientId) {
                  const baseIngredient = availableIngredients.find(
                    (i) => i.id === ing.ingredientId
                  );
                  if (!baseIngredient) return ing;

                  const cost =
                    (quantity / (baseIngredient.qtyProvider || 1)) * (baseIngredient.cost || 0);
                  return { ...ing, quantity, cost };
                }
                return ing;
              }),
            }
          : e
      )
    );
  };

  return (
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
        {elaborations.map((elaboration) => (
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
                <Label>Nombre de la elaboración </Label>
                <Input
                  value={elaboration.name}
                  onChange={(e) => updateElaboration(elaboration.id, { name: e.target.value })}
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
                    onClick={() => addIngredient(elaboration.id)}
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
                                    onSelect={() => updateIngredient(elaboration.id, ingredient.id, ing.id)}
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
                            updateIngredientQuantity(
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
                        onClick={() => removeIngredient(elaboration.id, ingredient.id)}
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
  );
}
