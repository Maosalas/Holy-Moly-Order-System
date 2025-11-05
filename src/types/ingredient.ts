export interface Ingredient {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  provider: string;
  qtyProvider: number;
  units: string;
  cost: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IngredientFormData = Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>;
