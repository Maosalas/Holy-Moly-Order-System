import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIngredients } from "@/hooks/use-ingredients";
import { useUnits } from "@/hooks/use-purchasing";
import {
  useBaseQtyPreview,
  useDeleteComponent,
  usePreparation,
  usePreparationComponents,
  usePreparations,
  useSaveComponent,
  useUpdatePreparation,
} from "@/hooks/use-preparations";
import { PREPARATION_TYPE_LABELS, type PreparationType } from "@/types/preparation";

const money = (v: number | null | undefined, digits = 2) =>
  `₡${(v || 0).toLocaleString("es-CR", { maximumFractionDigits: digits })}`;
const num = (v: number) => v.toLocaleString("es-CR", { maximumFractionDigits: 2 });

interface Draft {
  key: string;
  id?: string;
  componentType: "ingredient" | "preparation";
  refId: string;
  qty: string;
  unit: string;
}

const emptyDraft = (): Draft => ({
  key: crypto.randomUUID(),
  componentType: "ingredient",
  refId: "",
  qty: "",
  unit: "g",
});

export default function PreparationEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: prep, isLoading } = usePreparation(id);
  const { data: components = [] } = usePreparationComponents(id);
  const { data: ingredientsRaw = [] } = useIngredients();
  const { data: preparations = [] } = usePreparations();
  const { data: units = [] } = useUnits();
  const updatePrep = useUpdatePreparation();
  const saveComponent = useSaveComponent();
  const deleteComponent = useDeleteComponent();

  const ingredients = ingredientsRaw as any[];
  const otherPreps = useMemo(() => preparations.filter((p) => p.id !== id), [preparations, id]);

  const [form, setForm] = useState({
    name: "",
    type: "base" as PreparationType,
    yield_g: "",
    yield_portions: "",
    waste_pct: "",
    time_minutes: "",
    setup_minutes: "",
    oven_minutes: "",
    oven_temp_c: "",
    procedure_text: "",
  });

  useEffect(() => {
    if (!prep) return;
    setForm({
      name: prep.name,
      type: prep.type,
      yield_g: String(prep.yield_g ?? ""),
      yield_portions: prep.yield_portions == null ? "" : String(prep.yield_portions),
      waste_pct: String(prep.waste_pct ?? 0),
      time_minutes: String(prep.time_minutes ?? 0),
      setup_minutes: String(prep.setup_minutes ?? 0),
      oven_minutes: String(prep.oven_minutes ?? 0),
      oven_temp_c: prep.oven_temp_c == null ? "" : String(prep.oven_temp_c),
      procedure_text: prep.procedure_text ?? "",
    });
  }, [prep?.id, prep?.updated_at]);

  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const saveForm = async () => {
    if (!id) return;
    if (!form.name.trim() || Number(form.yield_g) <= 0) {
      toast({
        title: "Datos incompletos",
        description: "El nombre y el rendimiento en gramos son obligatorios.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updatePrep.mutateAsync({
        id,
        input: {
          name: form.name.trim(),
          type: form.type,
          yield_g: Number(form.yield_g),
          yield_portions: form.yield_portions === "" ? null : Number(form.yield_portions),
          waste_pct: Number(form.waste_pct) || 0,
          time_minutes: Number(form.time_minutes) || 0,
          setup_minutes: Number(form.setup_minutes) || 0,
          oven_minutes: Number(form.oven_minutes) || 0,
          oven_temp_c: form.oven_temp_c === "" ? null : Number(form.oven_temp_c),
          procedure_text: form.procedure_text.trim() || null,
        },
      });
      toast({ title: "Elaboración guardada" });
    } catch (e: any) {
      toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" });
    }
  };

  const addComponent = async () => {
    if (!id) return;
    if (!draft.refId || Number(draft.qty) <= 0) {
      toast({
        title: "Componente incompleto",
        description: "Elegí el insumo o la elaboración y una cantidad mayor que cero.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveComponent.mutateAsync({
        input: {
          preparation_id: id,
          component_type: draft.componentType,
          ingredient_id: draft.componentType === "ingredient" ? draft.refId : null,
          child_prep_id: draft.componentType === "preparation" ? draft.refId : null,
          qty: Number(draft.qty),
          unit_code: draft.unit,
          sort_order: components.length,
        },
      });
      setDraft(emptyDraft());
    } catch (e: any) {
      // El error del trigger de ciclos se muestra sin perder lo escrito.
      toast({ title: "No se pudo agregar", description: e.message, variant: "destructive" });
    }
  };

  const nameOf = (c: { component_type: string; ingredient_id: string | null; child_prep_id: string | null }) =>
    c.component_type === "ingredient"
      ? ingredients.find((i) => i.id === c.ingredient_id)?.name ?? "Insumo"
      : preparations.find((p) => p.id === c.child_prep_id)?.name ?? "Elaboración";

  const costs = prep?.preparation_costs;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prep) {
    return (
      <div className="container mx-auto py-10 text-center space-y-4">
        <p className="text-muted-foreground">No se encontró la elaboración.</p>
        <Button variant="outline" onClick={() => navigate("/preparations")}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/preparations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{prep.name}</h1>
          <p className="text-sm text-muted-foreground">
            {PREPARATION_TYPE_LABELS[prep.type] ?? prep.type} · tanda de {num(prep.yield_g)} g
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Datos de la elaboración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <select
                    id="type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as PreparationType })}
                  >
                    {Object.entries(PREPARATION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yield_g">Rendimiento (g)</Label>
                  <Input
                    id="yield_g"
                    type="number"
                    value={form.yield_g}
                    onChange={(e) => setForm({ ...form, yield_g: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cuánto pesa la tanda completa que sale de esta receta.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yield_portions">Rendimiento en porciones (opcional)</Label>
                  <Input
                    id="yield_portions"
                    type="number"
                    value={form.yield_portions}
                    onChange={(e) => setForm({ ...form, yield_portions: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waste_pct">Merma (%)</Label>
                  <Input
                    id="waste_pct"
                    type="number"
                    value={form.waste_pct}
                    onChange={(e) => setForm({ ...form, waste_pct: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_minutes">Tiempo de trabajo (min)</Label>
                  <Input
                    id="time_minutes"
                    type="number"
                    value={form.time_minutes}
                    onChange={(e) => setForm({ ...form, time_minutes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup_minutes">Tiempo de setup (min)</Label>
                  <Input
                    id="setup_minutes"
                    type="number"
                    value={form.setup_minutes}
                    onChange={(e) => setForm({ ...form, setup_minutes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oven_minutes">Tiempo de horno (min)</Label>
                  <Input
                    id="oven_minutes"
                    type="number"
                    value={form.oven_minutes}
                    onChange={(e) => setForm({ ...form, oven_minutes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oven_temp_c">Temperatura del horno (°C)</Label>
                  <Input
                    id="oven_temp_c"
                    type="number"
                    value={form.oven_temp_c}
                    onChange={(e) => setForm({ ...form, oven_temp_c: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="procedure_text">Procedimiento</Label>
                <Textarea
                  id="procedure_text"
                  rows={5}
                  value={form.procedure_text}
                  onChange={(e) => setForm({ ...form, procedure_text: e.target.value })}
                />
              </div>
              <Button onClick={saveForm} disabled={updatePrep.isPending}>
                {updatePrep.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Componentes</CardTitle>
              <CardDescription>
                Cada línea puede ser un insumo o otra elaboración. Las elaboraciones se miden en gramos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {components.length === 0 && (
                <p className="text-sm text-muted-foreground">Todavía no hay componentes.</p>
              )}
              {components.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{nameOf(c)}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.component_type === "ingredient" ? "Insumo" : "Elaboración"} · {num(c.qty)} {c.unit_code}
                      {" → "}
                      <span className="font-mono">{num(c.base_qty)}</span> en unidad base
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await deleteComponent.mutateAsync({ id: c.id, preparationId: c.preparation_id });
                      } catch (e: any) {
                        toast({ title: "No se pudo eliminar", description: e.message, variant: "destructive" });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              <Separator />

              <DraftRow
                draft={draft}
                setDraft={setDraft}
                ingredients={ingredients}
                preparations={otherPreps}
                units={units}
              />
              <Button onClick={addComponent} disabled={saveComponent.isPending} variant="secondary">
                {saveComponent.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Agregar componente
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Desglose en vivo</CardTitle>
              <CardDescription>Calculado en la base de datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Materia prima" value={money(costs?.material_cost, 0)} />
              <Row label="Mano de obra" value={money(costs?.labor_cost, 0)} />
              <Row label="Energía" value={money(costs?.energy_cost, 0)} />
              <Separator />
              <Row label="Costo de la tanda" value={money(costs?.batch_cost, 0)} strong />
              <Row label="Costo por gramo" value={money(costs?.cost_per_g, 2)} />
              <Row
                label="Costo por porción"
                value={costs?.cost_per_portion == null ? "—" : money(costs.cost_per_portion, 0)}
              />
              {Array.isArray(costs?.breakdown) && costs!.breakdown.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground">Por componente</p>
                  {costs!.breakdown.map((b, i) => (
                    <div key={i} className="flex justify-between gap-2 text-xs">
                      <span className="truncate">
                        {b.name} · {num(Number(b.qty))} {b.unit}
                      </span>
                      <span className="font-mono">{money(Number(b.total), 0)}</span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-mono font-semibold" : "font-mono"}>{value}</span>
    </div>
  );
}

function DraftRow({
  draft,
  setDraft,
  ingredients,
  preparations,
  units,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  ingredients: any[];
  preparations: { id: string; name: string }[];
  units: { code: string; name: string }[];
}) {
  const ing = ingredients.find((i) => i.id === draft.refId);
  // Los insumos llegan en camelCase desde la capa de datos
  const ingBaseUnit = ing?.baseUnit ?? ing?.base_unit ?? null;
  const ingDensity = ing?.densityGMl ?? ing?.density_g_ml ?? null;
  const ingUnitWeight = ing?.unitWeightG ?? ing?.unit_weight_g ?? null;

  const preview = useBaseQtyPreview({
    baseUnit: draft.componentType === "preparation" ? "g" : ingBaseUnit,
    density: draft.componentType === "preparation" ? null : ingDensity,
    unitWeight: draft.componentType === "preparation" ? null : ingUnitWeight,
    qty: Number(draft.qty) || 0,
    unit: draft.unit,
  });

  const baseUnitLabel = draft.componentType === "preparation" ? "g" : ingBaseUnit ?? "";
  const emptyList =
    draft.componentType === "ingredient" ? ingredients.length === 0 : preparations.length === 0;

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draft.componentType}
            onChange={(e) =>
              setDraft({
                ...draft,
                componentType: e.target.value as Draft["componentType"],
                refId: "",
                unit: e.target.value === "preparation" ? "g" : draft.unit,
              })
            }
          >
            <option value="ingredient">Insumo</option>
            <option value="preparation">Elaboración</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{draft.componentType === "ingredient" ? "Insumo" : "Elaboración"}</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draft.refId}
            onChange={(e) => setDraft({ ...draft, refId: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {(draft.componentType === "ingredient" ? ingredients : preparations).map((o: any) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cantidad</Label>
          <Input
            type="number"
            value={draft.qty}
            onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unidad</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draft.unit}
            onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
          >
            {units.map((u) => (
              <option key={u.code} value={u.code}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {preview.isError ? (
          <span className="text-destructive">{(preview.error as Error).message}</span>
        ) : preview.data != null ? (
          <>
            Equivale a <span className="font-mono">{num(preview.data)}</span> {baseUnitLabel}
          </>
        ) : (
          "Escribí la cantidad para ver la conversión a unidad base."
        )}
      </p>
    </div>
  );
}
