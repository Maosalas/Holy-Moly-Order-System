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
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cardTypesApi } from "@/lib/api";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface CardType {
  id: string;
  name: string;
  description: string;
}

export function CardTypesList() {
  const { toast } = useToast();
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<CardType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchCardTypes();
  }, []);

  const fetchCardTypes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await cardTypesApi.getAll();
      if (error) throw new Error(error);
      setCardTypes((data as CardType[]) || []);
    } catch (error) {
      console.error("Error fetching card types:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los tipos de tarjetas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (type?: CardType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: "",
        description: "",
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingType(null);
    setFormData({
      name: "",
      description: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingType) {
        const { error } = await cardTypesApi.update(editingType.id, formData);
        if (error) throw new Error(error);
        toast({
          title: "Tipo actualizado",
          description: "El tipo de tarjeta ha sido actualizado exitosamente",
        });
      } else {
        const { error } = await cardTypesApi.create(formData);
        if (error) throw new Error(error);
        toast({
          title: "Tipo creado",
          description: "El tipo de tarjeta ha sido creado exitosamente",
        });
      }
      handleCloseForm();
      fetchCardTypes();
    } catch (error) {
      console.error("Error saving card type:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el tipo de tarjeta",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await cardTypesApi.delete(deleteId);
      if (error) throw new Error(error);
      toast({
        title: "Tipo eliminado",
        description: "El tipo de tarjeta ha sido eliminado exitosamente",
      });
      setDeleteId(null);
      fetchCardTypes();
    } catch (error) {
      console.error("Error deleting card type:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el tipo de tarjeta",
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
          <h3 className="text-lg font-semibold">Tipos de Tarjetas</h3>
          <p className="text-sm text-muted-foreground">
            Administra los tipos de tarjetas disponibles
          </p>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Tipo
        </Button>
      </div>

      {cardTypes.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground mb-4">No hay tipos de tarjetas definidos</p>
          <Button onClick={() => handleOpenForm()} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Crear Primer Tipo
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
            {cardTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell className="font-medium">{type.name}</TableCell>
                <TableCell>{type.description || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenForm(type)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(type.id)}
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
              {editingType ? "Editar Tipo de Tarjeta" : "Nuevo Tipo de Tarjeta"}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? "Modifica los datos del tipo de tarjeta"
                : "Agrega un nuevo tipo de tarjeta al sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Visa, Mastercard, AMEX"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del tipo de tarjeta"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingType ? "Actualizar" : "Crear"}
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
        title="Eliminar tipo de tarjeta"
        description="¿Estás seguro de que deseas eliminar este tipo de tarjeta? Esta acción no se puede deshacer."
      />
    </div>
  );
}
