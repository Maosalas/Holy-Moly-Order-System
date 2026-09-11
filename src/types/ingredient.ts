export interface Ingredient {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  provider: string;
  qtyProvider: number;
  units: string;
  cost: number;
  baseUnit?: string;
  densityGMl?: number | null;
  unitWeightG?: number | null;
  wastePct?: number;
  currentCost?: number;
  lastCost?: number;
  category?: string | null;
  active?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IngredientFormData = Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>;
