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
  name: string;
  image?: string;
  elaborations: RecipeElaboration[];
  supplies?: RecipeSupply[];
  multipliers?: RecipeMultiplier[];
  totalCost: number;
  categories: Category[]; // Cambiado de category: string a categories: Category[]
  createdAt: Date;
  updatedAt: Date;
  notes: string;
  url: string;
  units?: number;
  unitCost?: number;
}

export type RecipeFormData = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
