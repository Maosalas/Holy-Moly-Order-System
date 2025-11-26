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
  cost: number;                // Costo total calculado de la elaboración
  variationId?: string | null; // null = común a todas, ID = específica de variación
  ingredients: RecipeIngredient[];
}

export interface RecipeParameterUsage {
  parameterKey: string;      // Ej: "Relleno Pavlova", "Cubierta Queque"
  value: number;             // Cantidad por unidad, Ej: 25, 50
  unit: string;              // Unidad, Ej: "gr", "ml"
}

// NUEVO CONCEPTO: Variaciones son tamaños/cantidades, no recetas diferentes
export interface RecipeVariation {
  id: string;
  recipeId: string;
  name: string;                    // Ej: "Mini", "Normal", "Grande"
  description?: string;
  isDefault: boolean;
  orderNumber: number;
  units: number;                   // Cantidad de unidades que produce (Ej: 6, 12, 24)

  // Parámetros globales a nivel de variación
  usedParameters?: string[];       // Parámetros específicos para esta variación (Ej: ["Relleno Pavlova"])

  // IDs de elaboraciones BASE que esta variación incluye en su cálculo
  baseElaborationIds?: string[];   // Referencias a elaboraciones con variationId = null

  // Elaboraciones PROPIAS de esta variación (variationId = this.id)
  elaborations: RecipeElaboration[];

  totalCost?: number;              // Costo total calculado
  unitCost?: number;               // Costo por unidad (totalCost / units)
  createdAt: Date;
  updatedAt: Date;
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

// DEPRECATED: RecipeMultiplier eliminado - ahora usamos parámetros globales por tamaño
// Mantener temporalmente para retrocompatibilidad
export interface RecipeMultiplier {
  id?: string;
  size: string;
  multiplier: number;
}

export type Category = "queque" | "relleno" | "cubierta" | "unidad" | "otro";

export interface Recipe {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  image?: string;

  // Elaboraciones (todas compartidas, sin variaciones específicas)
  elaborations: RecipeElaboration[];

  // Parámetros que usa esta receta (extraídos de elaborations.parameterKey)
  // Ej: ["Relleno Pavlova", "Cubierta Pavlova"]
  usedParameters?: string[];

  // Peso total generado por esta receta (para recetas de relleno/cubierta)
  // Calculado automáticamente o ingresado manualmente
  totalWeight?: number;       // Ej: 500 (gramos)
  totalWeightUnit?: string;   // Ej: "gr", "kg", "ml", "L"

  // Variaciones = diferentes tamaños/cantidades de la MISMA receta
  variations?: RecipeVariation[];

  supplies?: RecipeSupply[];
  // DEPRECATED: multipliers eliminado del nuevo sistema - usar parámetros globales
  // multipliers?: RecipeMultiplier[];
  totalCost: number;
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
  notes: string;
  url: string;
  units?: number;
  unitCost?: number;
}

export type RecipeFormData = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
