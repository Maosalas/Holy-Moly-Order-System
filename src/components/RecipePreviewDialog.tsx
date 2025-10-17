import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, ChefHat, Package } from "lucide-react";
import { Recipe } from "@/types/recipe";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

interface RecipePreviewDialogProps {
  recipe: Recipe;
}


export const RecipePreviewDialog = ({ recipe }: RecipePreviewDialogProps) => {

  const [selected, setSelected] = useState("1X");

  const options = ["0.5X", "1X", "2X", "4X"];
  const multiplier = parseFloat(selected.replace("X", ""));
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Preview Recipe">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Receta {recipe.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipe Image */}
          <div className="space-y-2">
            {recipe.image ? (
              <div className="w-full h-64 rounded-lg overflow-hidden border">
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-64 rounded-lg border bg-muted flex items-center justify-center">
                <ChefHat className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Recipe Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Nombre</h3>
              <p className="text-2xl font-bold">{recipe.name}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Categoria</h3>
              <p className="text-2xl font-bold">{recipe.units} {recipe.category ?? "Sin categoria"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Notas</h3>
              <p className="whitespace-pre-wrap">{recipe.notes || "No hay notas"}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Link/recurso</h3>
              <p className="whitespace-pre-wrap"><a className="whitespace-pre-wrap" href={recipe.url}>{recipe.url || "No hay link/recurso"}</a></p>
            </div>
          </div>
          {/* Ingredients List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-muted-foreground">Ingredients</h3>
              </div>

              <div className="inline-flex border border-gray-300 rounded-full overflow-hidden">
                {options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelected(option)}
                    className={`px-4 py-0 font-semibold text-lg transition-all 
          ${selected === option
                        ? "bg-orange-100 text-black border-r border-gray-300"
                        : "bg-white text-gray-600 hover:bg-gray-100 border-r border-gray-300"
                      } 
          ${option === "4X" ? "border-r-0" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Ingredient</TableHead>
                    <TableHead className="font-semibold">Quantity</TableHead>
                    <TableHead className="font-semibold">Unit</TableHead>
                    <TableHead className="text-right font-semibold">Cost</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {recipe.ingredients.map((ingredient) => (
                    <TableRow key={ingredient.id}>
                      <TableCell className="font-medium">
                        {ingredient.ingredientName}
                      </TableCell>
                      <TableCell>
                        {(ingredient.quantity * multiplier).toLocaleString("en-US", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ingredient.units}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₡
                        {(ingredient.cost * multiplier).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Total Cost */}
          {recipe.category === "unidad" ? (
            <div className="grid grid-rows-2 grid-cols-1 space-y-2 pt-4">

              <div className="bg-muted p-4 rounded-lg">

                <div className="grid grid-cols-2 grid-rows-1 gap-4 ">

                  <h3 className="font-semibold text-lg">Costo total</h3>
                  <span className="text-3xl font-bold text-primary justify-self-end">
                    ₡{recipe.totalCost.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>

                </div>

                <div className="grid grid-cols-2 grid-rows-1 gap-4">
                  <h3 className="font-semibold text-lg">Total por unidad</h3>
                  <span className="text-3xl font-bold text-primary justify-self-end">
                    {recipe.unitCost === null ? <Badge className="ml-2">No definido</Badge> : `₡${recipe.unitCost.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}`}
                  </span>
                </div>

              </div>
            </div>
          ) :
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-lg">Costo total</h3>
                <span className="text-3xl font-bold text-primary">
                  ₡{recipe.totalCost.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          }
        </div>
      </DialogContent>
    </Dialog>
  );
};
