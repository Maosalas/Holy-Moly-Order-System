export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  active: boolean;
}

export interface Unit {
  code: string;
  name: string;
  magnitude: "mass" | "volume" | "count";
  factor_to_base: number;
  is_input_only: boolean;
}

export interface IngredientPresentation {
  id: string;
  organization_id: string;
  ingredient_id: string;
  supplier_id: string | null;
  description: string;
  qty: number;
  unit_code: string;
  price: number;
  is_default: boolean;
  active: boolean;
}

export interface PurchaseInvoice {
  id: string;
  organization_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  purchase_date: string;
  freight: number;
  total: number;
  receipt_url: string | null;
  notes: string | null;
}

export interface PurchaseLineDraft {
  key: string;
  ingredientId: string;
  quantity: string;
  unit: string;
  cost: string;
}
