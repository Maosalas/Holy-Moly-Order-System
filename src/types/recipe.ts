export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  units: string;
  cost: number;
}

export type ElaborationType = 'base' | 'relleno' | 'cubierta' | 'decoracion' | 'otro';

export interface RecipeElaboration {
  id: string;
  name: string;
  order: number;
  ingredients: RecipeIngredient[];
  variationId?: string;      // NULL si es elaboración base
  elaborationType?: ElaborationType;
  parameterKey?: string;     // Referencia opcional a parámetro global
}

export interface RecipeVariationParameter {
  id: string;
  variationId: string;
  parameterKey: string;  // Referencia a RecipeParameter
  multiplier: number;
  createdAt: Date;
}

export interface RecipeVariation {
  id: string;
  recipeId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  orderNumber: number;
  elaborations: RecipeElaboration[];  // Elaboraciones específicas de esta variación
  parameters?: RecipeVariationParameter[];
  totalCost?: number;  // Costo calculado de esta variación
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeSupply {
  id?: string;
  supplyId: string;
  supplyName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface RecipeMultiplier {
  id?: string;
  size: string;
  multiplier: number;
}

export type Category = "queque" | "relleno" | "cubierta" | "unidad" | "otro";

export interface Recipe {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  image?: string;
  
  // Elaboraciones base (compartidas por todas las variaciones)
  elaborations: RecipeElaboration[];
  
  // Variaciones de la receta
  variations?: RecipeVariation[];
  
  supplies?: RecipeSupply[];
  multipliers?: RecipeMultiplier[];  // DEPRECATED - mantener por retrocompatibilidad
  totalCost: number;
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
  notes: string;
  url: string;
  units?: number;
  unitCost?: number;
}

export type RecipeFormData = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
