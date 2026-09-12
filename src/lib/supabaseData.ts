/**
 * Data layer backed by Lovable Cloud (Supabase).
 * Mantiene la misma forma de respuesta que el API anterior: { data } | { error }
 */
import { supabase } from "@/lib/supabaseClient";

type Result<T> = { data?: T; error?: string };

const CURRENT_ORG_STORAGE_KEY = "holy-moly-current-org";

export function getCurrentOrganizationId(): string | null {
  try {
    const raw = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

/** Convierte solo las llaves de primer nivel (el contenido JSONB ya viene en camelCase) */
function rowToCamel<T = any>(row: any): T {
  if (!row || typeof row !== "object") return row;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out;
}

function payloadToSnake(payload: any, allowed: string[]): any {
  const out: any = {};
  for (const [k, v] of Object.entries(payload || {})) {
    const key = toSnake(k);
    if (allowed.includes(key) && v !== undefined) out[key] = v;
  }
  return out;
}

async function requireOrg(): Promise<{ orgId?: string; error?: string }> {
  const orgId = getCurrentOrganizationId();
  if (!orgId) return { error: "No hay una organización seleccionada. Vuelve a iniciar sesión." };
  return { orgId };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** CRUD genérico por organización */
function createResource<T = any>(table: string, columns: string[], orderBy = "created_at") {
  return {
    getAll: async (): Promise<Result<T[]>> => {
      const { orgId, error } = await requireOrg();
      if (error) return { error };
      const res = await supabase
        .from(table as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order(orderBy, { ascending: false });
      if (res.error) return { error: res.error.message };
      return { data: (res.data || []).map((r) => rowToCamel<T>(r)) };
    },

    getById: async (id: string): Promise<Result<T>> => {
      const res = await supabase.from(table as any).select("*").eq("id", id).maybeSingle();
      if (res.error) return { error: res.error.message };
      if (!res.data) return { error: "No encontrado" };
      return { data: rowToCamel<T>(res.data) };
    },

    create: async (payload: any): Promise<Result<T>> => {
      const { orgId, error } = await requireOrg();
      if (error) return { error };
      const body = payloadToSnake(payload, columns);
      body.organization_id = orgId;
      if (columns.includes("user_id") && !body.user_id) {
        body.user_id = await currentUserId();
      }
      const res = await supabase.from(table as any).insert(body).select("*").single();
      if (res.error) return { error: res.error.message };
      return { data: rowToCamel<T>(res.data) };
    },

    update: async (id: string, payload: any): Promise<Result<T>> => {
      const body = payloadToSnake(payload, columns);
      delete body.organization_id;
      const res = await supabase.from(table as any).update(body).eq("id", id).select("*").single();
      if (res.error) return { error: res.error.message };
      return { data: rowToCamel<T>(res.data) };
    },

    delete: async (id: string): Promise<Result<{}>> => {
      const res = await supabase.from(table as any).delete().eq("id", id);
      if (res.error) return { error: res.error.message };
      return { data: {} };
    },
  };
}

// ============ INGREDIENTES ============
export const ingredientsApi = createResource("ingredients", [
  "user_id", "name", "provider", "qty_provider", "units", "cost",
  "base_unit", "density_g_ml", "unit_weight_g", "waste_pct", "category", "active",
]);

// ============ SUMINISTROS ============
export const suppliesApi = createResource("supplies", [
  "user_id", "name", "supplier_name", "quantity", "unit", "cost",
]);

// ============ RECETAS ============
const recipesResource = createResource("recipes", [
  "user_id", "name", "image", "elaborations", "variations", "supplies",
  "used_parameters", "categories", "total_weight", "total_weight_unit",
  "total_cost", "units", "unit_cost", "notes", "url",
]);
export const recipesApi = {
  ...recipesResource,
  migrateToElaborations: async (): Promise<Result<{}>> => ({ data: {} }),
};

// ============ PARÁMETROS DE RECETAS ============
export const recipeParametersApi = createResource("recipe_parameters", [
  "parameter_key", "value", "unit", "description",
]);

// ============ COTIZACIONES ============
const quotationsResource = createResource("quotations", [
  "user_id", "number", "client_id", "client_name", "client_phone", "status",
  "quote_date", "valid_until", "delivery_date", "items_subtotal", "packaging_total",
  "extras_total", "rush_surcharge", "discount_amount", "tax_amount", "total",
  "cost_total", "margin_pct", "labor_minutes", "deposit_pct", "deposit_amount",
  "snapshot", "snapshot_at", "costs_changed", "cost_now", "needs_cake_topper",
  "reference_photos", "client_notes", "internal_notes", "pdf_url", "public_token",
  "total_cost", "selling_price", "profit", "profit_margin", "notes", "size",
]);
export const quotationsApi = {
  ...quotationsResource,
  getFillingMultipliers: async (_recipeId: string): Promise<Result<any[]>> => ({ data: [] }),
  getCoveringMultipliers: async (_recipeId: string): Promise<Result<any[]>> => ({ data: [] }),
  getCakeMultipliers: async (_recipeId: string): Promise<Result<any[]>> => ({ data: [] }),
  saveFillingMultipliers: async (..._args: any[]): Promise<Result<{}>> => ({ data: {} }),
  saveCoveringMultipliers: async (..._args: any[]): Promise<Result<{}>> => ({ data: {} }),
  saveCakeMultipliers: async (..._args: any[]): Promise<Result<{}>> => ({ data: {} }),
};

// ============ GASTOS ============
const expensesResource = createResource("expenses", [
  "user_id", "supermarket_name", "purchase_date", "amount", "card_type", "receipt_url",
]);
const normalizeExpense = (e: any) => ({
  ...e,
  cardType:
    typeof e?.cardType === "string"
      ? { id: e.cardType, name: e.cardType, description: "", active: true, createdAt: e.createdAt }
      : e?.cardType,
});
export const expensesApi = {
  getAll: async () => {
    const res = await expensesResource.getAll();
    return res.data ? { data: res.data.map(normalizeExpense) } : res;
  },
  getById: async (id: string) => {
    const res = await expensesResource.getById(id);
    return res.data ? { data: normalizeExpense(res.data) } : res;
  },
  create: (expense: any) =>
    expensesResource.create({
      ...expense,
      cardType: typeof expense?.cardType === "object" ? expense.cardType?.name : expense?.cardType,
    }),
  update: (id: string, expense: any) =>
    expensesResource.update(id, {
      ...expense,
      cardType: typeof expense?.cardType === "object" ? expense.cardType?.name : expense?.cardType,
    }),
  delete: expensesResource.delete,
};

// ============ PEDIDOS ============
const ordersResource = createResource("orders", [
  "user_id", "quotation_id", "client_name", "phone_number", "order_details",
  "delivery_date", "client_photos", "needs_cake_topper", "topper_details",
  "topper_photos", "cost_amount", "charge_amount", "payment_method",
  "down_payment", "supplies_needed", "statuses",
]);

const normalizeOrder = (o: any) => ({
  ...o,
  deliveryDate: o?.deliveryDate ? new Date(o.deliveryDate) : o?.deliveryDate,
  paymentMethod:
    typeof o?.paymentMethod === "string"
      ? { id: o.paymentMethod, name: o.paymentMethod, description: "" }
      : o?.paymentMethod,
  clientPhotos: o?.clientPhotos || [],
  topperPhotos: o?.topperPhotos || [],
  statuses: o?.statuses || [],
});

const denormalizeOrder = (order: any) => ({
  ...order,
  paymentMethod:
    typeof order?.paymentMethod === "object" ? order.paymentMethod?.name : order?.paymentMethod,
  deliveryDate:
    order?.deliveryDate instanceof Date ? order.deliveryDate.toISOString() : order?.deliveryDate,
  statuses: (order?.statuses || []).map((s: any) => (typeof s === "string" ? s : s?.status)),
  clientPhotos: (order?.clientPhotos || []).map((p: any) => (typeof p === "string" ? p : p?.photoUrl)),
});

export const ordersApi = {
  getAll: async () => {
    const res = await ordersResource.getAll();
    return res.data ? { data: res.data.map(normalizeOrder) } : res;
  },
  getById: async (id: string) => {
    const res = await ordersResource.getById(id);
    return res.data ? { data: normalizeOrder(res.data) } : res;
  },
  create: async (order: any) => {
    const res = await ordersResource.create(denormalizeOrder(order));
    return res.data ? { data: normalizeOrder(res.data) } : res;
  },
  update: async (id: string, order: any) => {
    const res = await ordersResource.update(id, denormalizeOrder(order));
    return res.data ? { data: normalizeOrder(res.data) } : res;
  },
  updateTopper: (id: string, data: { topperDetails?: string; topperPhotos?: string[] }) =>
    ordersResource.update(id, data),
  delete: ordersResource.delete,

  getUsage: async (): Promise<Result<{ used: number }>> => {
    const { orgId, error } = await requireOrg();
    if (error) return { error };
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const res = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId!)
      .gte("created_at", start.toISOString());
    if (res.error) return { error: res.error.message };
    return { data: { used: res.count || 0 } };
  },

  // Portal público de pedidos
  generatePortalToken: async (orderId: string): Promise<Result<{ token: string }>> => {
    const { orgId, error } = await requireOrg();
    if (error) return { error };
    const existing = await supabase
      .from("order_portal_tokens")
      .select("token")
      .eq("order_id", orderId)
      .eq("revoked", false)
      .maybeSingle();
    if (existing.data?.token) return { data: { token: existing.data.token as string } };
    const res = await supabase
      .from("order_portal_tokens")
      .insert({ order_id: orderId, organization_id: orgId! })
      .select("token")
      .single();
    if (res.error) return { error: res.error.message };
    return { data: { token: res.data.token as string } };
  },

  getByPortalToken: async (token: string): Promise<Result<any>> => {
    const res = await supabase.rpc("get_order_by_portal_token", { _token: token });
    if (res.error) return { error: res.error.message };
    if (!res.data) return { error: "El enlace no es válido o ya expiró" };
    const order: any = res.data;
    return {
      data: {
        ...order,
        deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : undefined,
      },
    };
  },
};

// ============ INVENTARIO ============
export const inventoryApi = {
  getItems: async (): Promise<Result<any[]>> => {
    const { orgId, error } = await requireOrg();
    if (error) return { error };
    const res = await supabase
      .from("inventory_items")
      .select("*")
      .eq("organization_id", orgId!)
      .order("item_name", { ascending: true });
    if (res.error) return { error: res.error.message };
    return {
      data: (res.data || []).map((row) => {
        const item = rowToCamel<any>(row);
        return { ...item, isLowStock: Number(item.currentStock) <= Number(item.minStockThreshold) };
      }),
    };
  },

  createItem: async (item: any): Promise<Result<any>> => {
    const { orgId, error } = await requireOrg();
    if (error) return { error };

    let itemName = item.itemName;
    let unit = item.unit;

    if (!itemName || !unit) {
      if (item.ingredientId) {
        const r = await supabase
          .from("ingredients")
          .select("name, units")
          .eq("id", item.ingredientId)
          .maybeSingle();
        itemName = itemName || r.data?.name;
        unit = unit || r.data?.units;
      } else if (item.supplyId) {
        const r = await supabase
          .from("supplies")
          .select("name, unit")
          .eq("id", item.supplyId)
          .maybeSingle();
        itemName = itemName || r.data?.name;
        unit = unit || r.data?.unit;
      }
    }

    const res = await supabase
      .from("inventory_items")
      .insert({
        organization_id: orgId!,
        ingredient_id: item.ingredientId || null,
        supply_id: item.supplyId || null,
        item_type: item.itemType || (item.ingredientId ? "ingredient" : "supply"),
        item_name: itemName || "Sin nombre",
        unit: unit || "",
        current_stock: item.currentStock ?? 0,
        min_stock_threshold: item.minStockThreshold ?? 0,
      })
      .select("*")
      .single();
    if (res.error) return { error: res.error.message };
    return { data: rowToCamel(res.data) };
  },

  updateItem: async (id: string, item: any): Promise<Result<any>> => {
    const body = payloadToSnake(item, [
      "item_name", "unit", "current_stock", "min_stock_threshold", "last_restock_date",
      "item_type", "ingredient_id", "supply_id",
    ]);
    const res = await supabase
      .from("inventory_items")
      .update(body)
      .eq("id", id)
      .select("*")
      .single();
    if (res.error) return { error: res.error.message };
    return { data: rowToCamel(res.data) };
  },

  deleteItem: async (id: string): Promise<Result<{}>> => {
    const res = await supabase.from("inventory_items").delete().eq("id", id);
    if (res.error) return { error: res.error.message };
    return { data: {} };
  },

  getAlerts: async (): Promise<Result<any[]>> => {
    const { orgId, error } = await requireOrg();
    if (error) return { error };
    const res = await supabase
      .from("inventory_alerts")
      .select("*")
      .eq("organization_id", orgId!)
      .order("created_at", { ascending: false });
    if (res.error) return { error: res.error.message };
    return { data: (res.data || []).map((r) => rowToCamel(r)) };
  },

  resolveAlert: async (alertId: string): Promise<Result<any>> => {
    const res = await supabase
      .from("inventory_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId)
      .select("*")
      .single();
    if (res.error) return { error: res.error.message };
    return { data: rowToCamel(res.data) };
  },

  markAlertRead: async (alertId: string): Promise<Result<any>> => {
    const res = await supabase
      .from("inventory_alerts")
      .update({ is_read: true })
      .eq("id", alertId)
      .select("*")
      .single();
    if (res.error) return { error: res.error.message };
    return { data: rowToCamel(res.data) };
  },

  getPurchases: async (): Promise<Result<any[]>> => {
    const { orgId, error } = await requireOrg();
    if (error) return { error };
    const res = await supabase
      .from("inventory_purchases")
      .select("*")
      .eq("organization_id", orgId!)
      .order("purchase_date", { ascending: false });
    if (res.error) return { error: res.error.message };
    return { data: (res.data || []).map((r) => rowToCamel(r)) };
  },

  createPurchase: async (purchase: any): Promise<Result<any>> => {
    const { orgId, error } = await requireOrg();
    if (error) return { error };

    const itemRes = await supabase
      .from("inventory_items")
      .select("*")
      .eq("id", purchase.inventoryItemId)
      .maybeSingle();
    if (itemRes.error) return { error: itemRes.error.message };
    if (!itemRes.data) return { error: "El item de inventario no existe" };

    const item: any = itemRes.data;
    const quantity = Number(purchase.quantity) || 0;
    const previousStock = Number(item.current_stock) || 0;
    const newStock = previousStock + quantity;

    const created = await supabase
      .from("inventory_purchases")
      .insert({
        organization_id: orgId!,
        inventory_item_id: item.id,
        item_name: item.item_name,
        quantity,
        unit: purchase.unit || item.unit,
        cost: purchase.cost ?? 0,
        expense_id: purchase.expenseId || null,
        supplier_name: purchase.supplierName || null,
        purchase_date: purchase.purchaseDate || new Date().toISOString().slice(0, 10),
        notes: purchase.notes || null,
      })
      .select("*")
      .single();
    if (created.error) return { error: created.error.message };

    const updated = await supabase
      .from("inventory_items")
      .update({ current_stock: newStock, last_restock_date: new Date().toISOString() })
      .eq("id", item.id);
    if (updated.error) return { error: updated.error.message };

    await supabase.from("inventory_movements").insert({
      organization_id: orgId!,
      inventory_item_id: item.id,
      item_name: item.item_name,
      movement_type: "restock",
      quantity,
      unit: purchase.unit || item.unit,
      previous_stock: previousStock,
      new_stock: newStock,
      reference_type: "purchase",
      reference_id: created.data.id,
      notes: purchase.notes || null,
    });

    return { data: rowToCamel(created.data) };
  },

  getMovements: async (): Promise<Result<any[]>> => {
    const { orgId, error } = await requireOrg();
    if (error) return { error };
    const res = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("organization_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(200);
    if (res.error) return { error: res.error.message };
    return { data: (res.data || []).map((r) => rowToCamel(r)) };
  },
};

// ============ CATÁLOGOS FIJOS ============
const staticCatalog = (items: any[]) => ({
  getAll: async (): Promise<Result<any[]>> => ({ data: items }),
  getById: async (id: string): Promise<Result<any>> => {
    const found = items.find((i) => i.id === id);
    return found ? { data: found } : { error: "No encontrado" };
  },
  create: async (..._args: any[]): Promise<Result<any>> => ({ error: "Catálogo no editable" }),
  update: async (..._args: any[]): Promise<Result<any>> => ({ error: "Catálogo no editable" }),
  delete: async (..._args: any[]): Promise<Result<any>> => ({ error: "Catálogo no editable" }),
});

export const paymentMethodsApi = staticCatalog(
  ["Efectivo", "Transferencia", "Link de pago/tarjeta", "SINPE"].map((name) => ({
    id: name,
    name,
    description: "",
  }))
);

export const cardTypesApi = staticCatalog(
  ["Débito", "Crédito", "Efectivo", "SINPE"].map((name) => ({
    id: name,
    name,
    description: "",
    active: true,
    createdAt: new Date().toISOString(),
  }))
);

export const recipeTypesApi = staticCatalog(
  [
    { id: "queque", name: "Queque" },
    { id: "relleno", name: "Relleno" },
    { id: "cubierta", name: "Cubierta" },
    { id: "unidad", name: "Unidad" },
    { id: "otro", name: "Otro" },
  ].map((t) => ({ ...t, description: "", active: true, createdAt: new Date().toISOString() }))
);
