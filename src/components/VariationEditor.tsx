import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipeVariation, RecipeElaboration, ElaborationType } from "@/types/recipe";
import { RecipeParameter } from "@/types/recipe-parameter";
import { Ingredient } from "@/types/ingredient";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ElaborationEditor } from "./ElaborationEditor";

function getUUID() {
  return crypto.randomUUID();
}

interface VariationEditorProps {
  variations: RecipeVariation[];
  onVariationsChange: (variations: RecipeVariation[]) => void;
  availableIngredients: Ingredient[];
  availableParameters: RecipeParameter[];
}

export function VariationEditor({
  variations,
  onVariationsChange,
  availableIngredients,
  availableParameters,
}: VariationEditorProps) {
  const addVariation = () => {
    const newVariation: RecipeVariation = {
      id: getUUID(),
      recipeId: "",
      name: `Variación ${variations.length + 1}`,
      description: "",
      isDefault: variations.length === 0,
      orderNumber: variations.length + 1,
      elaborations: [],
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
      variations.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const updateVariationElaborations = (id: string, elaborations: RecipeElaboration[]) => {
    updateVariation(id, { elaborations });
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
        <CardTitle>Variaciones de la Receta</CardTitle>
        <Button type="button" onClick={addVariation} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Variación
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {variations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No hay variaciones. Las elaboraciones base se aplicarán a todos los productos.</p>
            <p className="text-sm mt-2">
              Agrega variaciones si tu receta tiene diferentes rellenos, coberturas o decoraciones.
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
                        placeholder="Ej: Pavlova con Chocolate"
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

                  <div className="space-y-3">
                    <Label className="text-base">
                      Elaboraciones de esta Variación
                    </Label>
                    <ElaborationEditor
                      elaborations={variation.elaborations}
                      onElaborationsChange={(elaborations) =>
                        updateVariationElaborations(variation.id, elaborations)
                      }
                      availableIngredients={availableIngredients}
                      availableParameters={availableParameters}
                      variationId={variation.id}
                    />
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
