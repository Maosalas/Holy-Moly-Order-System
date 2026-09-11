import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIngredients } from "@/hooks/use-ingredients";
import {
  useCreatePurchaseInvoice,
  useCreateSupplier,
  usePresentations,
  usePurchaseInvoices,
  useSuppliers,
  useUnits,
} from "@/hooks/use-purchasing";
import type { PurchaseLineDraft } from "@/types/purchasing";

const money = (v: number) => `₡${(v || 0).toLocaleString("es-CR", { maximumFractionDigits: 0 })}`;
const newLine = (): PurchaseLineDraft => ({
  key: crypto.randomUUID(),
  ingredientId: "",
  quantity: "",
  unit: "kg",
  cost: "",
});

export default function Purchases() {
  const { data: ingredientsRaw = [] } = useIngredients();
  const { data: suppliers = [] } = useSuppliers();
  const { data: units = [] } = useUnits();
  const { data: presentations = [] } = usePresentations();
  const { data: invoices = [], isLoading: loadingInvoices } = usePurchaseInvoices();
  const createInvoice = useCreatePurchaseInvoice();
  const createSupplier = useCreateSupplier();

  const ingredients = ingredientsRaw as any[];

  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [freight, setFreight] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLineDraft[]>([newLine()]);

  const linesTotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.cost) || 0), 0),
    [lines]
  );
  const total = linesTotal + (Number(freight) || 0);

  const updateLine = (key: string, patch: Partial<PurchaseLineDraft>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const applyPresentation = (key: string, presentationId: string) => {
    const p = presentations.find((x) => x.id === presentationId);
    if (!p) return;
    updateLine(key, {
      ingredientId: p.ingredient_id,
      quantity: String(p.qty),
      unit: p.unit_code,
      cost: String(p.price),
    });
  };

  const addSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const created: any = await createSupplier.mutateAsync({ name: newSupplierName.trim() });
      setSupplierId(created.id);
      setNewSupplierName("");
      toast({ title: "Proveedor agregado" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const save = async () => {
    const valid = lines.filter((l) => l.ingredientId && Number(l.quantity) > 0 && Number(l.cost) > 0);
    if (valid.length === 0) {
      toast({
        title: "Factura incompleta",
        description: "Agrega al menos una línea con insumo, cantidad e importe.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createInvoice.mutateAsync({
        supplierId: supplierId || null,
        supplierName: suppliers.find((s) => s.id === supplierId)?.name ?? null,
        purchaseDate,
        freight: Number(freight) || 0,
        notes: notes.trim() || null,
        lines: valid.map((l) => ({
          ingredientId: l.ingredientId,
          itemName: ingredients.find((i) => i.id === l.ingredientId)?.name ?? "Insumo",
          quantity: Number(l.quantity),
          unit: l.unit,
          cost: Number(l.cost),
        })),
      });
      setLines([newLine()]);
      setFreight("0");
      setNotes("");
      toast({
        title: "Compra registrada",
        description: "Se actualizaron los costos por unidad base de los insumos.",
      });
    } catch (e: any) {
      toast({ title: "No se pudo procesar la compra", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Compras</h1>
        <p className="text-muted-foreground">
          Registra la factura del proveedor con sus líneas y el flete. El costo por unidad base de cada insumo se
          recalcula automáticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva factura de compra</CardTitle>
          <CardDescription>El flete se reparte entre las líneas según el importe de cada una.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <select
                id="supplier"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Input
                  placeholder="Nuevo proveedor"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={addSupplier} disabled={createSupplier.isPending}>
                  Agregar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha de compra</Label>
              <Input id="date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freight">Flete (₡)</Label>
              <Input
                id="freight"
                type="number"
                step="1"
                value={freight}
                onChange={(e) => setFreight(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Insumo</TableHead>
                  <TableHead className="min-w-[160px]">Presentación</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Importe ₡</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.key}>
                    <TableCell>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={l.ingredientId}
                        onChange={(e) => updateLine(l.key, { ingredientId: e.target.value })}
                      >
                        <option value="">Seleccionar…</option>
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value=""
                        onChange={(e) => applyPresentation(l.key, e.target.value)}
                      >
                        <option value="">Manual</option>
                        {presentations
                          .filter((p) => !l.ingredientId || p.ingredient_id === l.ingredientId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.description}
                            </option>
                          ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-28"
                        value={l.quantity}
                        onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        className="flex h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={l.unit}
                        onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                      >
                        {units.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="1"
                        className="w-32"
                        value={l.cost}
                        onChange={(e) => updateLine(l.key, { cost: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLines((prev) => (prev.length === 1 ? [newLine()] : prev.filter((x) => x.key !== l.key)))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button type="button" variant="outline" onClick={() => setLines((prev) => [...prev, newLine()])}>
            <Plus className="h-4 w-4 mr-1" /> Agregar línea
          </Button>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 p-4">
            <div className="text-sm">
              <p>Líneas: {money(linesTotal)}</p>
              <p>Flete: {money(Number(freight) || 0)}</p>
              <p className="text-lg font-bold">Total: {money(total)}</p>
            </div>
            <Button onClick={save} disabled={createInvoice.isPending}>
              {createInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar compra
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compras recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <p className="text-muted-foreground text-sm">Cargando…</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no hay compras registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Flete</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{new Date(inv.purchase_date).toLocaleDateString("es-CR")}</TableCell>
                    <TableCell>{inv.supplier_name || "—"}</TableCell>
                    <TableCell>{money(Number(inv.freight))}</TableCell>
                    <TableCell className="font-medium">{money(Number(inv.total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
