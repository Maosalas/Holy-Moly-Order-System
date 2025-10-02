import { useState, useEffect } from "react";
import { Expense } from "@/types/expense";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("expenses");
    if (stored) {
      setExpenses(JSON.parse(stored));
    }
  }, []);

  const handleAddExpense = (expense: Expense) => {
    const updated = [...expenses, expense];
    setExpenses(updated);
    localStorage.setItem("expenses", JSON.stringify(updated));
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter((exp) => exp.id !== id);
    setExpenses(updated);
    localStorage.setItem("expenses", JSON.stringify(updated));
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">Track your business expenses</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Expenses</CardTitle>
          <CardDescription>All tracked expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">₡{totalExpenses.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New Expense</CardTitle>
          <CardDescription>Record a new business expense</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm onSubmit={handleAddExpense} />
        </CardContent>
      </Card>

      <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} />
    </div>
  );
};

export default Expenses;
