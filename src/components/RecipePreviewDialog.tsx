import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, ChefHat, Package } from "lucide-react";
import { Recipe } from "@/types/recipe";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RecipePreviewDialogProps {
  recipe: Recipe;
}

export const RecipePreviewDialog = ({ recipe }: RecipePreviewDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Preview Recipe">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Recipe Preview</DialogTitle>
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
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Recipe Name</h3>
            <p className="text-2xl font-bold">{recipe.name}</p>
          </div>

          {/* Ingredients List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm text-muted-foreground">Ingredients</h3>
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
                      <TableCell>{ingredient.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {ingredient.units}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₡{ingredient.cost.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Total Cost */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
              <h3 className="font-semibold text-lg">Total Recipe Cost</h3>
              <span className="text-3xl font-bold text-primary">
                ₡{recipe.totalCost.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
