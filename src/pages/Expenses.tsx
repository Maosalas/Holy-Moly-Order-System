import { useState, useEffect } from "react";
import { Expense } from "@/types/expense";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const EXPENSES_STORAGE_KEY = "holy-moly-expenses";

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (stored) {
      setExpenses(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const handleSubmit = (expenseData: Expense) => {
    if (editingExpense) {
      setExpenses(
        expenses.map((e) =>
          e.id === editingExpense.id ? { ...expenseData, id: e.id, createdAt: e.createdAt } : e
        )
      );
      toast({
        title: "Expense Updated",
        description: "The expense has been updated successfully.",
      });
    } else {
      setExpenses([expenseData, ...expenses]);
      toast({
        title: "Expense Added",
        description: "The expense has been recorded successfully.",
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

  const handleDeleteConfirm = () => {
    if (expenseToDelete) {
      const expense = expenses.find((e) => e.id === expenseToDelete);
      setExpenses(expenses.filter((e) => e.id !== expenseToDelete));
      toast({
        title: "Expense Deleted",
        description: `Expense from ${expense?.supermarketName} has been removed.`,
      });
    }
    setDeleteDialogOpen(false);
    setExpenseToDelete(null);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingExpense(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track your business expenses</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Expense
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
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
      />
    </div>
  );
};

export default Expenses;
