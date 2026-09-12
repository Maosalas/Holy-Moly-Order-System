export interface Ingredient {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  /** @deprecated columna heredada, se eliminará */
  provider?: string;
  /** @deprecated columna heredada, se eliminará */
  qtyProvider?: number;
  /** @deprecated columna heredada, se eliminará */
  units?: string;
  /** @deprecated columna heredada, se eliminará */
  cost?: number;
  baseUnit?: string;
  densityGMl?: number | null;
  unitWeightG?: number | null;
  wastePct?: number;
  currentCost?: number;
  lastCost?: number;
  category?: string | null;
  photoUrl?: string | null;
  active?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IngredientFormData = Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>;
