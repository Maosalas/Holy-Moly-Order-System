import { Ingredient } from "./ingredient";

export interface RecipeType {
  id: string;
  name: string;
  description: string;
  active?: boolean;
  createdAt?: string;
}

export interface QuotationRecipe {
  recipeId: string;
  recipeName: string;
  recipeType: RecipeType;

  // NUEVO: Soporte para variaciones
  variationId?: string;
  variationName?: string;

  // NUEVO: Tamaño específico de esta receta (si aplica)
  size?: string;

  unitCost: number;
  quantity: number;
  totalCost: number;

  // NUEVO: Para rellenos/cubiertas - relación con receta principal
  linkedToRecipeId?: string;        // ID de la receta principal
  linkedToVariationId?: string;     // ID de la variación de la receta principal
  parameterKey?: string;            // Parámetro usado para calcular (ej: "Relleno Pavlova")
  baseRecipeId?: string;            // ID de la receta base de relleno/cubierta
}

export interface QuotationSupply {
  supplyId: string;
  supplyName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface QuotationIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  units: string;
  costPerUnit: number;
  totalCost: number;
}

export interface QuotationAdditionalExpense {
  expenseName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  organizationId: string;
  userId?: string;
  clientName: string;
  recipes: QuotationRecipe[];
  selectedSupplies: QuotationSupply[];
  additionalExpenses?: QuotationAdditionalExpense[];
  additionalIngredients?: QuotationIngredient[];
  totalCost: number;
  sellingPrice?: number; // Precio que se cobra al cliente
  profit?: number; // Ganancia (sellingPrice - totalCost)
  profitMargin?: number; // % de ganancia ((profit / totalCost) * 100)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type QuotationFormData = Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>;
