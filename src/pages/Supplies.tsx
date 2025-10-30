import { useState } from "react";
import { Supply } from "@/types/supply";
import SupplyForm from "@/components/SupplyForm";
import SupplyList from "@/components/SupplyList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSupplies, useCreateSupply, useUpdateSupply, useDeleteSupply } from "@/hooks/use-supplies";

const Supplies = () => {
  // Usar React Query hooks
  const { data: suppliesData = [], isLoading } = useSupplies();
  const createSupply = useCreateSupply();
  const updateSupply = useUpdateSupply();
  const deleteSupply = useDeleteSupply();

  // Transformar datos del API
  const supplies: Supply[] = suppliesData.map((s: any) => ({
    ...s,
    createdAt: s.created_at || s.createdAt
  }));

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<string | null>(null);

  const handleSubmit = async (supplyData: Supply) => {
    try {
      if (editingSupply) {
        await updateSupply.mutateAsync({ id: editingSupply.id, supply: supplyData });
      } else {
        await createSupply.mutateAsync(supplyData);
      }
      setIsFormOpen(false);
      setEditingSupply(undefined);
    } catch (error) {
      // Los errores ya son manejados por los hooks
      console.error("Error submitting supply:", error);
    }
  };

  const handleEdit = (supply: Supply) => {
    setEditingSupply(supply);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setSupplyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (supplyToDelete) {
      try {
        await deleteSupply.mutateAsync(supplyToDelete);
        setDeleteDialogOpen(false);
        setSupplyToDelete(null);
      } catch (error) {
        // Los errores ya son manejados por los hooks
        console.error("Error deleting supply:", error);
        setDeleteDialogOpen(false);
        setSupplyToDelete(null);
      }
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingSupply(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insumos</h1>
          <p className="text-muted-foreground">Rastrea tu inventario de insumos y costos</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Insumo
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <SupplyForm
          initialData={editingSupply}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <SupplyList
          supplies={supplies}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          isDeleting={deleteSupply.isPending}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Insumo"
        description={`¿Estás seguro de que deseas eliminar "${supplies.find((s) => s.id === supplyToDelete)?.name || ""}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};

export default Supplies;
