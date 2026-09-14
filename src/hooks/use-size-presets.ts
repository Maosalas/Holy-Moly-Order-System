import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentOrganizationId } from "@/lib/supabaseData";
import type {
  SizePreset,
  SizePresetComponent,
  SizePresetDefault,
} from "@/types/size-preset";

const orgId = () => getCurrentOrganizationId();

export const useSizePresets = () =>
  useQuery({
    queryKey: ["size_presets", orgId()],
    queryFn: async (): Promise<SizePreset[]> => {
      const id = orgId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("size_presets")
        .select("*")
        .eq("organization_id", id)
        .order("sort_order")
        .order("name");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as SizePreset[];
    },
  });

/** Cuántos productos usan cada tamaño del catálogo. */
export const useSizePresetUsage = () =>
  useQuery({
    queryKey: ["size_preset_usage", orgId()],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("product_sizes")
        .select("size_preset_id, product_id")
        .not("size_preset_id", "is", null);
      if (error) throw new Error(error.message);
      const map: Record<string, Set<string>> = {};
      for (const row of (data || []) as any[]) {
        (map[row.size_preset_id] ||= new Set()).add(row.product_id);
      }
      return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.size]));
    },
  });

export const useSavePreset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: Partial<SizePreset> }) => {
      if (id) {
        const { error } = await supabase.from("size_presets").update(input as never).eq("id", id);
        if (error) throw new Error(error.message);
        return id;
      }
      const org = orgId();
      if (!org) throw new Error("No hay organización seleccionada");
      const { data, error } = await supabase
        .from("size_presets")
        .insert({ ...input, organization_id: org } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["size_presets"] }),
  });
};

export const useDeletePreset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("size_presets").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["size_presets"] });
      qc.invalidateQueries({ queryKey: ["size_preset_usage"] });
    },
  });
};

/* -------- componentes fijos del preset (caja, base) -------- */

export const usePresetComponents = (presetId?: string) =>
  useQuery({
    queryKey: ["size_preset_components", presetId],
    enabled: !!presetId,
    queryFn: async (): Promise<SizePresetComponent[]> => {
      const { data, error } = await supabase
        .from("size_preset_components")
        .select("*")
        .eq("size_preset_id", presetId as string)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as SizePresetComponent[];
    },
  });

export const useSavePresetComponent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id?: string;
      input: Partial<SizePresetComponent> & { size_preset_id: string };
    }) => {
      if (id) {
        const { error } = await supabase
          .from("size_preset_components")
          .update(input as never)
          .eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("size_preset_components").insert(input as never);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["size_preset_components", v.input.size_preset_id] });
      qc.invalidateQueries({ queryKey: ["product_cost"] });
    },
  });
};

export const useDeletePresetComponent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; presetId: string }) => {
      const { error } = await supabase.from("size_preset_components").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["size_preset_components", v.presetId] });
      qc.invalidateQueries({ queryKey: ["product_cost"] });
    },
  });
};

/* -------- cantidades sugeridas -------- */

export const usePresetDefaults = (presetId?: string) =>
  useQuery({
    queryKey: ["size_preset_defaults", presetId],
    enabled: !!presetId,
    queryFn: async (): Promise<SizePresetDefault[]> => {
      const { data, error } = await supabase
        .from("size_preset_defaults")
        .select("*")
        .eq("size_preset_id", presetId as string)
        .order("role");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as SizePresetDefault[];
    },
  });

export const useSavePresetDefault = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { size_preset_id: string; role: string; qty_g: number }) => {
      const { error } = await supabase
        .from("size_preset_defaults")
        .upsert(input as never, { onConflict: "size_preset_id,role" });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["size_preset_defaults", v.size_preset_id] }),
  });
};

export const useDeletePresetDefault = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; presetId: string }) => {
      const { error } = await supabase.from("size_preset_defaults").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["size_preset_defaults", v.presetId] }),
  });
};
