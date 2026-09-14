import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useCreatePreparation,
  useDeletePreparation,
  usePreparationUsage,
  usePreparations,
} from "@/hooks/use-preparations";
import { PREPARATION_TYPE_LABELS, type PreparationType } from "@/types/preparation";
import { SearchSelect } from "@/components/ui/search-select";

const money = (v: number | null | undefined, digits = 2) =>
  `₡${(v || 0).toLocaleString("es-CR", { maximumFractionDigits: digits })}`;

export default function Preparations() {
  const navigate = useNavigate();
  const { data: preparations = [], isLoading } = usePreparations();
  const { data: usage = {} } = usePreparationUsage();
  const createPrep = useCreatePreparation();
  const deletePrep = useDeletePreparation();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PreparationType>("base");
  const [yieldG, setYieldG] = useState("1000");

  const create = async () => {
    if (!name.trim() || Number(yieldG) <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Escribe el nombre y un rendimiento en gramos mayor que cero.",
        variant: "destructive",
      });
      return;
    }
    try {
      const id = await createPrep.mutateAsync({
        name: name.trim(),
        type,
        yield_g: Number(yieldG),
        yield_portions: null,
        waste_pct: 0,
        time_minutes: 0,
        setup_minutes: 0,
        oven_minutes: 0,
        oven_temp_c: null,
        procedure_text: null,
      });
      setOpen(false);
      setName("");
      setYieldG("1000");
      navigate(`/preparations/${id}`);
    } catch (e: any) {
      toast({ title: "No se pudo crear", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Elaboraciones</h1>
          <p className="text-muted-foreground">
            Bases, rellenos, cubiertas y masas que se reutilizan entre productos. El costo se recalcula solo.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva elaboración
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>El costo por gramo incluye materia prima, mano de obra y energía.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : preparations.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Todavía no hay elaboraciones. Creá la primera para empezar a costear.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Costo por gramo</TableHead>
                  <TableHead>Se usa en</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {preparations.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/preparations/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{PREPARATION_TYPE_LABELS[p.type] ?? p.type}</TableCell>
                    <TableCell className="text-right font-mono">
                      {money(p.preparation_costs?.cost_per_g, 2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={usage[p.id] ? "default" : "secondary"}>
                        {usage[p.id] || 0} producto{(usage[p.id] || 0) === 1 ? "" : "s"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await deletePrep.mutateAsync(p.id);
                            toast({ title: "Elaboración eliminada" });
                          } catch (err: any) {
                            toast({
                              title: "No se pudo eliminar",
                              description: err.message,
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
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva elaboración</DialogTitle>
            <DialogDescription>Después podés agregar sus componentes y tiempos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prep-name">Nombre</Label>
              <Input id="prep-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep-type">Tipo</Label>
              <SearchSelect
                id="prep-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as PreparationType)}
              >
                {Object.entries(PREPARATION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep-yield">Rendimiento (g)</Label>
              <Input
                id="prep-yield"
                type="number"
                value={yieldG}
                onChange={(e) => setYieldG(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cuánto pesa la tanda completa que sale de esta receta.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={createPrep.isPending}>
              {createPrep.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
