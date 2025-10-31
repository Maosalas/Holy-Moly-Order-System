import { Recipe } from "@/types/recipe";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, ChefHat, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Label } from "./ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { cn } from "@/lib/utils";
import { migrateRecipeToElaborations } from "@/lib/recipeUtils";

interface RecipePreviewDialogProps {
  recipe: Recipe;
}

export const RecipePreviewDialog = ({ recipe }: RecipePreviewDialogProps) => {
  // Aplicar migración si es necesario
  const migratedRecipe = migrateRecipeToElaborations(recipe);
  
  const multiplierOptions = [0.5, 1,1.5, 2, 4];
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Preview">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{migratedRecipe.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {migratedRecipe.image && (
            <div className="w-full h-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={migratedRecipe.image}
                alt={migratedRecipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground text-sm">Nombre</Label>
              <p className="font-bold text-xl mt-1">{migratedRecipe.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Categoría</Label>
              <p className="font-bold text-xl mt-1 capitalize">{migratedRecipe.category}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground text-sm">Notas</Label>
              <p className="text-sm mt-1">{migratedRecipe.notes || "No hay notas"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Link/recurso</Label>
              {migratedRecipe.url ? (
                <a
                  href={migratedRecipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline block mt-1"
                >
                  {migratedRecipe.url}
                </a>
              ) : (
                <p className="text-sm mt-1">No hay link/recurso</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {multiplierOptions.map((multiplier) => (
              <Button
                key={multiplier}
                variant={selectedMultiplier === multiplier ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMultiplier(multiplier)}
                className={cn(
                  "min-w-[60px]",
                  selectedMultiplier === multiplier && "font-bold"
                )}
              >
                {multiplier}X
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-5 w-5" />
              <Label className="text-base font-semibold">Ingredientes</Label>
            </div>
            {migratedRecipe.elaborations && migratedRecipe.elaborations.length > 0 ? (
            <Accordion type="single" collapsible defaultValue={migratedRecipe.elaborations[0]?.id} className="space-y-2">
              {migratedRecipe.elaborations.map((elaboration) => (
                <AccordionItem key={elaboration.id} value={elaboration.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{elaboration.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {elaboration.ingredients.length} ingrediente{elaboration.ingredients.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingrediente</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead className="text-right">Unidad</TableHead>
                            <TableHead className="text-right">Costo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {elaboration.ingredients.map((ingredient) => (
                            <TableRow key={ingredient.id}>
                              <TableCell className="font-medium">{ingredient.ingredientName}</TableCell>
                              <TableCell className="text-right">
                                {(ingredient.quantity * selectedMultiplier).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">{ingredient.units}</TableCell>
                              <TableCell className="text-right">
                                ₡{(ingredient.cost * selectedMultiplier).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={3} className="font-semibold">
                              Subtotal de elaboración
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ₡{(elaboration.ingredients.reduce((sum, ing) => sum + ing.cost, 0) * selectedMultiplier).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground">No hay elaboraciones definidas</p>
            )}
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Costo Total:</Label>
              <span className="text-2xl font-bold text-primary">
                ₡{(migratedRecipe.totalCost * selectedMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {migratedRecipe.category === "unidad" && migratedRecipe.unitCost && (
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Costo por Unidad:</Label>
                <span className="text-2xl font-bold text-primary">
                  ₡{(migratedRecipe.unitCost * selectedMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
