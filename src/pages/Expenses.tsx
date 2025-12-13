import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Expense } from "@/types/expense";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { expensesApi } from "@/lib/api";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/hooks/use-expenses";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Expenses = () => {
  const navigate = useNavigate();

  // Usar React Query hooks
  const { data: expenses = [], isLoading } = useExpenses();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isFetchingExpense, setIsFetchingExpense] = useState(false);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [createdExpenseId, setCreatedExpenseId] = useState<string | null>(null);

  const handleSubmit = async (expenseData: Expense) => {
    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, expense: expenseData });
        setIsFormOpen(false);
        setEditingExpense(undefined);
      } else {
        const result = await createExpense.mutateAsync(expenseData);
        setIsFormOpen(false);
        setEditingExpense(undefined);

        // Show inventory dialog after creating expense
        setCreatedExpenseId(expenseData.id);
        setInventoryDialogOpen(true);
      }
    } catch (error) {
      // Los errores ya son manejados por los hooks
      console.error("Error submitting expense:", error);
    }
  };

  const handleGoToInventory = () => {
    setInventoryDialogOpen(false);
    navigate('/inventory', { state: { expenseId: createdExpenseId } });
  };

  const handleSkipInventory = () => {
    setInventoryDialogOpen(false);
    setCreatedExpenseId(null);
  };

  const handleEdit = async (expense: Expense) => {
    setIsFetchingExpense(true);
    try {
      // Fetch the full expense data including the receipt image
      const result = await expensesApi.getById(expense.id);
      if (result.data) {
        setEditingExpense(result.data as Expense);
      } else {
        // Fallback to the expense from the list if fetch fails
        setEditingExpense(expense);
        if (result.error) {
          toast({
            title: "Warning",
            description: "Could not load receipt image. You can still edit other fields.",
            variant: "default",
          });
        }
      }
      setIsFormOpen(true);
    } finally {
      setIsFetchingExpense(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setExpenseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (expenseToDelete) {
      try {
        await deleteExpense.mutateAsync(expenseToDelete);
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);
      } catch (error) {
        // Los errores ya son manejados por los hooks
        console.error("Error deleting expense:", error);
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);
      }
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingExpense(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground">Rastrea tus gastos del negocio</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Gasto
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <ExpenseForm
          initialData={editingExpense}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <ExpenseList
          expenses={expenses}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          isDeleting={deleteExpense.isPending || isFetchingExpense}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Gasto"
        description="¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer."
      />

      <AlertDialog open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              ¿Registrar items de inventario?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El gasto ha sido creado exitosamente. ¿Deseas registrar ahora los items de inventario asociados a este gasto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipInventory}>
              No, más tarde
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGoToInventory}>
              Sí, registrar items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Expenses;
