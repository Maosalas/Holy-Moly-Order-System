export type ProductPriceBasis = "unit" | "portion";

export type ProductComponentType = "preparation" | "ingredient" | "supply";

export type ProductComponentRole =
  | "base"
  | "relleno"
  | "cubierta"
  | "decoracion"
  | "empaque"
  | "otro";

export const ROLE_LABELS: Record<ProductComponentRole, string> = {
  base: "Base",
  relleno: "Relleno",
  cubierta: "Cubierta",
  decoracion: "Decoración",
  empaque: "Empaque",
  otro: "Otro",
};

export const COMPONENT_TYPE_LABELS: Record<ProductComponentType, string> = {
  preparation: "Elaboración",
  ingredient: "Ingrediente",
  supply: "Suministro",
};

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  description: string | null;
  photo_url: string | null;
  price_basis: ProductPriceBasis;
  is_seasonal: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSize {
  id: string;
  product_id: string;
  name: string;
  portions: number | null;
  target_weight_g: number | null;
  assembly_minutes: number;
  oven_minutes: number;
  is_default: boolean;
  sort_order: number;
  active: boolean;
  size_preset_id: string | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  sort_order: number;
  active: boolean;
}

export interface ProductComponent {
  id: string;
  product_id: string;
  size_id: string | null;
  variant_id: string | null;
  component_type: ProductComponentType;
  preparation_id: string | null;
  ingredient_id: string | null;
  supply_id: string | null;
  role: ProductComponentRole;
  qty: number;
  unit_code: string;
  base_qty: number;
  is_optional: boolean;
  sort_order: number;
  excludes_preset?: boolean;
}

export interface ProductCostLine {
  type: ProductComponentType;
  role: string;
  name: string | null;
  qty: number;
  unit: string;
  base_qty: number;
  unit_cost: number;
  material: number;
  labor: number;
  energy: number;
  packaging: number;
  total: number;
}

export interface ProductCostResult {
  product_id: string;
  size_id: string | null;
  variant_id: string | null;
  material_cost: number;
  labor_cost: number;
  energy_cost: number;
  packaging_cost: number;
  direct_cost: number;
  loss_cost: number;
  overhead_cost: number;
  total_cost: number;
  suggested_price: number;
  labor_minutes: number;
  oven_minutes: number;
  portions: number | null;
  cost_per_portion: number | null;
  margin_pct: number;
  breakdown: ProductCostLine[];
  calculated_at: string;
}
