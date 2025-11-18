import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, Check, ChevronsUpDown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipeVariation, RecipeElaboration } from "@/types/recipe";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useRecipeParameters } from "@/hooks/use-recipe-parameters";

function getUUID() {
  return crypto.randomUUID();
}

interface VariationEditorProps {
  variations: RecipeVariation[];
  onVariationsChange: (variations: RecipeVariation[]) => void;
  baseTotalCost: number; // Costo base de la receta para calcular costos de variaciones
  baseElaborations: RecipeElaboration[]; // Elaboraciones base (variationId = null) disponibles para seleccionar
}

export function VariationEditor({
  variations,
  onVariationsChange,
  baseTotalCost,
  baseElaborations,
}: VariationEditorProps) {
  const { data: recipeParameters = [] } = useRecipeParameters();
  const addVariation = () => {
    const newVariation: RecipeVariation = {
      id: getUUID(),
      recipeId: "",
      name: `Variación ${variations.length + 1}`,
      description: "",
      isDefault: variations.length === 0,
      orderNumber: variations.length + 1,
      units: 1,
      ingredientMultiplier: 1,
      usedParameters: [],           // Parámetros globales de esta variación
      baseElaborationIds: [],       // IDs de elaboraciones base a incluir
      elaborations: [],             // Elaboraciones propias de la variación
      totalCost: baseTotalCost,
      unitCost: baseTotalCost,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    onVariationsChange([...variations, newVariation]);
  };

  const removeVariation = (id: string) => {
    onVariationsChange(variations.filter((v) => v.id !== id));
  };

  const updateVariation = (id: string, updates: Partial<RecipeVariation>) => {
    onVariationsChange(
      variations.map((v) => {
        if (v.id === id) {
          const updated = { ...v, ...updates };
          // Recalcular costos automáticamente
          updated.totalCost = baseTotalCost * updated.ingredientMultiplier;
          updated.unitCost = updated.units > 0 ? updated.totalCost / updated.units : 0;
          return updated;
        }
        return v;
      })
    );
  };

  const toggleDefault = (id: string) => {
    onVariationsChange(
      variations.map((v) => ({
        ...v,
        isDefault: v.id === id,
      }))
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Variaciones (Tamaños/Cantidades)</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Define diferentes tamaños que producen distintas cantidades de unidades
          </p>
        </div>
        <Button type="button" onClick={addVariation} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Variación
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {variations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>No hay variaciones definidas.</p>
            <p className="text-sm mt-2">
              Agrega variaciones para producir diferentes cantidades (Mini, Normal, Grande, etc.)
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {variations.map((variation, index) => (
              <AccordionItem key={variation.id} value={variation.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{variation.name}</span>
                    {variation.isDefault && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        Predeterminada
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto mr-4">
                      {variation.units} unidades • ₡{variation.unitCost?.toFixed(2)}/unidad
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre de la Variación</Label>
                      <Input
                        value={variation.name}
                        onChange={(e) =>
                          updateVariation(variation.id, { name: e.target.value })
                        }
                        placeholder="Ej: Mini, Normal, Grande"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción (Opcional)</Label>
                      <Input
                        value={variation.description || ""}
                        onChange={(e) =>
                          updateVariation(variation.id, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Breve descripción"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unidades que Produce</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={variation.units}
                        onChange={(e) =>
                          updateVariation(variation.id, {
                            units: parseInt(e.target.value) || 1,
                          })
                        }
                        placeholder="Ej: 6, 12, 24"
                      />
                      <p className="text-xs text-muted-foreground">
                        Cantidad de piezas/porciones que produce esta variación
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Multiplicador de Ingredientes</Label>
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={variation.ingredientMultiplier}
                        onChange={(e) =>
                          updateVariation(variation.id, {
                            ingredientMultiplier: parseFloat(e.target.value) || 1,
                          })
                        }
                        placeholder="Ej: 0.5, 1, 2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Factor para calcular cantidades de ingredientes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`default-${variation.id}`}
                      checked={variation.isDefault}
                      onCheckedChange={() => toggleDefault(variation.id)}
                    />
                    <Label
                      htmlFor={`default-${variation.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      Usar como variación predeterminada
                    </Label>
                  </div>

                  {/* Parámetros Globales */}
                  {recipeParameters.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label>Parámetros Globales para esta Variación <small>(Opcional)</small></Label>
                      <p className="text-sm text-muted-foreground">
                        Selecciona los parámetros que esta variación utiliza (ej: Relleno Mini, Crema Pequeña)
                      </p>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                          >
                            {(variation.usedParameters?.length || 0) > 0
                              ? `${variation.usedParameters?.length} parámetro${(variation.usedParameters?.length || 0) > 1 ? 's' : ''} seleccionado${(variation.usedParameters?.length || 0) > 1 ? 's' : ''}`
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
                                      const currentParams = variation.usedParameters || [];
                                      const newParams = currentParams.includes(param.parameterKey)
                                        ? currentParams.filter(p => p !== param.parameterKey)
                                        : [...currentParams, param.parameterKey];
                                      updateVariation(variation.id, { usedParameters: newParams });
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        variation.usedParameters?.includes(param.parameterKey) ? "opacity-100" : "opacity-0"
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

                      {variation.usedParameters && variation.usedParameters.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {variation.usedParameters.map((paramKey) => {
                            const param = recipeParameters.find(p => p.parameterKey === paramKey);
                            return (
                              <div
                                key={paramKey}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
                              >
                                <span>{param?.parameterKey}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                  onClick={() => {
                                    const newParams = variation.usedParameters?.filter(p => p !== paramKey) || [];
                                    updateVariation(variation.id, { usedParameters: newParams });
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Elaboraciones BASE para incluir en esta variación */}
                  {baseElaborations.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label>Elaboraciones Base a Incluir <small>(Requerido: min 1)</small></Label>
                      <p className="text-sm text-muted-foreground">
                        Selecciona qué elaboraciones base se incluyen en el cálculo de esta variación
                      </p>

                      <div className="space-y-2">
                        {baseElaborations.map((elab) => {
                          // Safety checks to prevent crashes
                          if (!elab || !elab.id) {
                            console.error('Invalid elaboration:', elab);
                            return null;
                          }

                          const isSelected = variation.baseElaborationIds?.includes(elab.id) || false;
                          const ingredients = elab.ingredients || [];
                          const elaborationCost = ingredients.reduce((sum, ing) => sum + (ing?.cost || 0), 0);

                          return (
                            <div
                              key={elab.id}
                              className={cn(
                                "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                                isSelected
                                  ? "bg-primary/10 border-primary"
                                  : "hover:bg-muted"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentIds = variation.baseElaborationIds || [];
                                  const newIds = checked
                                    ? [...currentIds, elab.id]
                                    : currentIds.filter(id => id !== elab.id);
                                  updateVariation(variation.id, { baseElaborationIds: newIds });
                                }}
                              />
                              <div 
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                  const currentIds = variation.baseElaborationIds || [];
                                  const newIds = isSelected
                                    ? currentIds.filter(id => id !== elab.id)
                                    : [...currentIds, elab.id];
                                  updateVariation(variation.id, { baseElaborationIds: newIds });
                                }}
                              >
                                <div className="font-medium">{elab.name || 'Sin nombre'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {ingredients.length} ingrediente{ingredients.length !== 1 ? 's' : ''} • ₡{elaborationCost.toFixed(2)}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {(!variation.baseElaborationIds || variation.baseElaborationIds.length === 0) &&
                       (!variation.elaborations || variation.elaborations.length === 0) && (
                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                          ⚠️ Cada variación debe tener al menos 1 elaboración (base o propia)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cálculo automático de costos */}
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Costo Total:</span>
                      <span className="text-lg font-bold text-primary">
                        ₡{variation.totalCost?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Costo por Unidad:</span>
                      <span className="text-lg font-bold text-primary">
                        ₡{variation.unitCost?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      Cálculo: Costo base (₡{baseTotalCost.toFixed(2)}) × Multiplicador (
                      {variation.ingredientMultiplier}) ÷ Unidades ({variation.units})
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeVariation(variation.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Variación
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
