export type PreparationType =
  | "base"
  | "relleno"
  | "cubierta"
  | "decoracion"
  | "salsa"
  | "masa"
  | "otro";

export const PREPARATION_TYPE_LABELS: Record<PreparationType, string> = {
  base: "Base",
  relleno: "Relleno",
  cubierta: "Cubierta",
  decoracion: "Decoración",
  salsa: "Salsa",
  masa: "Masa",
  otro: "Otro",
};

export interface PreparationCosts {
  preparation_id: string;
  material_cost: number;
  labor_cost: number;
  energy_cost: number;
  batch_cost: number;
  cost_per_g: number;
  material_per_g: number;
  labor_per_g: number;
  energy_per_g: number;
  cost_per_portion: number | null;
  depth: number;
  breakdown: PreparationBreakdownItem[];
  calculated_at: string;
}

export interface PreparationBreakdownItem {
  type: "ingredient" | "preparation";
  name: string | null;
  qty: number;
  unit: string;
  base_qty: number;
  unit_cost: number;
  total: number;
}

export interface Preparation {
  id: string;
  organization_id: string;
  name: string;
  type: PreparationType;
  photo_url: string | null;
  yield_g: number;
  yield_portions: number | null;
  baking_loss_pct: number;
  waste_pct: number;
  time_minutes: number;
  setup_minutes: number;
  oven_minutes: number;
  oven_temp_c: number | null;
  procedure_text: string | null;
  notes: string | null;
  source_url: string | null;
  is_seasonal: boolean;
  active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  preparation_costs?: PreparationCosts | null;
}

export interface PreparationComponent {
  id: string;
  preparation_id: string;
  component_type: "ingredient" | "preparation";
  ingredient_id: string | null;
  child_prep_id: string | null;
  qty: number;
  unit_code: string;
  base_qty: number;
  waste_pct_override: number | null;
  sort_order: number;
  notes: string | null;
}

export interface PreparationInput {
  name: string;
  type: PreparationType;
  yield_g: number;
  yield_portions: number | null;
  waste_pct: number;
  time_minutes: number;
  setup_minutes: number;
  oven_minutes: number;
  oven_temp_c: number | null;
  procedure_text: string | null;
}
