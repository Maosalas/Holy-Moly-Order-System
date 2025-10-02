import { Recipe } from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2 } from "lucide-react";

interface RecipeListProps {
  recipes: Recipe[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

export const RecipeList = ({ recipes, onEdit, onDelete }: RecipeListProps) => {
  if (recipes.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">No recipes yet</p>
            <p className="text-sm mt-2">Create your first recipe to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Recipe List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe Name</TableHead>
                <TableHead>Ingredients</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{recipe.name}</TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? "s" : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    ${recipe.totalCost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(recipe)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(recipe.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
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
