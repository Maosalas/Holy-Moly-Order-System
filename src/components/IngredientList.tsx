import { Ingredient } from "@/types/ingredient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Search, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Fragment, useState, useMemo } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "./PaginationControls";
import {
  usePresentations,
  useCreatePresentation,
  useDeletePresentation,
  useSuppliers,
  useUnits,
  useUpdateIngredientWaste,
} from "@/hooks/use-purchasing";
import { toast } from "@/hooks/use-toast";

interface IngredientListProps {
  ingredients: Ingredient[];
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const money = (v: number) =>
  `₡${(v || 0).toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const baseUnitLabel = (code?: string) =>
  code === "g" ? "gramos (g)" : code === "ml" ? "mililitros (ml)" : code === "unidad" ? "unidades" : "—";

export const IngredientList = ({ ingredients, onEdit, onDelete, isDeleting }: IngredientListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [wasteDraft, setWasteDraft] = useState<Record<string, string>>({});
  const [newPres, setNewPres] = useState({ description: "", qty: "", unit: "kg", price: "", supplierId: "" });

  const { data: presentations = [] } = usePresentations();
  const { data: suppliers = [] } = useSuppliers();
  const { data: units = [] } = useUnits();
  const createPresentation = useCreatePresentation();
  const deletePresentation = useDeletePresentation();
  const updateWaste = useUpdateIngredientWaste();

  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) return ingredients;
    const query = searchQuery.toLowerCase();
    return ingredients.filter(
      (ingredient) =>
        ingredient.name.toLowerCase().includes(query) ||
        (ingredient.provider || "").toLowerCase().includes(query)
    );
  }, [ingredients, searchQuery]);

  const { paginatedItems, currentPage, totalPages, goToPage, hasNextPage, hasPreviousPage } =
    usePagination({ items: filteredIngredients, itemsPerPage: 10 });

  const saveWaste = async (ingredient: Ingredient) => {
    const raw = wasteDraft[ingredient.id];
    if (raw === undefined) return;
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0 || value >= 100) {
      toast({ title: "Merma inválida", description: "Debe ser un número entre 0 y 99.", variant: "destructive" });
      return;
    }
    if (value === (ingredient.wastePct ?? 0)) return;
    try {
      await updateWaste.mutateAsync({ id: ingredient.id, wastePct: value });
      toast({ title: "Merma actualizada", description: `${ingredient.name}: ${value}%` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const addPresentation = async (ingredientId: string) => {
    const qty = Number(newPres.qty);
    const price = Number(newPres.price);
    if (!newPres.description.trim() || !qty || qty <= 0) {
      toast({ title: "Datos incompletos", description: "Indica descripción y cantidad.", variant: "destructive" });
      return;
    }
    try {
      await createPresentation.mutateAsync({
        ingredient_id: ingredientId,
        supplier_id: newPres.supplierId || null,
        description: newPres.description.trim(),
        qty,
        unit_code: newPres.unit,
        price: price || 0,
      });
      setNewPres({ description: "", qty: "", unit: "kg", price: "", supplierId: "" });
      toast({ title: "Presentación agregada" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (ingredients.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            Aún no hay ingredientes. Presiona "Nuevo ingrediente" para agregar el primero.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Base de datos de ingredientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad base</TableHead>
                  <TableHead className="bg-muted/60">₡ por unidad base</TableHead>
                  <TableHead>Merma %</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((ingredient) => {
                  const isOpen = expanded === ingredient.id;
                  const rows = presentations.filter((p) => p.ingredient_id === ingredient.id);
                  return (
                    <Fragment key={ingredient.id}>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setExpanded(isOpen ? null : ingredient.id)}
                            aria-label="Ver presentaciones"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {ingredient.name}
                          {rows.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {rows.length} present.
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{baseUnitLabel(ingredient.baseUnit)}</TableCell>
                        <TableCell className="bg-muted/60 font-mono tabular-nums" title="Se calcula con las compras registradas">
                          {money(ingredient.currentCost ?? 0)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="99"
                            step="0.5"
                            className="h-9 w-24"
                            value={wasteDraft[ingredient.id] ?? String(ingredient.wastePct ?? 0)}
                            onChange={(e) =>
                              setWasteDraft((prev) => ({ ...prev, [ingredient.id]: e.target.value }))
                            }
                            onBlur={() => saveWaste(ingredient)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(ingredient)} disabled={isDeleting}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(ingredient.id)} disabled={isDeleting}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {isOpen && (
                        <TableRow key={`${ingredient.id}-pres`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={6} className="p-4">
                            <p className="font-medium mb-3">Presentaciones de compra</p>
                            {rows.length === 0 ? (
                              <p className="text-sm text-muted-foreground mb-3">
                                Sin presentaciones. Ejemplo: "Saco 45,36 kg — ₡22.000".
                              </p>
                            ) : (
                              <div className="space-y-2 mb-3">
                                {rows.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                                  >
                                    <span>
                                      <span className="font-medium">{p.description}</span> — {p.qty} {p.unit_code} —{" "}
                                      ₡{Number(p.price).toLocaleString("es-CR")}
                                      {p.supplier_id && (
                                        <span className="text-muted-foreground">
                                          {" "}
                                          · {suppliers.find((s) => s.id === p.supplier_id)?.name}
                                        </span>
                                      )}
                                    </span>
                                    <Button
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

                            <div className="grid gap-2 sm:grid-cols-6">
                              <Input
                                className="sm:col-span-2"
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
                              <select
                                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newPres.unit}
                                onChange={(e) => setNewPres({ ...newPres, unit: e.target.value })}
                              >
                                {units.map((u) => (
                                  <option key={u.code} value={u.code}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>
                              <Input
                                type="number"
                                step="1"
                                placeholder="Precio ₡"
                                value={newPres.price}
                                onChange={(e) => setNewPres({ ...newPres, price: e.target.value })}
                              />
                              <Button onClick={() => addPresentation(ingredient.id)} disabled={createPresentation.isPending}>
                                <Plus className="h-4 w-4 mr-1" /> Agregar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
      />
    </>
  );
};
