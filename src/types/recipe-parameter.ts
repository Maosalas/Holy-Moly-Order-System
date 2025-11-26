export interface RecipeParameter {
  id: string;
  organizationId: string;
  parameterKey: string;  // Ej: "Relleno Cupcake", "Crema de Mantequilla"
  value: number;         // Ej: 50
  unit: string;          // Ej: "gr"
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RecipeParameterFormData = Omit<RecipeParameter, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;
