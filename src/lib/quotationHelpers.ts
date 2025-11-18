import { Recipe, RecipeVariation } from "@/types/recipe";
import { RecipeParameter } from "@/types/recipe-parameter";

/**
 * Encuentra recetas complementarias basándose en el tipo de parámetro
 * Por ejemplo, si parameterKey es "Relleno Pavlova", busca recetas de categoría "relleno"
 *
 * @param recipes Lista de todas las recetas
 * @param parameterKey Clave del parámetro (ej: "Relleno Pavlova", "Cubierta Queque")
 * @returns Recetas que son del tipo complementario (relleno, cubierta, etc.)
 */
export function findRecipesByParameter(
  recipes: Recipe[],
  parameterKey: string
): Recipe[] {
  // Determinar el tipo de receta basándose en el nombre del parámetro
  let targetCategory: 'relleno' | 'cubierta' | 'queque' | null = null;

  const lowerKey = parameterKey.toLowerCase();
  if (lowerKey.includes('relleno')) {
    targetCategory = 'relleno';
  } else if (lowerKey.includes('cubierta') || lowerKey.includes('cobertura')) {
    targetCategory = 'cubierta';
  } else if (lowerKey.includes('queque') || lowerKey.includes('bizcocho') || lowerKey.includes('base')) {
    targetCategory = 'queque';
  }

  if (!targetCategory) {
    return [];
  }

  // Buscar recetas que sean del tipo complementario
  return recipes.filter((recipe) => {
    // La receta debe tener la categoría correcta
    const hasCategory = recipe.categories?.includes(targetCategory!) || false;
    // Y debe tener peso total definido para poder calcular
    const hasWeight = recipe.totalWeight && recipe.totalWeight > 0;

    return hasCategory && hasWeight;
  });
}

/**
 * Calcula la cantidad necesaria de una receta complementaria
 * basándose en el parámetro global y las unidades de la receta principal
 * @deprecated Usar calculateRequiredAmountFromRecipe en su lugar
 */
export function calculateRequiredAmount(
  parameter: RecipeParameter,
  units: number
): { amount: number; unit: string } {
  const amount = parameter.value * units;
  return {
    amount,
    unit: parameter.unit,
  };
}

/**
 * Calcula la cantidad necesaria de una receta complementaria
 * basándose en un parámetro global y las unidades
 * @param parameter El parámetro global de la organización
 * @param units Número de unidades de la receta principal
 */
export function calculateRequiredAmountFromParameter(
  parameter: RecipeParameter,
  units: number
): { amount: number; unit: string } {
  const amount = parameter.value * units;
  return {
    amount,
    unit: parameter.unit,
  };
}

/**
 * Calcula el costo de una receta complementaria basándose en el peso/volumen necesario
 */
export function calculateComplementaryCost(
  recipe: Recipe,
  requiredAmount: number,
  requiredUnit: string
): { cost: number; multiplier: number } {
  console.log('=== calculateComplementaryCost ===');
  console.log('Recipe:', recipe.name);
  console.log('Recipe totalWeight:', recipe.totalWeight);
  console.log('Recipe totalWeightUnit:', recipe.totalWeightUnit);
  console.log('Recipe totalCost:', recipe.totalCost);
  console.log('Required amount:', requiredAmount);
  console.log('Required unit:', requiredUnit);

  if (!recipe.totalWeight || recipe.totalWeight === 0) {
    console.log('No totalWeight defined, returning full cost');
    // Si la receta no tiene peso definido, usar costo total directo
    return {
      cost: recipe.totalCost,
      multiplier: 1,
    };
  }

  // Normalizar unidades a gramos para el cálculo
  let recipeWeightInGrams = recipe.totalWeight;
  if (recipe.totalWeightUnit === "kg") {
    recipeWeightInGrams = recipe.totalWeight * 1000;
  } else if (recipe.totalWeightUnit === "L") {
    recipeWeightInGrams = recipe.totalWeight * 1000; // Asumiendo densidad 1
  } else if (recipe.totalWeightUnit === "ml") {
    recipeWeightInGrams = recipe.totalWeight; // 1ml ≈ 1gr
  }
  console.log('Recipe weight in grams:', recipeWeightInGrams);

  let requiredAmountInGrams = requiredAmount;
  if (requiredUnit === "kg") {
    requiredAmountInGrams = requiredAmount * 1000;
  } else if (requiredUnit === "L") {
    requiredAmountInGrams = requiredAmount * 1000;
  } else if (requiredUnit === "ml") {
    requiredAmountInGrams = requiredAmount;
  }
  console.log('Required amount in grams:', requiredAmountInGrams);

  // Calcular cuántas veces necesitamos hacer la receta
  const multiplier = requiredAmountInGrams / recipeWeightInGrams;
  console.log('Multiplier (required/recipe):', multiplier);

  // Costo = costo base × multiplicador
  const cost = recipe.totalCost * multiplier;
  console.log('Calculated cost:', cost);
  console.log('Formula: ₡', recipe.totalCost, '×', multiplier, '= ₡', cost);
  console.log('=================================\n');

  return {
    cost,
    multiplier,
  };
}

/**
 * Obtiene los parámetros usados por una receta o variación
 * Si se proporciona una variación y tiene parámetros propios, usa esos
 * Sino, usa los parámetros de la receta base
 */
export function getUsedParameters(recipe: Recipe, variation?: RecipeVariation | null): string[] {
  // Si hay una variación y tiene parámetros propios, usar esos
  if (variation?.usedParameters && variation.usedParameters.length > 0) {
    return variation.usedParameters;
  }
  // Sino, usar los parámetros de la receta
  return recipe.usedParameters || [];
}

/**
 * Filtra recetas por categorías específicas (relleno, cubierta, queque)
 * Útil para encontrar recetas complementarias
 */
export function findRecipesByCategory(
  recipes: Recipe[],
  category: 'relleno' | 'cubierta' | 'queque'
): Recipe[] {
  return recipes.filter((recipe) =>
    recipe.categories?.includes(category) || false
  );
}
