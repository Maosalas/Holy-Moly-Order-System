import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SearchSelect } from "@/components/ui/search-select";
import { useIngredients } from "@/hooks/use-ingredients";
import { useSupplies } from "@/hooks/use-supplies";
import { useUnits } from "@/hooks/use-purchasing";
import {
  useDeletePreset,
  useDeletePresetComponent,
  useDeletePresetDefault,
  usePresetComponents,
  usePresetDefaults,
  useSavePreset,
  useSavePresetComponent,
  useSavePresetDefault,
  useSizePresetUsage,
  useSizePresets,
} from "@/hooks/use-size-presets";
import {
  PRESET_DEFAULT_ROLE_LABELS,
  type SizePreset,
  type SizePresetComponentType,
  type SizePresetDefaultRole,
} from "@/types/size-preset";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm";

export default function SizePresets() {
  const { data: presets = [], isLoading } = useSizePresets();
  const { data: usage = {} } = useSizePresetUsage();
  const savePreset = useSavePreset();
  const deletePreset = useDeletePreset();

  const [detail, setDetail] = useState<SizePreset | null>(null);

  const addPreset = async () => {
    try {
      await savePreset.mutateAsync({
        input: { name: `Tamaño ${presets.length + 1}`, sort_order: presets.length },
      });
    } catch (e: any) {
      toast({ title: "No se pudo crear", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Catálogo de tamaños</h1>
          <p className="text-muted-foreground">
            Definí una vez cada tamaño con su caja y sus cantidades sugeridas, y reutilizalo en todos
            los productos.
          </p>
        </div>
        <Button onClick={addPreset} disabled={savePreset.isPending}>
          {savePreset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="mr-2 h-4 w-4" /> Nuevo tamaño
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tamaños</CardTitle>
          <CardDescription>
            Las porciones y los minutos se heredan al agregar el tamaño a un producto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : presets.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Todavía no hay tamaños en el catálogo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Nombre</TableHead>
                    <TableHead>Porciones</TableHead>
                    <TableHead>Peso objetivo (g)</TableHead>
                    <TableHead>Armado (min)</TableHead>
                    <TableHead>Horno (min)</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presets.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Input
                          defaultValue={p.name}
                          onBlur={(e) =>
                            e.target.value !== p.name &&
                            savePreset.mutate({ id: p.id, input: { name: e.target.value } })
                          }
                        />
                      </TableCell>
                      {(
                        [
                          ["portions", p.portions],
                          ["target_weight_g", p.target_weight_g],
                          ["assembly_minutes", p.assembly_minutes],
                          ["oven_minutes", p.oven_minutes],
                        ] as const
                      ).map(([field, value]) => (
                        <TableCell key={field}>
                          <Input
                            type="number"
                            defaultValue={value ?? ""}
                            onBlur={(e) =>
                              savePreset.mutate({
                                id: p.id,
                                input: {
                                  [field]: e.target.value === "" ? null : Number(e.target.value),
                                } as any,
                              })
                            }
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Checkbox
                          checked={p.active}
                          onCheckedChange={(c) =>
                            savePreset.mutate({ id: p.id, input: { active: !!c } })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{usage[p.id] ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => setDetail(p)}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              await deletePreset.mutateAsync(p.id);
                              toast({ title: "Tamaño eliminado del catálogo" });
                            } catch (e: any) {
                              toast({
                                title: "No se pudo eliminar",
                                description: e.message,
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>
              La caja y la base que siempre lleva este tamaño, y las cantidades sugeridas al usarlo en
              un producto.
            </DialogDescription>
          </DialogHeader>
          {detail && <PresetDetail preset={detail} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PresetDetail({ preset }: { preset: SizePreset }) {
  const { data: comps = [] } = usePresetComponents(preset.id);
  const { data: defaults = [] } = usePresetDefaults(preset.id);
  const { data: ingredients = [] } = useIngredients();
  const { data: supplies = [] } = useSupplies();
  const { data: units = [] } = useUnits();

  const saveComp = useSavePresetComponent();
  const deleteComp = useDeletePresetComponent();
  const saveDefault = useSavePresetDefault();
  const deleteDefault = useDeletePresetDefault();

  const [type, setType] = useState<SizePresetComponentType>("supply");
  const [refId, setRefId] = useState("");
  const [role, setRole] = useState("empaque");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("unidad");

  const options = (type === "supply" ? (supplies as any[]) : (ingredients as any[])).map((o) => ({
    id: o.id,
    name: o.name,
  }));

  const nameOf = (c: { component_type: string; supply_id: string | null; ingredient_id: string | null }) =>
    c.component_type === "supply"
      ? (supplies as any[]).find((s) => s.id === c.supply_id)?.name ?? "—"
      : (ingredients as any[]).find((i) => i.id === c.ingredient_id)?.name ?? "—";

  const add = async () => {
    if (!refId || Number(qty) <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Elegí el componente y una cantidad mayor que cero.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveComp.mutateAsync({
        input: {
          size_preset_id: preset.id,
          component_type: type,
          supply_id: type === "supply" ? refId : null,
          ingredient_id: type === "ingredient" ? refId : null,
          role,
          qty: Number(qty),
          unit_code: unit,
        },
      });
      setRefId("");
    } catch (e: any) {
      toast({ title: "No se pudo agregar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 font-semibold">Componentes fijos</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {comps.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{nameOf(c)}</TableCell>
                <TableCell>{c.role}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    defaultValue={c.qty}
                    onBlur={(e) =>
                      Number(e.target.value) !== c.qty &&
                      saveComp.mutate({
                        id: c.id,
                        input: { size_preset_id: preset.id, qty: Number(e.target.value) },
                      })
                    }
                  />
                </TableCell>
                <TableCell>{c.unit_code}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteComp.mutate({ id: c.id, presetId: preset.id })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {comps.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Sin componentes fijos todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="mt-3 grid gap-2 md:grid-cols-6">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <SearchSelect
              className={selectClass}
              value={type}
              onChange={(e) => {
                const v = e.target.value as SizePresetComponentType;
                setType(v);
                setRefId("");
                setUnit(v === "supply" ? "unidad" : "g");
              }}
            >
              <option value="supply">Suministro</option>
              <option value="ingredient">Ingrediente</option>
            </SearchSelect>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Componente</Label>
            <SearchSelect
              className={selectClass}
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rol</Label>
            <SearchSelect
              className={selectClass}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="empaque">Empaque</option>
              <option value="base">Base</option>
              <option value="otro">Otro</option>
            </SearchSelect>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cantidad</Label>
            <Input type="number" className="h-9" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Unidad</Label>
            <SearchSelect
              className={selectClass}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              {units.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.code}
                </option>
              ))}
            </SearchSelect>
          </div>
        </div>
        <Button className="mt-3" onClick={add} disabled={saveComp.isPending}>
          {saveComp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="mr-2 h-4 w-4" /> Agregar componente
        </Button>
      </div>

      <Separator />

      <div>
        <h3 className="mb-1 font-semibold">Cantidades sugeridas (g)</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Se copian como líneas editables del producto al agregar el tamaño. Cambiarlas ahí no afecta
          al catálogo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {(Object.keys(PRESET_DEFAULT_ROLE_LABELS) as SizePresetDefaultRole[]).map((r) => {
            const row = defaults.find((d) => d.role === r);
            return (
              <div key={r} className="space-y-1">
                <Label className="text-xs">{PRESET_DEFAULT_ROLE_LABELS[r]}</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    defaultValue={row?.qty_g ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        if (row) deleteDefault.mutate({ id: row.id, presetId: preset.id });
                        return;
                      }
                      if (Number(v) !== row?.qty_g)
                        saveDefault.mutate({
                          size_preset_id: preset.id,
                          role: r,
                          qty_g: Number(v),
                        });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
