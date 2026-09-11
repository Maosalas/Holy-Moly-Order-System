import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentOrganizationId } from "@/lib/supabaseData";
import type { IngredientPresentation, PurchaseInvoice, Supplier, Unit } from "@/types/purchasing";

const orgId = () => getCurrentOrganizationId();

export const useUnits = () =>
  useQuery({
    queryKey: ["units"],
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Unit[]> => {
      const { data, error } = await supabase.from("units").select("*").order("magnitude");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as Unit[];
    },
  });

export const useSuppliers = () =>
  useQuery({
    queryKey: ["suppliers", orgId()],
    queryFn: async (): Promise<Supplier[]> => {
      const id = orgId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("organization_id", id)
        .order("name");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as Supplier[];
    },
  });

export const useCreateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; phone?: string; notes?: string }) => {
      const id = orgId();
      if (!id) throw new Error("No hay organización seleccionada");
      const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...payload, organization_id: id } as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};

export const usePresentations = () =>
  useQuery({
    queryKey: ["ingredient_presentations", orgId()],
    queryFn: async (): Promise<IngredientPresentation[]> => {
      const id = orgId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("ingredient_presentations")
        .select("*")
        .eq("organization_id", id)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as IngredientPresentation[];
    },
  });

export const useCreatePresentation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ingredient_id: string;
      supplier_id?: string | null;
      description: string;
      qty: number;
      unit_code: string;
      price: number;
      is_default?: boolean;
    }) => {
      const id = orgId();
      if (!id) throw new Error("No hay organización seleccionada");
      const { error } = await supabase
        .from("ingredient_presentations")
        .insert({ ...payload, organization_id: id } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredient_presentations"] }),
  });
};

export const useDeletePresentation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ingredient_presentations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredient_presentations"] }),
  });
};

export const useUpdateIngredientWaste = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, wastePct }: { id: string; wastePct: number }) => {
      const { error } = await supabase
        .from("ingredients")
        .update({ waste_pct: wastePct } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
};

export const usePurchaseInvoices = () =>
  useQuery({
    queryKey: ["purchase_invoices", orgId()],
    queryFn: async (): Promise<PurchaseInvoice[]> => {
      const id = orgId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select("*")
        .eq("organization_id", id)
        .order("purchase_date", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data || []) as unknown as PurchaseInvoice[];
    },
  });

export interface NewPurchaseLine {
  ingredientId: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number;
  presentationId?: string | null;
  inventoryItemId?: string | null;
}

export const useCreatePurchaseInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      supplierId: string | null;
      supplierName: string | null;
      purchaseDate: string;
      freight: number;
      notes: string | null;
      lines: NewPurchaseLine[];
    }) => {
      const id = orgId();
      if (!id) throw new Error("No hay organización seleccionada");

      const { data: invoice, error: invErr } = await supabase
        .from("purchase_invoices")
        .insert({
          organization_id: id,
          supplier_id: payload.supplierId,
          supplier_name: payload.supplierName,
          purchase_date: payload.purchaseDate,
          freight: payload.freight,
          notes: payload.notes,
        } as never)
        .select("*")
        .single();
      if (invErr) throw new Error(invErr.message);

      const invoiceId = (invoice as unknown as PurchaseInvoice).id;

      const { error: linesErr } = await supabase.from("inventory_purchases").insert(
        payload.lines.map((l) => ({
          organization_id: id,
          purchase_invoice_id: invoiceId,
          ingredient_id: l.ingredientId,
          presentation_id: l.presentationId ?? null,
          inventory_item_id: l.inventoryItemId ?? null,
          item_name: l.itemName,
          quantity: l.quantity,
          unit: l.unit,
          cost: l.cost,
          purchase_date: payload.purchaseDate,
          supplier_name: payload.supplierName,
        })) as never
      );
      if (linesErr) throw new Error(linesErr.message);

      const { error: rpcErr } = await supabase.rpc("fn_process_purchase", {
        p_invoice_id: invoiceId,
      } as never);
      if (rpcErr) throw new Error(rpcErr.message);

      return invoiceId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_invoices"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};
