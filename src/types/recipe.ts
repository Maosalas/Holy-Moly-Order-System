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
  categories: Category[]; // Cambiado de category: string a categories: Category[]
  createdAt: Date;
  updatedAt: Date;
  notes: string;
  url: string;
  units?: number;
  unitCost?: number;
  wholeCost?: number; // Costo completo (para productos que se venden enteros)
}

export type RecipeFormData = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
