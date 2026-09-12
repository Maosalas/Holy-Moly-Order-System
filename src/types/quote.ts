export type QuoteStatus = "borrador" | "enviada" | "aceptada" | "rechazada" | "vencida";

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
};

export interface Quote {
  id: string;
  organization_id: string;
  number: string | null;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  status: QuoteStatus;
  quote_date: string;
  valid_until: string | null;
  delivery_date: string | null;
  items_subtotal: number;
  packaging_total: number;
  extras_total: number;
  rush_surcharge: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  cost_total: number;
  margin_pct: number | null;
  labor_minutes: number;
  deposit_pct: number;
  deposit_amount: number;
  snapshot: any;
  snapshot_at: string | null;
  costs_changed: boolean;
  cost_now: number | null;
  needs_cake_topper: boolean;
  reference_photos: any;
  client_notes: string | null;
  internal_notes: string | null;
  pdf_url: string | null;
  public_token: string;
  created_at: string;
  updated_at: string;
}

export type QuoteItemType = "product" | "preparation" | "manual";

export interface QuoteItem {
  id: string;
  quotation_id: string;
  item_type: QuoteItemType;
  product_id: string | null;
  size_id: string | null;
  variant_id: string | null;
  preparation_id: string | null;
  decoration_tier_id: string | null;
  description: string | null;
  optional_ids: string[];
  qty: number;
  unit_cost: number;
  unit_price: number;
  line_cost: number;
  line_total: number;
  margin_pct: number | null;
  composition: any;
  sort_order: number;
}

export type QuoteExtraKind = "entrega" | "montaje" | "evento" | "empaque" | "otro";

export const EXTRA_KIND_LABEL: Record<QuoteExtraKind, string> = {
  entrega: "Entrega",
  montaje: "Montaje",
  evento: "Evento",
  empaque: "Empaque",
  otro: "Otro",
};

export interface QuoteExtra {
  id: string;
  quotation_id: string;
  name: string;
  kind: QuoteExtraKind;
  unit_price: number;
  qty: number;
  total: number;
  is_cost: boolean;
  sort_order: number;
}

export interface DecorationTier {
  id: string;
  organization_id: string;
  name: string;
  extra_minutes: number;
  extra_amount: number;
  sort_order: number;
  active: boolean;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
}

export interface QuoteDrift {
  quotation_id: string;
  cost_total: number;
  cost_now: number;
  diff_pct: number;
  costs_changed: boolean;
  snapshot_at: string | null;
}

export interface PublicQuote {
  number: string;
  status: QuoteStatus;
  orgName: string | null;
  orgLogoUrl: string | null;
  clientName: string;
  clientPhone: string | null;
  quoteDate: string;
  validUntil: string | null;
  deliveryDate: string | null;
  itemsSubtotal: number;
  packagingTotal: number;
  extrasTotal: number;
  rushSurcharge: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  depositPct: number;
  depositAmount: number;
  needsCakeTopper: boolean;
  referencePhotos: string[] | null;
  clientNotes: string | null;
  pdfUrl: string | null;
  items: { description: string; qty: number; unitPrice: number; lineTotal: number }[];
  extras: { name: string; kind: string; qty: number; unitPrice: number; total: number }[];
}

export const formatCRC = (value: number | null | undefined) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
