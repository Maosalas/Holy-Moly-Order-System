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
  // Obtener la categoría principal para mostrar en el icono
  const primaryCategory = recipe.categories?.[0] || "otro";

  // Formatear el nombre de la categoría
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      queque: "Queque",
      relleno: "Relleno",
      cubierta: "Cubierta",
      unidad: "Unidad",
      otro: "Otro",
    };
    return labels[category] || category;
  };

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
          <div className="flex flex-col items-center gap-2">
            <ChefHat className="h-16 w-16 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {getCategoryLabel(primaryCategory)}
            </span>
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="text-lg">{recipe.name}</CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>
            {recipe.elaborations?.length || 0} elaboración{(recipe.elaborations?.length || 0) !== 1 ? "es" : ""} base
          </div>
          {recipe.variations && recipe.variations.length > 0 && (
            <div className="font-medium text-primary">
              {recipe.variations.length} variación{recipe.variations.length !== 1 ? "es" : ""}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">
          ₡{recipe.totalCost.toLocaleString()}
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
