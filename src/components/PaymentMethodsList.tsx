import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { paymentMethodsApi } from "@/lib/api";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
}

export function PaymentMethodsList() {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await paymentMethodsApi.getAll();
      if (error) throw new Error(error);
      setPaymentMethods((data as PaymentMethod[]) || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los métodos de pago",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        description: method.description,
      });
    } else {
      setEditingMethod(null);
      setFormData({
        name: "",
        description: "",
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMethod(null);
    setFormData({
      name: "",
      description: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingMethod) {
        const { error } = await paymentMethodsApi.update(editingMethod.id, formData);
        if (error) throw new Error(error);
        toast({
          title: "Método actualizado",
          description: "El método de pago ha sido actualizado exitosamente",
        });
      } else {
        const { error } = await paymentMethodsApi.create(formData);
        if (error) throw new Error(error);
        toast({
          title: "Método creado",
          description: "El método de pago ha sido creado exitosamente",
        });
      }
      handleCloseForm();
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error saving payment method:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el método de pago",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await paymentMethodsApi.delete(deleteId);
      if (error) throw new Error(error);
      toast({
        title: "Método eliminado",
        description: "El método de pago ha sido eliminado exitosamente",
      });
      setDeleteId(null);
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el método de pago",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Métodos de Pago</h3>
          <p className="text-sm text-muted-foreground">
            Administra los métodos de pago disponibles
          </p>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Método
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground mb-4">No hay métodos de pago definidos</p>
          <Button onClick={() => handleOpenForm()} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Crear Primer Método
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.map((method) => (
              <TableRow key={method.id}>
                <TableCell className="font-medium">{method.name}</TableCell>
                <TableCell>{method.description || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenForm(method)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(method.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Formulario Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? "Editar Método de Pago" : "Nuevo Método de Pago"}
            </DialogTitle>
            <DialogDescription>
              {editingMethod
                ? "Modifica los datos del método de pago"
                : "Agrega un nuevo método de pago al sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Efectivo, Transferencia, SINPE"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del método de pago"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingMethod ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar método de pago"
        description="¿Estás seguro de que deseas eliminar este método de pago? Esta acción no se puede deshacer."
      />
    </div>
  );
}
