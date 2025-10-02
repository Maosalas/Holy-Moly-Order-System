import { Recipe } from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, ChefHat } from "lucide-react";

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

export const RecipeCard = ({ recipe, onEdit, onDelete }: RecipeCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
        {recipe.image ? (
          <img 
            src={recipe.image} 
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ChefHat className="h-16 w-16 text-muted-foreground" />
        )}
      </div>
      <CardHeader>
        <CardTitle className="text-lg">{recipe.name}</CardTitle>
        <div className="text-sm text-muted-foreground">
          {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? "s" : ""}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">
          ${recipe.totalCost.toFixed(2)}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(recipe)}
          className="flex-1 gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(recipe.id)}
          className="flex-1 gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};
