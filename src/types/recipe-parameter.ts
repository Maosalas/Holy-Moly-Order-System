export interface RecipeParameter {
  id: string;
  organizationId: string;
  parameterKey: string;  // Ej: "Relleno_Cupcake"
  value: number;         // Ej: 50
  unit: string;          // Ej: "gr"
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RecipeParameterFormData = Omit<RecipeParameter, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;
