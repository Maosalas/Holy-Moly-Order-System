import { useState } from "react";
import { Supply } from "@/types/supply";
import SupplyForm from "@/components/SupplyForm";
import SupplyList from "@/components/SupplyList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { useSupplies, useCreateSupply, useUpdateSupply, useDeleteSupply, supplyKeys } from "@/hooks/use-supplies";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { suppliesApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const queryClient = useQueryClient();
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
    if (!supplyToDelete) return;

    const supplyName = supplies.find((s) => s.id === supplyToDelete)?.name || "este suministro";

    try {
      // Verificar si el suministro está en uso por algún producto
      const { data: usedIn, error: usageError } = await supabase
        .from("product_components")
        .select("product_id, products(name)")
        .eq("supply_id", supplyToDelete)
        .limit(20);

      if (usageError) throw usageError;

      if (usedIn && usedIn.length > 0) {
        const names = Array.from(
          new Set(usedIn.map((row: any) => row.products?.name).filter(Boolean))
        );
        toast({
          variant: "destructive",
          title: "No se puede eliminar",
          description: names.length
            ? `"${supplyName}" se usa en: ${names.join(", ")}. Quitalo de esos productos antes de eliminarlo.`
            : `"${supplyName}" se usa en uno o más productos. Quitalo de esos productos antes de eliminarlo.`,
        });
        setDeleteDialogOpen(false);
        setSupplyToDelete(null);
        return;
      }

      await deleteSupply.mutateAsync(supplyToDelete);
    } catch (error) {
      console.error("Error deleting supply:", error);
    } finally {
      setDeleteDialogOpen(false);
      setSupplyToDelete(null);
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
          <div className="flex gap-2">
            <Button onClick={() => setIsImportOpen(true)} size="lg" variant="outline" className="gap-2">
              <Upload className="h-5 w-5" />
              Importar CSV
            </Button>
            <Button onClick={() => setIsFormOpen(true)} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Nuevo Suministro
            </Button>
          </div>
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

      <CsvImportDialog
        mode="supplies"
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onCreate={async (payload) => {
          const res = await suppliesApi.create(payload);
          if ((res as any).error) throw new Error(String((res as any).error));
        }}
        onFinished={() => queryClient.invalidateQueries({ queryKey: supplyKeys.all })}
      />

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
