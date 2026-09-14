export type SizePresetComponentType = "supply" | "ingredient";

export type SizePresetDefaultRole = "base" | "relleno" | "cubierta" | "decoracion";

export const PRESET_DEFAULT_ROLE_LABELS: Record<SizePresetDefaultRole, string> = {
  base: "Base",
  relleno: "Relleno",
  cubierta: "Cubierta",
  decoracion: "Decoración",
};

export interface SizePreset {
  id: string;
  organization_id: string;
  name: string;
  sort_order: number;
  portions: number | null;
  assembly_minutes: number;
  oven_minutes: number;
  target_weight_g: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SizePresetComponent {
  id: string;
  size_preset_id: string;
  component_type: SizePresetComponentType;
  supply_id: string | null;
  ingredient_id: string | null;
  role: string;
  qty: number;
  unit_code: string;
  base_qty: number;
}

export interface SizePresetDefault {
  id: string;
  size_preset_id: string;
  role: SizePresetDefaultRole;
  qty_g: number;
}
