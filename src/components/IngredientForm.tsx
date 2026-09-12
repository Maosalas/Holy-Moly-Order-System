import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { Ingredient, IngredientFormData } from "@/types/ingredient";
import { toast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  usePresentations,
  useCreatePresentation,
  useDeletePresentation,
  useSuppliers,
  useUnits,
} from "@/hooks/use-purchasing";

interface IngredientFormProps {
  open: boolean;
  ingredient?: Ingredient;
  onSubmit: (data: IngredientFormData) => void;
  onCancel: () => void;
}

const money = (v: number) =>
  `₡${(v || 0).toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BASE_UNITS = [
  { code: "g", label: "gramos (g)" },
  { code: "ml", label: "mililitros (ml)" },
  { code: "unidad", label: "unidad" },
];

export const IngredientForm = ({ open, ingredient, onSubmit, onCancel }: IngredientFormProps) => {
  const { currentOrganization } = useOrganization();
  const [name, setName] = useState(ingredient?.name || "");
  const [category, setCategory] = useState(ingredient?.category || "");
  const [baseUnit, setBaseUnit] = useState(ingredient?.baseUnit || "g");
  const [wastePct, setWastePct] = useState(String(ingredient?.wastePct ?? 0));
  const [density, setDensity] = useState(ingredient?.densityGMl?.toString() || "");
  const [unitWeight, setUnitWeight] = useState(ingredient?.unitWeightG?.toString() || "");
  const [usesVolumeMeasures, setUsesVolumeMeasures] = useState(Boolean(ingredient?.densityGMl));
  const [needsGramsFromUnit, setNeedsGramsFromUnit] = useState(Boolean(ingredient?.unitWeightG));
  const [photoUrl, setPhotoUrl] = useState<string | null>(ingredient?.photoUrl ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: presentations = [] } = usePresentations();
  const { data: suppliers = [] } = useSuppliers();
  const { data: units = [] } = useUnits();
  const createPresentation = useCreatePresentation();
  const deletePresentation = useDeletePresentation();

  const [newPres, setNewPres] = useState({
    description: "",
    qty: "",
    unit: "kg",
    price: "",
    supplierId: "",
  });

  const rows = useMemo(
    () => presentations.filter((p) => p.ingredient_id === ingredient?.id),
    [presentations, ingredient?.id]
  );

  const showDensity = baseUnit === "ml" || usesVolumeMeasures;
  const showUnitWeight = baseUnit === "unidad" && needsGramsFromUnit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre del ingrediente es obligatorio.",
        variant: "destructive",
      });
      return;
    }

    const waste = Number(wastePct || 0);
    if (Number.isNaN(waste) || waste < 0 || waste >= 100) {
      toast({
        title: "Merma inválida",
        description: "La merma debe ser un número entre 0 y 99.",
        variant: "destructive",
      });
      return;
    }

    if (showDensity && !density) {
      toast({
        title: "Falta la densidad",
        description: `Indica la densidad (g/ml) de "${name.trim()}" para poder convertir sus cantidades.`,
        variant: "destructive",
      });
      return;
    }

    if (showUnitWeight && !unitWeight) {
      toast({
        title: "Falta el peso por unidad",
        description: `Indica cuántos gramos pesa una unidad de "${name.trim()}".`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        organizationId: currentOrganization?.id || "",
        name: name.trim(),
        category: category.trim() || null,
        baseUnit,
        wastePct: waste,
        densityGMl: showDensity && density ? Number(density) : null,
        unitWeightG: showUnitWeight && unitWeight ? Number(unitWeight) : null,
        photoUrl,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPresentation = async () => {
    if (!ingredient?.id) return;
    const qty = Number(newPres.qty);
    const price = Number(newPres.price);
    if (!newPres.description.trim() || !qty || qty <= 0 || !price || price <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Indica descripción, cantidad y precio de la presentación.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createPresentation.mutateAsync({
        ingredient_id: ingredient.id,
        supplier_id: newPres.supplierId || null,
        description: newPres.description.trim(),
        qty,
        unit_code: newPres.unit,
        price,
      });
      setNewPres({ description: "", qty: "", unit: "kg", price: "", supplierId: "" });
      toast({ title: "Presentación agregada", description: "El costo del ingrediente se recalculó." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ingredient ? "Editar ingrediente" : "Nuevo ingrediente"}</DialogTitle>
          <DialogDescription>
            Define cómo se mide el ingrediente. El costo se obtiene de las presentaciones de compra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Harina fuerte"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Secos, lácteos, chocolatería..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Unidad base *</Label>
              <Select value={baseUnit} onValueChange={setBaseUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BASE_UNITS.map((u) => (
                    <SelectItem key={u.code} value={u.code}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Toda cantidad de este ingrediente se guarda convertida a esta unidad.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waste">Merma %</Label>
              <Input
                id="waste"
                type="number"
                min="0"
                max="99"
                step="0.5"
                value={wastePct}
                onChange={(e) => setWastePct(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Porcentaje que se pierde al limpiar, pelar o porcionar.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Datos de conversión</p>
            <p className="text-xs text-muted-foreground">
              Solo se piden cuando hacen falta: la densidad (g/ml) permite pasar de mililitros a gramos, y
              es necesaria si la unidad base es mililitros o si vas a usar el ingrediente en tazas o
              cucharadas. El peso por unidad (g) permite pasar de unidades a gramos, y es necesario si la
              unidad base es unidad y alguna receta lo pide en gramos. Si falta el dato, el sistema avisa en
              vez de suponerlo.
            </p>

            {baseUnit !== "ml" && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={usesVolumeMeasures}
                  onCheckedChange={(v) => setUsesVolumeMeasures(Boolean(v))}
                />
                Se va a usar en tazas o cucharadas
              </label>
            )}

            {baseUnit === "unidad" && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={needsGramsFromUnit}
                  onCheckedChange={(v) => setNeedsGramsFromUnit(Boolean(v))}
                />
                Alguna receta lo pide en gramos
              </label>
            )}

            {(showDensity || showUnitWeight) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {showDensity && (
                  <div className="space-y-2">
                    <Label htmlFor="density">Densidad (g/ml) *</Label>
                    <Input
                      id="density"
                      type="number"
                      min="0"
                      step="0.01"
                      value={density}
                      onChange={(e) => setDensity(e.target.value)}
                      placeholder="1.03"
                    />
                  </div>
                )}
                {showUnitWeight && (
                  <div className="space-y-2">
                    <Label htmlFor="unitWeight">Peso por unidad (g) *</Label>
                    <Input
                      id="unitWeight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={unitWeight}
                      onChange={(e) => setUnitWeight(e.target.value)}
                      placeholder="55"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/60 p-4">
            <Label className="text-sm">Costo por unidad base</Label>
            <p className="font-mono text-lg tabular-nums">
              {money(ingredient?.currentCost ?? 0)}
              <span className="ml-1 text-sm text-muted-foreground">
                / {baseUnit === "unidad" ? "unidad" : baseUnit}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Se calcula desde las presentaciones y las compras registradas.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : ingredient ? "Actualizar ingrediente" : "Crear ingrediente"}
            </Button>
          </DialogFooter>
        </form>

        {ingredient && (
          <>
            <Separator />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Presentaciones de compra</p>
                <p className="text-xs text-muted-foreground">
                  Ejemplo: "Saco 45,36 kg — ₡22.000". Al guardar una presentación se recalcula el costo.
                </p>
              </div>

              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin presentaciones registradas todavía.
                </p>
              ) : (
                <div className="space-y-2">
                  {rows.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{p.description}</span> — {p.qty} {p.unit_code} — ₡
                        {Number(p.price).toLocaleString("es-CR")}
                        {p.supplier_id && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {suppliers.find((s) => s.id === p.supplier_id)?.name}
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deletePresentation.mutate(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  className="sm:col-span-3"
                  placeholder="Descripción (Saco 45,36 kg)"
                  value={newPres.description}
                  onChange={(e) => setNewPres({ ...newPres, description: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Cantidad"
                  value={newPres.qty}
                  onChange={(e) => setNewPres({ ...newPres, qty: e.target.value })}
                />
                <Select value={newPres.unit} onValueChange={(v) => setNewPres({ ...newPres, unit: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.code} value={u.code}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="1"
                  placeholder="Precio ₡"
                  value={newPres.price}
                  onChange={(e) => setNewPres({ ...newPres, price: e.target.value })}
                />
                <Select
                  value={newPres.supplierId || "none"}
                  onValueChange={(v) => setNewPres({ ...newPres, supplierId: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="sm:col-span-2">
                    <SelectValue placeholder="Proveedor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proveedor</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  className="sm:col-span-1"
                  onClick={addPresentation}
                  disabled={createPresentation.isPending}
                >
                  <Plus className="mr-1 h-4 w-4" /> Agregar presentación
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
