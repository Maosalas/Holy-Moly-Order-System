import { Recipe } from "@/types/recipe";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, ChefHat } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

interface RecipePreviewDialogProps {
  recipe: Recipe;
}

export const RecipePreviewDialog = ({ recipe }: RecipePreviewDialogProps) => {
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1);

  const handleMultiplierChange = (value: string) => {
    const multiplier = recipe.multipliers?.find(m => m.size === value);
    setSelectedMultiplier(multiplier?.multiplier || 1);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Preview">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {recipe.image && (
            <div className="w-full h-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={recipe.image}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Categoría</Label>
              <p className="font-semibold capitalize">{recipe.category}</p>
            </div>
            {recipe.units && recipe.units > 0 && (
              <div>
                <Label className="text-muted-foreground">Unidades</Label>
                <p className="font-semibold">{recipe.units}</p>
              </div>
            )}
          </div>

          {recipe.notes && (
            <div>
              <Label className="text-muted-foreground">Notas</Label>
              <p className="text-sm mt-1">{recipe.notes}</p>
            </div>
          )}

          {recipe.url && (
            <div>
              <Label className="text-muted-foreground">Recurso/Link</Label>
              <a
                href={recipe.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline block mt-1"
              >
                {recipe.url}
              </a>
            </div>
          )}

          {recipe.multipliers && recipe.multipliers.length > 0 && (
            <div className="space-y-2">
              <Label>Tamaño</Label>
              <Select onValueChange={handleMultiplierChange} defaultValue={recipe.multipliers[1]?.size || recipe.multipliers[0]?.size}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un tamaño" />
                </SelectTrigger>
                <SelectContent>
                  {recipe.multipliers.map((multiplier) => (
                    <SelectItem key={multiplier.size} value={multiplier.size} className="capitalize">
                      {multiplier.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-lg font-semibold">Elaboraciones</Label>
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
              <p className="text-sm text-muted-foreground">No hay elaboraciones definidas</p>
            )}
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Costo Total:</Label>
              <span className="text-2xl font-bold text-primary">
                ₡{(recipe.totalCost * selectedMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {recipe.category === "unidad" && recipe.unitCost && (
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
