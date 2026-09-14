import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentOrganizationId } from "@/lib/supabaseData";
import type {
  Product,
  ProductComponent,
  ProductCostResult,
  ProductSize,
  ProductVariant,
} from "@/types/product";

const orgId = () => getCurrentOrganizationId();

export const useProducts = () =>
  useQuery({
    queryKey: ["products", orgId()],
    queryFn: async (): Promise<Product[]> => {
      const id = orgId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("organization_id", id)
        .order("name");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as Product[];
    },
  });

export const useProduct = (id?: string) =>
  useQuery({
    queryKey: ["product", id],
    enabled: !!id,
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as unknown as Product) ?? null;
    },
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; category: string | null; price_basis: "unit" | "portion" }) => {
      const id = orgId();
      if (!id) throw new Error("No hay organización seleccionada");
      const { data, error } = await supabase
        .from("products")
        .insert({ ...input, organization_id: id } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<Product> }) => {
      const { error } = await supabase.from("products").update(input as never).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", v.id] });
    },
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
};

export const useDuplicateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase.rpc("fn_duplicate_product", {
        p_product_id: id,
        p_name: name,
      } as never);
      if (error) throw new Error(error.message);
      return data as unknown as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
};

/** Agrega un tamaño a partir de un preset del catálogo (hereda empaque y copia cantidades). */
export const useApplySizePreset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, presetId }: { productId: string; presetId: string }) => {
      const { data, error } = await supabase.rpc("fn_apply_size_preset", {
        p_product_id: productId,
        p_preset_id: presetId,
      } as never);
      if (error) throw new Error(error.message);
      return data as unknown as string;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["product_sizes", v.productId] });
      qc.invalidateQueries({ queryKey: ["product_components", v.productId] });
      qc.invalidateQueries({ queryKey: ["product_cost"] });
      qc.invalidateQueries({ queryKey: ["size_preset_usage"] });
    },
  });
};

/* ---------------- Tamaños ---------------- */

export const useProductSizes = (productId?: string) =>
  useQuery({
    queryKey: ["product_sizes", productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductSize[]> => {
      const { data, error } = await supabase
        .from("product_sizes")
        .select("*")
        .eq("product_id", productId as string)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as ProductSize[];
    },
  });

export const useSaveSize = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: Partial<ProductSize> & { product_id: string } }) => {
      if (id) {
        const { error } = await supabase.from("product_sizes").update(input as never).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("product_sizes").insert(input as never);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["product_sizes", v.input.product_id] });
      qc.invalidateQueries({ queryKey: ["product_cost"] });
    },
  });
};

export const useDeleteSize = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; productId: string }) => {
      const { error } = await supabase.from("product_sizes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["product_sizes", v.productId] });
      qc.invalidateQueries({ queryKey: ["product_components", v.productId] });
    },
  });
};

/* ---------------- Variantes ---------------- */

export const useProductVariants = (productId?: string) =>
  useQuery({
    queryKey: ["product_variants", productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductVariant[]> => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId as string)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as ProductVariant[];
    },
  });

export const useSaveVariant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: Partial<ProductVariant> & { product_id: string } }) => {
      if (id) {
        const { error } = await supabase.from("product_variants").update(input as never).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("product_variants").insert(input as never);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["product_variants", v.input.product_id] });
      qc.invalidateQueries({ queryKey: ["product_cost"] });
    },
  });
};

export const useDeleteVariant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; productId: string }) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["product_variants", v.productId] });
      qc.invalidateQueries({ queryKey: ["product_components", v.productId] });
    },
  });
};

/* ---------------- Composición ---------------- */

export const useProductComponents = (productId?: string) =>
  useQuery({
    queryKey: ["product_components", productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductComponent[]> => {
      const { data, error } = await supabase
        .from("product_components")
        .select("*")
        .eq("product_id", productId as string)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as ProductComponent[];
    },
  });

export type ComponentPayload = Omit<ProductComponent, "id" | "base_qty">;

const invalidate = (qc: ReturnType<typeof useQueryClient>, productId: string) => {
  qc.invalidateQueries({ queryKey: ["product_components", productId] });
  qc.invalidateQueries({ queryKey: ["product_cost"] });
};

export const useSaveComponentRow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ComponentPayload }) => {
      if (id) {
        const { error } = await supabase.from("product_components").update(input as never).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("product_components").insert(input as never);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, v) => invalidate(qc, v.input.product_id),
  });
};

export const useSaveComponentRows = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows }: { productId: string; rows: ComponentPayload[] }) => {
      if (!rows.length) return;
      const { error } = await supabase.from("product_components").insert(rows as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => invalidate(qc, v.productId),
  });
};

export const useDeleteComponentRow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; productId: string }) => {
      const { error } = await supabase.from("product_components").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => invalidate(qc, v.productId),
  });
};

/* ---------------- Costeo en vivo ---------------- */

export const useProductCost = (params: {
  productId?: string;
  sizeId: string | null;
  variantId: string | null;
  includeOptional: boolean;
}) =>
  useQuery({
    queryKey: ["product_cost", params],
    enabled: !!params.productId,
    retry: false,
    queryFn: async (): Promise<ProductCostResult> => {
      const { data, error } = await supabase.rpc("fn_calc_product_cost", {
        p_product_id: params.productId,
        p_size_id: params.sizeId,
        p_variant_id: params.variantId,
        p_include_optional: params.includeOptional,
      } as never);
      if (error) throw new Error(error.message);
      return data as unknown as ProductCostResult;
    },
  });
