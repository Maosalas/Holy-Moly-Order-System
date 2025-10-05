export interface QuotationRecipe {
  recipeId: string;
  recipeName: string;
  recipeType: 'queque' | 'relleno' | 'cubierta' | 'unidad';
  unitCost: number;
  quantity: number;
  totalCost: number;
}

export interface Quotation {
  id: string;
  clientName: string;
  size: 'pequeño' | 'mediano' | 'grande';
  recipes: QuotationRecipe[];
  totalCost: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type QuotationFormData = Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>;
