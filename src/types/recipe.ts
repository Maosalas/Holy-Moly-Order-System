export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  units: string;
  cost: number;
}

export interface RecipeElaboration {
  id: string;
  name: string;
  order: number;
  ingredients: RecipeIngredient[];
}

export interface RecipeMultiplier {
  id?: string;
  size: string;
  multiplier: number;
}

export type Category = "queque" | "relleno" | "cubierta" | "unidad" | "otro";

export interface Recipe {
  id: string;
  name: string;
  image?: string;
  elaborations: RecipeElaboration[];
  multipliers?: RecipeMultiplier[];
  totalCost: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  notes: string;
  url: string;
  units?: number;
  unitCost?: number;
}

export type RecipeFormData = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
