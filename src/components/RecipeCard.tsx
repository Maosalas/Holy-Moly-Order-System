import { Recipe } from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, ChefHat } from "lucide-react";
import { migrateRecipeToElaborations } from "@/lib/recipeUtils";

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

export const RecipeCard = ({ recipe, onEdit, onDelete }: RecipeCardProps) => {
  // Aplicar migración si es necesario
  const migratedRecipe = migrateRecipeToElaborations(recipe);
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
        {migratedRecipe.image ? (
          <img 
            src={migratedRecipe.image} 
            alt={migratedRecipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ChefHat className="h-16 w-16 text-muted-foreground" />
        )}
      </div>
      <CardHeader>
        <CardTitle className="text-lg">{migratedRecipe.name}</CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>
            {migratedRecipe.elaborations?.length || 0} elaboración{(migratedRecipe.elaborations?.length || 0) !== 1 ? "es" : ""} base
          </div>
          {migratedRecipe.variations && migratedRecipe.variations.length > 0 && (
            <div className="font-medium text-primary">
              {migratedRecipe.variations.length} variación{migratedRecipe.variations.length !== 1 ? "es" : ""}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">
          ₡{migratedRecipe.totalCost.toLocaleString()}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(migratedRecipe)}
          className="flex-1 gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(migratedRecipe.id)}
          className="flex-1 gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};
