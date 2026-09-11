import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIngredients } from "@/hooks/use-ingredients";
import { useSupplies } from "@/hooks/use-supplies";
import { usePreparations } from "@/hooks/use-preparations";
import { useUnits } from "@/hooks/use-purchasing";
import {
  useDeleteComponentRow,
  useDeleteSize,
  useDeleteVariant,
  useProduct,
  useProductComponents,
  useProductCost,
  useProductSizes,
  useProductVariants,
  useSaveComponentRow,
  useSaveComponentRows,
  useSaveSize,
  useSaveVariant,
  type ComponentPayload,
} from "@/hooks/use-products";
import {
  COMPONENT_TYPE_LABELS,
  ROLE_LABELS,
  type ProductComponent,
  type ProductComponentRole,
  type ProductComponentType,
} from "@/types/product";

const money = (v: number | null | undefined, digits = 0) =>
  `₡${(v || 0).toLocaleString("es-CR", { maximumFractionDigits: digits })}`;
const num = (v: number | null | undefined, digits = 2) =>
  (v || 0).toLocaleString("es-CR", { maximumFractionDigits: digits });

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm";

export default function ProductEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading } = useProduct(id);
  const { data: sizes = [] } = useProductSizes(id);
  const { data: variants = [] } = useProductVariants(id);
  const { data: components = [] } = useProductComponents(id);
  const { data: preparations = [] } = usePreparations();
  const { data: ingredientsRaw = [] } = useIngredients();
  const { data: suppliesRaw = [] } = useSupplies();
  const { data: units = [] } = useUnits();

  const saveSize = useSaveSize();
  const deleteSize = useDeleteSize();
  const saveVariant = useSaveVariant();
  const deleteVariant = useDeleteVariant();
  const saveRow = useSaveComponentRow();
  const saveRows = useSaveComponentRows();
  const deleteRow = useDeleteComponentRow();

  const ingredients = ingredientsRaw as any[];
  const supplies = suppliesRaw as any[];

  /* ------- selector superior ------- */
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [includeOptional, setIncludeOptional] = useState(false);
  const [ownPrice, setOwnPrice] = useState("");

  useEffect(() => {
    if (sizes.length && !sizes.some((s) => s.id === sizeId)) {
      setSizeId((sizes.find((s) => s.is_default) ?? sizes[0]).id);
    }
  }, [sizes, sizeId]);
  useEffect(() => {
    if (variants.length && !variants.some((v) => v.id === variantId)) {
      setVariantId((variants.find((v) => v.is_default) ?? variants[0]).id);
    }
  }, [variants, variantId]);

  const { data: cost, error: costError, isFetching } = useProductCost({
    productId: id,
    sizeId,
    variantId,
    includeOptional,
  });

  const priceValue = Number(ownPrice) || 0;
  const margin = priceValue > 0 && cost ? ((priceValue - cost.total_cost) / priceValue) * 100 : null;
  const laborHours = cost ? (cost.labor_minutes || 0) / 60 : 0;
  const hourlyPay =
    cost && priceValue > 0 && laborHours > 0
      ? (priceValue - (cost.total_cost - cost.labor_cost)) / laborHours
      : null;

  const nameOf = (row: ProductComponent) => {
    if (row.component_type === "preparation")
      return preparations.find((p) => p.id === row.preparation_id)?.name ?? "—";
    if (row.component_type === "ingredient")
      return ingredients.find((i) => i.id === row.ingredient_id)?.name ?? "—";
    return supplies.find((s) => s.id === row.supply_id)?.name ?? "—";
  };

  /* ------- nueva fila de composición ------- */
  const [newRow, setNewRow] = useState<{
    componentType: ProductComponentType;
    refId: string;
    role: ProductComponentRole;
    qty: string;
    unit: string;
    sizeId: string;
    variantId: string;
    isOptional: boolean;
  }>({
    componentType: "preparation",
    refId: "",
    role: "base",
    qty: "",
    unit: "g",
    sizeId: "",
    variantId: "",
    isOptional: false,
  });

  const buildPayload = (
    r: typeof newRow,
    overrides?: Partial<ComponentPayload>,
  ): ComponentPayload => ({
    product_id: id as string,
    size_id: r.sizeId || null,
    variant_id: r.variantId || null,
    component_type: r.componentType,
    preparation_id: r.componentType === "preparation" ? r.refId : null,
    ingredient_id: r.componentType === "ingredient" ? r.refId : null,
    supply_id: r.componentType === "supply" ? r.refId : null,
    role: r.role,
    qty: Number(r.qty),
    unit_code: r.unit,
    is_optional: r.isOptional,
    sort_order: components.length,
    ...overrides,
  });

  const addRow = async () => {
    if (!newRow.refId || Number(newRow.qty) <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Elegí el componente y escribí una cantidad mayor que cero.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveRow.mutateAsync({ input: buildPayload(newRow) });
      setNewRow({ ...newRow, refId: "", qty: "" });
    } catch (e: any) {
      toast({ title: "No se pudo agregar", description: e.message, variant: "destructive" });
    }
  };

  const patchRow = async (row: ProductComponent, patch: Partial<ComponentPayload>) => {
    try {
      await saveRow.mutateAsync({
        id: row.id,
        input: {
          product_id: row.product_id,
          size_id: row.size_id,
          variant_id: row.variant_id,
          component_type: row.component_type,
          preparation_id: row.preparation_id,
          ingredient_id: row.ingredient_id,
          supply_id: row.supply_id,
          role: row.role,
          qty: row.qty,
          unit_code: row.unit_code,
          is_optional: row.is_optional,
          sort_order: row.sort_order,
          ...patch,
        },
      });
    } catch (e: any) {
      toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" });
    }
  };

  /* ------- generar tamaños por factor ------- */
  const [genOpen, setGenOpen] = useState(false);
  const [genBase, setGenBase] = useState("");
  const [factors, setFactors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (genOpen && sizes.length) {
      const base = sizes.find((s) => s.is_default) ?? sizes[0];
      setGenBase(base.id);
      setFactors(
        Object.fromEntries(sizes.filter((s) => s.id !== base.id).map((s) => [s.id, "1"])),
      );
    }
  }, [genOpen, sizes]);

  const generateSizes = async () => {
    const baseRows = components.filter((c) => c.size_id === genBase || c.size_id === null);
    if (!genBase || baseRows.length === 0) {
      toast({
        title: "Nada que copiar",
        description: "El tamaño base no tiene componentes.",
        variant: "destructive",
      });
      return;
    }
    const targets = Object.entries(factors).filter(([, f]) => Number(f) > 0 && Number(f) !== 0);
    const rows: ComponentPayload[] = [];
    let order = components.length;
    for (const [targetId, factorStr] of targets) {
      const factor = Number(factorStr);
      for (const r of baseRows) {
        rows.push({
          product_id: id as string,
          size_id: targetId,
          variant_id: r.variant_id,
          component_type: r.component_type,
          preparation_id: r.preparation_id,
          ingredient_id: r.ingredient_id,
          supply_id: r.supply_id,
          role: r.role,
          qty: Number((r.qty * factor).toFixed(4)),
          unit_code: r.unit_code,
          is_optional: r.is_optional,
          sort_order: order++,
        });
      }
    }
    try {
      await saveRows.mutateAsync({ productId: id as string, rows });
      setGenOpen(false);
      toast({
        title: "Tamaños generados",
        description: `Se guardaron ${rows.length} líneas con cantidades explícitas.`,
      });
    } catch (e: any) {
      toast({ title: "No se pudo generar", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!product) {
    return <p className="py-20 text-center text-muted-foreground">Producto no encontrado.</p>;
  }

  const options =
    newRow.componentType === "preparation"
      ? preparations.map((p) => ({ id: p.id, name: p.name }))
      : newRow.componentType === "ingredient"
        ? ingredients.map((i) => ({ id: i.id, name: i.name }))
        : supplies.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-sm text-muted-foreground">
            {product.category || "Sin categoría"} · se cobra por{" "}
            {product.price_basis === "portion" ? "porción" : "unidad"}
          </p>
        </div>
      </div>

      {/* Costeo en vivo */}
      <Card>
        <CardHeader>
          <CardTitle>Costo y precio en vivo</CardTitle>
          <CardDescription>
            Elegí tamaño y variante para ver el desglose calculado en la base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tamaño</Label>
              <select
                className={selectClass}
                value={sizeId ?? ""}
                onChange={(e) => setSizeId(e.target.value || null)}
              >
                <option value="">Sin tamaño</option>
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Variante</Label>
              <select
                className={selectClass}
                value={variantId ?? ""}
                onChange={(e) => setVariantId(e.target.value || null)}
              >
                <option value="">Sin variante</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Checkbox
                id="incl-opt"
                checked={includeOptional}
                onCheckedChange={(c) => setIncludeOptional(!!c)}
              />
              <Label htmlFor="incl-opt" className="cursor-pointer">
                Incluir componentes opcionales
              </Label>
            </div>
          </div>

          <Separator />

          {costError ? (
            <p className="text-sm text-destructive">{(costError as Error).message}</p>
          ) : !cost ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
                {[
                  ["Materia prima", cost.material_cost],
                  ["Mano de obra", cost.labor_cost],
                  ["Energía", cost.energy_cost],
                  ["Empaque", cost.packaging_cost],
                  ["Merma", cost.loss_cost],
                  ["Indirectos", cost.overhead_cost],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-md border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{label as string}</p>
                    <p className="font-mono text-sm font-semibold">{money(value as number)}</p>
                  </div>
                ))}
                <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">Costo total</p>
                  <p className="font-mono text-sm font-bold">{money(cost.total_cost)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    Precio sugerido ({num(cost.margin_pct, 0)}% de margen)
                  </p>
                  <p className="text-2xl font-bold">{money(cost.suggested_price)}</p>
                  {cost.cost_per_portion != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Costo por porción: {money(cost.cost_per_portion, 2)}
                    </p>
                  )}
                </div>
                <div className="space-y-2 rounded-md border p-4 md:col-span-2">
                  <Label htmlFor="own-price">Tu precio</Label>
                  <Input
                    id="own-price"
                    type="number"
                    placeholder={String(Math.round(cost.suggested_price))}
                    value={ownPrice}
                    onChange={(e) => setOwnPrice(e.target.value)}
                  />
                  {priceValue > 0 ? (
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>
                        Margen:{" "}
                        <strong className={margin! < 0 ? "text-destructive" : ""}>
                          {num(margin, 1)}%
                        </strong>
                      </span>
                      <span>
                        Te pagás por hora:{" "}
                        <strong>{hourlyPay == null ? "—" : money(hourlyPay)}</strong>
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Escribí un precio para ver el margen y cuánto te pagás por hora.
                    </p>
                  )}
                </div>
              </div>

              {cost.breakdown?.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Componente</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cost.breakdown.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell>{l.name || "—"}</TableCell>
                          <TableCell>{ROLE_LABELS[l.role as ProductComponentRole] ?? l.role}</TableCell>
                          <TableCell className="text-right font-mono">
                            {num(l.qty)} {l.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono">{money(l.total, 2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {isFetching && (
                <p className="text-xs text-muted-foreground">Recalculando…</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="sizes">
        <TabsList>
          <TabsTrigger value="sizes">Tamaños</TabsTrigger>
          <TabsTrigger value="variants">Variantes</TabsTrigger>
          <TabsTrigger value="components">Composición</TabsTrigger>
        </TabsList>

        {/* ---------- Tamaños ---------- */}
        <TabsContent value="sizes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tamaños</CardTitle>
              <CardDescription>Porciones, peso objetivo y minutos de armado y horno.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Porciones</TableHead>
                    <TableHead>Peso objetivo (g)</TableHead>
                    <TableHead>Armado (min)</TableHead>
                    <TableHead>Horno (min)</TableHead>
                    <TableHead>Predeterminado</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sizes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Input
                          defaultValue={s.name}
                          onBlur={(e) =>
                            e.target.value !== s.name &&
                            saveSize.mutate({
                              id: s.id,
                              input: { product_id: s.product_id, name: e.target.value },
                            })
                          }
                        />
                      </TableCell>
                      {(
                        [
                          ["portions", s.portions],
                          ["target_weight_g", s.target_weight_g],
                          ["assembly_minutes", s.assembly_minutes],
                          ["oven_minutes", s.oven_minutes],
                        ] as const
                      ).map(([field, value]) => (
                        <TableCell key={field}>
                          <Input
                            type="number"
                            defaultValue={value ?? ""}
                            onBlur={(e) =>
                              saveSize.mutate({
                                id: s.id,
                                input: {
                                  product_id: s.product_id,
                                  [field]: e.target.value === "" ? null : Number(e.target.value),
                                } as any,
                              })
                            }
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Checkbox
                          checked={s.is_default}
                          onCheckedChange={(c) =>
                            saveSize.mutate({
                              id: s.id,
                              input: { product_id: s.product_id, is_default: !!c },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSize.mutate({ id: s.id, productId: s.product_id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  saveSize.mutate({
                    input: {
                      product_id: id as string,
                      name: `Tamaño ${sizes.length + 1}`,
                      is_default: sizes.length === 0,
                      sort_order: sizes.length,
                    },
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar tamaño
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Variantes ---------- */}
        <TabsContent value="variants" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Variantes</CardTitle>
              <CardDescription>Por ejemplo: con chocolate, con fresa, sin gluten.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Predeterminada</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Input
                          defaultValue={v.name}
                          onBlur={(e) =>
                            e.target.value !== v.name &&
                            saveVariant.mutate({
                              id: v.id,
                              input: { product_id: v.product_id, name: e.target.value },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          defaultValue={v.description ?? ""}
                          onBlur={(e) =>
                            saveVariant.mutate({
                              id: v.id,
                              input: {
                                product_id: v.product_id,
                                description: e.target.value || null,
                              },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={v.is_default}
                          onCheckedChange={(c) =>
                            saveVariant.mutate({
                              id: v.id,
                              input: { product_id: v.product_id, is_default: !!c },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteVariant.mutate({ id: v.id, productId: v.product_id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  saveVariant.mutate({
                    input: {
                      product_id: id as string,
                      name: `Variante ${variants.length + 1}`,
                      is_default: variants.length === 0,
                      sort_order: variants.length,
                    },
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar variante
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Composición ---------- */}
        <TabsContent value="components" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Composición</CardTitle>
                <CardDescription>
                  Una fila sin tamaño o sin variante aplica a todos. La fila más específica gana.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setGenOpen(true)} disabled={sizes.length < 2}>
                <Wand2 className="mr-2 h-4 w-4" /> Generar tamaños por factor
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Tamaño</TableHead>
                      <TableHead className="min-w-[140px]">Variante</TableHead>
                      <TableHead className="min-w-[160px]">Componente</TableHead>
                      <TableHead className="min-w-[120px]">Rol</TableHead>
                      <TableHead className="min-w-[100px]">Cantidad</TableHead>
                      <TableHead className="min-w-[90px]">Unidad</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Opcional</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <select
                            className={selectClass}
                            value={r.size_id ?? ""}
                            onChange={(e) => patchRow(r, { size_id: e.target.value || null })}
                          >
                            <option value="">Todos los tamaños</option>
                            {sizes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <select
                            className={selectClass}
                            value={r.variant_id ?? ""}
                            onChange={(e) => patchRow(r, { variant_id: e.target.value || null })}
                          >
                            <option value="">Todas las variantes</option>
                            {variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{nameOf(r)}</div>
                          <Badge variant="secondary" className="mt-1">
                            {COMPONENT_TYPE_LABELS[r.component_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <select
                            className={selectClass}
                            value={r.role}
                            onChange={(e) =>
                              patchRow(r, { role: e.target.value as ProductComponentRole })
                            }
                          >
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={r.qty}
                            onBlur={(e) =>
                              Number(e.target.value) !== r.qty &&
                              patchRow(r, { qty: Number(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            className={selectClass}
                            value={r.unit_code}
                            onChange={(e) => patchRow(r, { unit_code: e.target.value })}
                          >
                            {units.map((u) => (
                              <option key={u.code} value={u.code}>
                                {u.code}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {num(r.base_qty)}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={r.is_optional}
                            onCheckedChange={(c) => patchRow(r, { is_optional: !!c })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRow.mutate({ id: r.id, productId: r.product_id })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-8">
                <div className="space-y-1">
                  <Label className="text-xs">Tamaño</Label>
                  <select
                    className={selectClass}
                    value={newRow.sizeId}
                    onChange={(e) => setNewRow({ ...newRow, sizeId: e.target.value })}
                  >
                    <option value="">Todos los tamaños</option>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Variante</Label>
                  <select
                    className={selectClass}
                    value={newRow.variantId}
                    onChange={(e) => setNewRow({ ...newRow, variantId: e.target.value })}
                  >
                    <option value="">Todas las variantes</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <select
                    className={selectClass}
                    value={newRow.componentType}
                    onChange={(e) =>
                      setNewRow({
                        ...newRow,
                        componentType: e.target.value as ProductComponentType,
                        refId: "",
                        unit: e.target.value === "supply" ? "unidad" : "g",
                      })
                    }
                  >
                    {Object.entries(COMPONENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Componente</Label>
                  <select
                    className={selectClass}
                    value={newRow.refId}
                    onChange={(e) => setNewRow({ ...newRow, refId: e.target.value })}
                  >
                    <option value="">Seleccionar…</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rol</Label>
                  <select
                    className={selectClass}
                    value={newRow.role}
                    onChange={(e) =>
                      setNewRow({ ...newRow, role: e.target.value as ProductComponentRole })
                    }
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    className="h-9"
                    value={newRow.qty}
                    onChange={(e) => setNewRow({ ...newRow, qty: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unidad</Label>
                  <select
                    className={selectClass}
                    value={newRow.unit}
                    onChange={(e) => setNewRow({ ...newRow, unit: e.target.value })}
                  >
                    {units.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="new-opt"
                  checked={newRow.isOptional}
                  onCheckedChange={(c) => setNewRow({ ...newRow, isOptional: !!c })}
                />
                <Label htmlFor="new-opt" className="cursor-pointer text-sm">
                  Opcional
                </Label>
                <Button onClick={addRow} disabled={saveRow.isPending}>
                  {saveRow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Plus className="mr-2 h-4 w-4" /> Agregar componente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar tamaños por factor</DialogTitle>
            <DialogDescription>
              Se copian las líneas del tamaño base multiplicando las cantidades. Lo que queda guardado
              son cantidades, no factores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tamaño base</Label>
              <select
                className={selectClass}
                value={genBase}
                onChange={(e) => {
                  setGenBase(e.target.value);
                  setFactors(
                    Object.fromEntries(
                      sizes.filter((s) => s.id !== e.target.value).map((s) => [s.id, "1"]),
                    ),
                  );
                }}
              >
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {sizes
              .filter((s) => s.id !== genBase)
              .map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <Label className="w-40">{s.name}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={factors[s.id] ?? "1"}
                    onChange={(e) => setFactors({ ...factors, [s.id]: e.target.value })}
                  />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={generateSizes} disabled={saveRows.isPending}>
              {saveRows.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
