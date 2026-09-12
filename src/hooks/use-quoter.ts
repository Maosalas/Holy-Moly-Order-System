import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentOrganizationId } from "@/lib/supabaseData";
import type {
  Client,
  DecorationTier,
  Quote,
  QuoteDrift,
  QuoteExtra,
  QuoteItem,
} from "@/types/quote";

const orgId = () => getCurrentOrganizationId();

/* ---------------- Cotizaciones ---------------- */

export const useQuotes = () =>
  useQuery({
    queryKey: ["quotes", orgId()],
    queryFn: async (): Promise<Quote[]> => {
      const id = orgId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .eq("organization_id", id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as unknown as Quote[];
    },
  });

export const useQuote = (id?: string) =>
  useQuery({
    queryKey: ["quote", id],
    enabled: !!id,
    queryFn: async (): Promise<Quote | null> => {
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as unknown as Quote) ?? null;
    },
  });

export const useCreateQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_name: string; client_id?: string | null; client_phone?: string | null }) => {
      const id = orgId();
      if (!id) throw new Error("No hay organización seleccionada");
      const { data, error } = await supabase
        .from("quotations")
        .insert({ ...input, organization_id: id } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
};

export const useUpdateQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<Quote> }) => {
      const { error } = await supabase.from("quotations").update(input as never).eq("id", id);
      if (error) throw new Error(error.message);
      // los totales los recalcula siempre la base de datos
      const { error: rpcError } = await supabase.rpc("fn_recalc_quotation_totals", {
        p_quotation_id: id,
      } as never);
      if (rpcError) throw new Error(rpcError.message);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["quote", v.id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
};

export const useDeleteQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
};

/* ---------------- Líneas ---------------- */

export const useQuoteItems = (quotationId?: string) =>
  useQuery({
    queryKey: ["quote_items", quotationId],
    enabled: !!quotationId,
    queryFn: async (): Promise<QuoteItem[]> => {
      const { data, error } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotationId as string)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as QuoteItem[];
    },
  });

const recalcLine = async (itemId: string, keepPrice = false) => {
  const { data, error } = await supabase.rpc("fn_quote_line_recalc", {
    p_item_id: itemId,
    p_keep_price: keepPrice,
  } as never);
  if (error) throw new Error(error.message);
  return data as unknown as { warning: string | null; unit_price: number; suggested_price: number };
};

const invalidateQuote = (qc: ReturnType<typeof useQueryClient>, quotationId: string) => {
  qc.invalidateQueries({ queryKey: ["quote_items", quotationId] });
  qc.invalidateQueries({ queryKey: ["quote_extras", quotationId] });
  qc.invalidateQueries({ queryKey: ["quote", quotationId] });
  qc.invalidateQueries({ queryKey: ["quotes"] });
};

export const useAddQuoteItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<QuoteItem> & { quotation_id: string; item_type: QuoteItem["item_type"] }) => {
      const { data, error } = await supabase
        .from("quotation_items")
        .insert(input as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const itemId = (data as any).id as string;
      const res = await recalcLine(itemId, input.item_type === "manual");
      return { itemId, ...res };
    },
    onSuccess: (_d, v) => invalidateQuote(qc, v.quotation_id),
  });
};

export const useUpdateQuoteItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      quotationId,
      input,
      keepPrice = false,
    }: {
      id: string;
      quotationId: string;
      input: Partial<QuoteItem>;
      keepPrice?: boolean;
    }) => {
      const { error } = await supabase.from("quotation_items").update(input as never).eq("id", id);
      if (error) throw new Error(error.message);
      return recalcLine(id, keepPrice);
    },
    onSuccess: (_d, v) => invalidateQuote(qc, v.quotationId),
  });
};

export const useDeleteQuoteItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; quotationId: string }) => {
      const { error } = await supabase.from("quotation_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => invalidateQuote(qc, v.quotationId),
  });
};

/* ---------------- Extras ---------------- */

export const useQuoteExtras = (quotationId?: string) =>
  useQuery({
    queryKey: ["quote_extras", quotationId],
    enabled: !!quotationId,
    queryFn: async (): Promise<QuoteExtra[]> => {
      const { data, error } = await supabase
        .from("quotation_extras")
        .select("*")
        .eq("quotation_id", quotationId as string)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as QuoteExtra[];
    },
  });

export const useSaveQuoteExtra = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id?: string;
      quotationId: string;
      input: Partial<QuoteExtra> & { quotation_id: string };
    }) => {
      const payload = {
        ...input,
        total: Number(input.unit_price || 0) * Number(input.qty || 1),
      };
      if (id) {
        const { error } = await supabase.from("quotation_extras").update(payload as never).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("quotation_extras").insert(payload as never);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, v) => invalidateQuote(qc, v.quotationId),
  });
};

export const useDeleteQuoteExtra = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; quotationId: string }) => {
      const { error } = await supabase.from("quotation_extras").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => invalidateQuote(qc, v.quotationId),
  });
};

/* ---------------- Acciones de estado ---------------- */

export const useSendQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("fn_send_quotation", { p_quotation_id: id } as never);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_d, id) => invalidateQuote(qc, id),
  });
};

export const useSetQuoteStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Quote["status"] }) => {
      const { error } = await supabase.from("quotations").update({ status } as never).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => invalidateQuote(qc, v.id),
  });
};

export const useQuoteDrift = (quotationId?: string, enabled = false) =>
  useQuery({
    queryKey: ["quote_drift", quotationId],
    enabled: !!quotationId && enabled,
    staleTime: 0,
    queryFn: async (): Promise<QuoteDrift | null> => {
      const { data, error } = await supabase.rpc("fn_check_quote_drift", {
        p_quotation_id: quotationId,
      } as never);
      if (error) throw new Error(error.message);
      return (data as unknown as QuoteDrift) ?? null;
    },
  });

export const useRefreshQuotePrices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quotationId, itemIds }: { quotationId: string; itemIds: string[] }) => {
      for (const itemId of itemIds) await recalcLine(itemId, false);
      const { error } = await supabase
        .from("quotations")
        .update({ costs_changed: false } as never)
        .eq("id", quotationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      invalidateQuote(qc, v.quotationId);
      qc.invalidateQueries({ queryKey: ["quote_drift", v.quotationId] });
    },
  });
};

export const useKeepQuotedPrices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quotationId: string) => {
      const { error } = await supabase
        .from("quotations")
        .update({ costs_changed: false } as never)
        .eq("id", quotationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, id) => {
      invalidateQuote(qc, id);
      qc.invalidateQueries({ queryKey: ["quote_drift", id] });
    },
  });
};

/* ---------------- Catálogos ---------------- */

export const useClients = () =>
  useQuery({
    queryKey: ["clients", orgId()],
    queryFn: async (): Promise<Client[]> => {
      const id = orgId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", id)
        .order("name");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as Client[];
    },
  });

export const useCreateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Client> & { name: string }) => {
      const id = orgId();
      if (!id) throw new Error("No hay organización seleccionada");
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...input, organization_id: id } as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useDecorationTiers = () =>
  useQuery({
    queryKey: ["decoration_tiers", orgId()],
    queryFn: async (): Promise<DecorationTier[]> => {
      const id = orgId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("decoration_tiers")
        .select("*")
        .eq("organization_id", id)
        .eq("active", true)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as DecorationTier[];
    },
  });

export const useCostingSettingsRow = () =>
  useQuery({
    queryKey: ["costing_settings", orgId()],
    queryFn: async () => {
      const id = orgId();
      if (!id) return null;
      const { data, error } = await supabase
        .from("costing_settings")
        .select("*")
        .eq("organization_id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as any;
    },
  });
