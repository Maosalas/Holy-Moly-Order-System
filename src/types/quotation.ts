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
  unitCost: number;
  quantity: number;
  totalCost: number;
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
  clientName: string;
  size: 'mini' | 'pequeño' | 'mediano' | 'grande';
  recipes: QuotationRecipe[];
  selectedSupplies: QuotationSupply[];
  additionalExpenses?: QuotationAdditionalExpense[];
  additionalIngredients?: QuotationIngredient[];
  totalCost: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type QuotationFormData = Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>;
