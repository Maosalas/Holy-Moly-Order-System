export interface QuotationRecipe {
  recipeId: string;
  recipeName: string;
  recipeType: 'queque' | 'relleno' | 'cubierta' | 'unidad';
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

export interface QuotationAdditionalExpense {
  expenseName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  clientName: string;
  size: 'pequeño' | 'mediano' | 'grande';
  recipes: QuotationRecipe[];
  selectedSupplies: QuotationSupply[];
  additionalExpenses?: QuotationAdditionalExpense[];
  totalCost: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type QuotationFormData = Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>;
