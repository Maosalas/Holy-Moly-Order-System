import { useState, useEffect } from "react";
import { Expense } from "@/types/expense";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { expensesApi } from "@/lib/api";

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      const result = await expensesApi.getAll();
      if (result.data) {
        const expensesData = Array.isArray(result.data) ? result.data : [];
        setExpenses(expensesData.map((e: any) => ({
          ...e,
          createdAt: e.created_at
        })));
      }
      setIsLoading(false);
    };
    fetchExpenses();
  }, []);

  const handleSubmit = async (expenseData: Expense) => {
    if (editingExpense) {
      const result = await expensesApi.update(editingExpense.id, expenseData);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        return;
      }
      setExpenses(
        expenses.map((e) =>
          e.id === editingExpense.id ? { ...expenseData, id: e.id, createdAt: e.createdAt } : e
        )
      );
      toast({
        title: "Gasto Actualizado",
        description: "El gasto ha sido actualizado exitosamente.",
      });
    } else {
      const result = await expensesApi.create(expenseData);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        return;
      }
      const expenseDataResponse = (result.data as any).expense || result.data;
      const newExpense = {
        ...expenseData,
        id: expenseDataResponse.id,
        createdAt: expenseDataResponse.created_at
      };
      setExpenses([newExpense, ...expenses]);
      toast({
        title: "Gasto Agregado",
        description: "El gasto ha sido registrado exitosamente.",
      });
    }
    setIsFormOpen(false);
    setEditingExpense(undefined);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setExpenseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (expenseToDelete) {
      const expense = expenses.find((e) => e.id === expenseToDelete);
      const result = await expensesApi.delete(expenseToDelete);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);
        return;
      }
      setExpenses(expenses.filter((e) => e.id !== expenseToDelete));
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
      toast({
        title: "Gasto Eliminado",
        description: `El gasto de ${expense?.supermarketName} ha sido eliminado.`,
      });
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
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Gasto"
        description="¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer."
      />
    </div>
  );
};

export default Expenses;
