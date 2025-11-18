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

interface RecipePreviewDialogProps {
  recipe: Recipe;
}

export const RecipePreviewDialog = ({ recipe }: RecipePreviewDialogProps) => {
  const multiplierOptions = [0.5, 1, 1.5, 2, 4];
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
          <DialogTitle className="text-2xl font-bold">{recipe.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {recipe.image && (
            <div className="w-full h-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={recipe.image}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground text-sm">Nombre</Label>
              <p className="font-bold text-xl mt-1">{recipe.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Categorías</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {(recipe.categories || [(recipe as any).category]).map((cat, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium capitalize">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground text-sm">Notas</Label>
              <p className="text-sm mt-1">{recipe.notes || "No hay notas"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Link/recurso</Label>
              {recipe.url ? (
                <a
                  href={recipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline block mt-1"
                >
                  {recipe.url}
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
              <Label className="text-base font-semibold">Elaboraciones Base</Label>
            </div>
            {recipe.elaborations && recipe.elaborations.length > 0 ? (
              <Accordion type="single" collapsible defaultValue={recipe.elaborations[0]?.id} className="space-y-2">
                {recipe.elaborations.map((elaboration) => (
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
              <p className="text-sm text-muted-foreground">No hay elaboraciones base definidas</p>
            )}
          </div>

          {recipe.variations && recipe.variations.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ChefHat className="h-5 w-5" />
                <Label className="text-base font-semibold">Variaciones ({recipe.variations.length})</Label>
              </div>
              <Accordion type="single" collapsible className="space-y-2">
                {recipe.variations.map((variation) => (
                  <AccordionItem key={variation.id} value={variation.id} className="border rounded-lg px-4 bg-primary/5">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">{variation.name}</span>
                          {variation.isDefault && (
                            <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {variation.elaborations?.length || 0} elaboración{(variation.elaborations?.length || 0) !== 1 ? 'es' : ''}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {variation.description && (
                        <p className="text-sm text-muted-foreground mb-3">{variation.description}</p>
                      )}
                      {variation.elaborations && variation.elaborations.length > 0 ? (
                        <div className="space-y-2">
                          {variation.elaborations.map((elaboration) => (
                            <div key={elaboration.id} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{elaboration.name}</span>
                              </div>
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
                                      <TableCell colSpan={3} className="font-semibold text-sm">
                                        Subtotal
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        ₡{(elaboration.ingredients.reduce((sum, ing) => sum + ing.cost, 0) * selectedMultiplier).toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          ))}
                          {variation.totalCost !== undefined && (
                            <div className="flex justify-between items-center pt-2 border-t">
                              <Label className="font-semibold">Costo Total Variación:</Label>
                              <span className="text-xl font-bold text-primary">
                                ₡{(variation.totalCost * selectedMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No hay elaboraciones en esta variación</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Costo Total:</Label>
              <span className="text-2xl font-bold text-primary">
                ₡{(recipe.totalCost * selectedMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {(recipe.categories || [(recipe as any).category]).includes("unidad") && recipe.unitCost && (
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Costo por Unidad:</Label>
                <span className="text-2xl font-bold text-primary">
                  ₡{(recipe.unitCost * selectedMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
