import { useState, useEffect } from "react";
import { Supply } from "@/types/supply";
import SupplyForm from "@/components/SupplyForm";
import SupplyList from "@/components/SupplyList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SUPPLIES_STORAGE_KEY = "holy-moly-supplies";

const Supplies = () => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(SUPPLIES_STORAGE_KEY);
    if (stored) {
      setSupplies(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SUPPLIES_STORAGE_KEY, JSON.stringify(supplies));
  }, [supplies]);

  const handleSubmit = (supplyData: Supply) => {
    if (editingSupply) {
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
      setSupplies([supplyData, ...supplies]);
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

  const handleDeleteConfirm = () => {
    if (supplyToDelete) {
      const supply = supplies.find((s) => s.id === supplyToDelete);
      setSupplies(supplies.filter((s) => s.id !== supplyToDelete));
      toast({
        title: "Supply Deleted",
        description: `${supply?.name} has been removed.`,
      });
    }
    setDeleteDialogOpen(false);
    setSupplyToDelete(null);
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
