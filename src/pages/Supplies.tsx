import { useState, useEffect } from "react";
import { Supply } from "@/types/supply";
import SupplyForm from "@/components/SupplyForm";
import SupplyList from "@/components/SupplyList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { suppliesApi } from "@/lib/api";

const Supplies = () => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSupplies = async () => {
      const result = await suppliesApi.getAll();
      if (result.data) {
        const suppliesData = Array.isArray(result.data) ? result.data : [];
        setSupplies(suppliesData.map((s: any) => ({
          ...s,
          createdAt: s.created_at
        })));
      }
      setIsLoading(false);
    };
    fetchSupplies();
  }, []);

  const handleSubmit = async (supplyData: Supply) => {
    if (editingSupply) {
      const result = await suppliesApi.update(editingSupply.id, supplyData);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        return;
      }
      setSupplies(
        supplies.map((s) =>
          s.id === editingSupply.id ? { ...supplyData, id: s.id, createdAt: s.createdAt } : s
        )
      );
      toast({
        title: "Supply Updated",
        description: `${supplyData.name} has been updated successfully.`,
      });
    } else {
      const result = await suppliesApi.create(supplyData);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        return;
      }
      const supplyDataResponse = (result.data as any).supply || result.data;
      const newSupply = {
        ...supplyData,
        id: supplyDataResponse.id,
        createdAt: supplyDataResponse.created_at
      };
      setSupplies([newSupply, ...supplies]);
      toast({
        title: "Supply Added",
        description: `${supplyData.name} has been added successfully.`,
      });
    }
    setIsFormOpen(false);
    setEditingSupply(undefined);
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
      const supply = supplies.find((s) => s.id === supplyToDelete);
      const result = await suppliesApi.delete(supplyToDelete);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setSupplyToDelete(null);
        return;
      }
      setSupplies(supplies.filter((s) => s.id !== supplyToDelete));
      setDeleteDialogOpen(false);
      setSupplyToDelete(null);
      toast({
        title: "Supply Deleted",
        description: `${supply?.name} has been removed.`,
      });
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
          <h1 className="text-3xl font-bold tracking-tight">Supplies</h1>
          <p className="text-muted-foreground">Track your baking supplies inventory and costs</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Supply
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
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Supply"
        description={`Are you sure you want to delete "${supplies.find((s) => s.id === supplyToDelete)?.name || ""}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Supplies;
