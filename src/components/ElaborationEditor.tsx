import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X } from "lucide-react";
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
                    (quantity / baseIngredient.qtyProvider) * baseIngredient.cost;
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
      {elaborations.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>No hay elaboraciones. Agrega al menos una.</p>
        </div>
      ) : (
        <Accordion type="multiple" className="w-full">
          {elaborations.map((elaboration, index) => (
            <AccordionItem key={elaboration.id} value={elaboration.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{elaboration.name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={elaboration.name}
                    onChange={(e) =>
                      updateElaboration(elaboration.id, { name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Ingredientes</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addIngredient(elaboration.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ingrediente
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {elaboration.ingredients.map((ingredient) => (
                      <div
                        key={ingredient.id}
                        className="flex items-center gap-2 p-2 border rounded"
                      >
                        <div className="flex-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {ingredient.ingredientName || "Seleccionar ingrediente"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar ingrediente..." />
                                <CommandList>
                                  <CommandEmpty>No se encontró ingrediente.</CommandEmpty>
                                  <CommandGroup>
                                    {availableIngredients.map((ing) => (
                                      <CommandItem
                                        key={ing.id}
                                        value={ing.name}
                                        onSelect={() =>
                                          updateIngredient(
                                            elaboration.id,
                                            ingredient.id,
                                            ing.id
                                          )
                                        }
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            ingredient.ingredientId === ing.id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {ing.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={ingredient.quantity || ""}
                          onChange={(e) =>
                            updateIngredientQuantity(
                              elaboration.id,
                              ingredient.id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="Cantidad"
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground w-12">
                          {ingredient.units}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeIngredient(elaboration.id, ingredient.id)
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeElaboration(elaboration.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar Elaboración
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      <Button type="button" onClick={addElaboration} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Agregar Elaboración
      </Button>
    </div>
  );
}
