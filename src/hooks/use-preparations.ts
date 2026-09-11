import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentOrganizationId } from "@/lib/supabaseData";
import type {
  Preparation,
  PreparationComponent,
  PreparationInput,
} from "@/types/preparation";

const orgId = () => getCurrentOrganizationId();

export const usePreparations = () =>
  useQuery({
    queryKey: ["preparations", orgId()],
    queryFn: async (): Promise<Preparation[]> => {
      const id = orgId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("preparations")
        .select("*, preparation_costs(*)")
        .eq("organization_id", id)
        .order("name");
      if (error) throw new Error(error.message);
      return (data || []).map((row: any) => ({
        ...row,
        preparation_costs: Array.isArray(row.preparation_costs)
          ? row.preparation_costs[0] ?? null
          : row.preparation_costs ?? null,
      })) as unknown as Preparation[];
    },
  });

export const usePreparation = (id?: string) =>
  useQuery({
    queryKey: ["preparation", id],
    enabled: !!id,
    queryFn: async (): Promise<Preparation | null> => {
      const { data, error } = await supabase
        .from("preparations")
        .select("*, preparation_costs(*)")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const row = data as any;
      return {
        ...row,
        preparation_costs: Array.isArray(row.preparation_costs)
          ? row.preparation_costs[0] ?? null
          : row.preparation_costs ?? null,
      } as unknown as Preparation;
    },
  });

export const usePreparationComponents = (prepId?: string) =>
  useQuery({
    queryKey: ["preparation_components", prepId],
    enabled: !!prepId,
    queryFn: async (): Promise<PreparationComponent[]> => {
      const { data, error } = await supabase
        .from("preparation_components")
        .select("*")
        .eq("preparation_id", prepId as string)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data || []) as unknown as PreparationComponent[];
    },
  });

/** Cuántas otras elaboraciones usan cada elaboración */
export const usePreparationUsage = () =>
  useQuery({
    queryKey: ["preparation_usage", orgId()],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("preparation_components")
        .select("child_prep_id")
        .eq("component_type", "preparation");
      if (error) throw new Error(error.message);
      const counts: Record<string, number> = {};
      for (const row of (data || []) as any[]) {
        if (row.child_prep_id) counts[row.child_prep_id] = (counts[row.child_prep_id] || 0) + 1;
      }
      return counts;
    },
  });

export const useCreatePreparation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PreparationInput) => {
      const id = orgId();
      if (!id) throw new Error("No hay organización seleccionada");
      const { data, error } = await supabase
        .from("preparations")
        .insert({ ...input, organization_id: id } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preparations"] }),
  });
};

export const useUpdatePreparation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<PreparationInput> }) => {
      const { error } = await supabase
        .from("preparations")
        .update(input as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["preparations"] });
      qc.invalidateQueries({ queryKey: ["preparation", vars.id] });
    },
  });
};

export const useDeletePreparation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("preparations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preparations"] }),
  });
};

export interface ComponentInput {
  preparation_id: string;
  component_type: "ingredient" | "preparation";
  ingredient_id: string | null;
  child_prep_id: string | null;
  qty: number;
  unit_code: string;
  sort_order: number;
}

const invalidateComponents = (qc: ReturnType<typeof useQueryClient>, prepId: string) => {
  qc.invalidateQueries({ queryKey: ["preparation_components", prepId] });
  qc.invalidateQueries({ queryKey: ["preparation", prepId] });
  qc.invalidateQueries({ queryKey: ["preparations"] });
  qc.invalidateQueries({ queryKey: ["preparation_usage"] });
};

export const useSaveComponent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ComponentInput }) => {
      if (id) {
        const { error } = await supabase
          .from("preparation_components")
          .update(input as never)
          .eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("preparation_components")
          .insert(input as never);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, vars) => invalidateComponents(qc, vars.input.preparation_id),
  });
};

export const useDeleteComponent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; preparationId: string }) => {
      const { error } = await supabase.from("preparation_components").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => invalidateComponents(qc, vars.preparationId),
  });
};

/** Conversión a unidad base calculada en la base de datos */
export const useBaseQtyPreview = (params: {
  baseUnit: string | null;
  density: number | null;
  unitWeight: number | null;
  qty: number;
  unit: string;
}) =>
  useQuery({
    queryKey: ["base_qty", params],
    enabled: !!params.baseUnit && !!params.unit && params.qty > 0,
    retry: false,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("fn_to_base_qty", {
        p_base_unit: params.baseUnit,
        p_density: params.density,
        p_unit_weight: params.unitWeight,
        p_qty: params.qty,
        p_unit: params.unit,
      } as never);
      if (error) throw new Error(error.message);
      return Number(data);
    },
  });
