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
import { useCreateProduct, useDeleteProduct, useProducts } from "@/hooks/use-products";

export default function Products() {
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [priceBasis, setPriceBasis] = useState<"unit" | "portion">("unit");

  const create = async () => {
    if (!name.trim()) {
      toast({ title: "Falta el nombre", variant: "destructive" });
      return;
    }
    try {
      const id = await createProduct.mutateAsync({
        name: name.trim(),
        category: category.trim() || null,
        price_basis: priceBasis,
      });
      setOpen(false);
      setName("");
      setCategory("");
      navigate(`/products/${id}`);
    } catch (e: any) {
      toast({ title: "No se pudo crear", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Productos</h1>
          <p className="text-muted-foreground">
            Lo que vendés: tamaños, variantes y su composición con elaboraciones, ingredientes y empaque.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Entrá a un producto para ver su costo y precio sugerido en vivo.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Todavía no hay productos. Creá el primero.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Se cobra por</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/products/${p.id}`)}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.price_basis === "portion" ? "Porción" : "Unidad"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await deleteProduct.mutateAsync(p.id);
                            toast({ title: "Producto eliminado" });
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
            <DialogTitle>Nuevo producto</DialogTitle>
            <DialogDescription>Después definís tamaños, variantes y composición.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prod-name">Nombre</Label>
              <Input id="prod-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-cat">Categoría</Label>
              <Input id="prod-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-basis">Se cobra por</Label>
              <select
                id="prod-basis"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={priceBasis}
                onChange={(e) => setPriceBasis(e.target.value as "unit" | "portion")}
              >
                <option value="unit">Unidad</option>
                <option value="portion">Porción</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={createProduct.isPending}>
              {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
