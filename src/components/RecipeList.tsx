import { Recipe } from "@/types/recipe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChefHat } from "lucide-react";
import { RecipePreviewDialog } from "./RecipePreviewDialog";

interface RecipeListProps {
  recipes: Recipe[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export const RecipeList = ({ recipes, onEdit, onDelete, isDeleting }: RecipeListProps) => {
  if (recipes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No recipes yet</CardTitle>
          <CardDescription>Create your first recipe to get started</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recipe Collection</CardTitle>
        <CardDescription>All your saved recipes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Receta</TableHead>
                <TableHead className="font-semibold">Ingredientes</TableHead>
                <TableHead className="font-semibold">Costo Total</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        {recipe.image ? (
                          <img
                            src={recipe.image}
                            alt={recipe.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ChefHat className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-semibold">{recipe.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{recipe.ingredients.length}</span>
                      <span className="text-muted-foreground ml-1">
                        ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-primary text-lg">
                      ₡{recipe.totalCost.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium ml-1">
                      {recipe.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <RecipePreviewDialog recipe={recipe} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(recipe)}
                        title="Edit"
                        disabled={isDeleting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(recipe.id)}
                        title="Delete"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
