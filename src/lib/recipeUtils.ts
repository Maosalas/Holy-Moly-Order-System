import { Recipe, RecipeElaboration } from "@/types/recipe";

/**
 * Migra recetas antiguas (con ingredients directo) a la nueva estructura (con elaborations)
 */
export function migrateRecipeToElaborations(recipe: any): Recipe {
  let migratedRecipe = { ...recipe };
  
  // Migrar category a categories si es necesario
  if (!migratedRecipe.categories && migratedRecipe.category) {
    migratedRecipe.categories = [migratedRecipe.category];
  }
  
  // Si ya tiene elaborations y no está vacío, retornar tal cual
  if (migratedRecipe.elaborations && migratedRecipe.elaborations.length > 0) {
    return migratedRecipe as Recipe;
  }
  
  // Si tiene ingredients directos, migrar a elaborations
  if (migratedRecipe.ingredients && migratedRecipe.ingredients.length > 0) {
    const mainElaboration: RecipeElaboration = {
      id: `temp-${crypto.randomUUID()}`, // ID temporal para frontend
      name: "Elaboración principal",
      order: 1,
      ingredients: migratedRecipe.ingredients
    };
    
    return {
      ...migratedRecipe,
      elaborations: [mainElaboration],
      ingredients: undefined // Remover propiedad antigua
    };
  }
  
  // Si no tiene ni elaborations ni ingredients, crear elaboration vacía
  return {
    ...migratedRecipe,
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
