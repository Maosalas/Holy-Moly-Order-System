import { Recipe, RecipeElaboration } from "@/types/recipe";

/**
 * Migra recetas antiguas (con ingredients directo) a la nueva estructura (con elaborations)
 */
export function migrateRecipeToElaborations(recipe: any): Recipe {
  // Si ya tiene elaborations y no está vacío, retornar tal cual
  if (recipe.elaborations && recipe.elaborations.length > 0) {
    return recipe as Recipe;
  }
  
  // Si tiene ingredients directos, migrar a elaborations
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    const mainElaboration: RecipeElaboration = {
      id: `temp-${crypto.randomUUID()}`, // ID temporal para frontend
      name: "Elaboración principal",
      order: 1,
      ingredients: recipe.ingredients
    };
    
    return {
      ...recipe,
      elaborations: [mainElaboration],
      ingredients: undefined // Remover propiedad antigua
    };
  }
  
  // Si no tiene ni elaborations ni ingredients, crear elaboration vacía
  return {
    ...recipe,
    elaborations: [{
      id: `temp-${crypto.randomUUID()}`,
      name: "Elaboración principal",
      order: 1,
      ingredients: []
    }]
  };
}

/**
 * Verifica si una receta necesita migración
 */
export function needsMigration(recipe: any): boolean {
  return (!recipe.elaborations || recipe.elaborations.length === 0) && 
         recipe.ingredients && 
         recipe.ingredients.length > 0;
}
