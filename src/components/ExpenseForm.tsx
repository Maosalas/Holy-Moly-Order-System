import { useState } from "react";
import { Expense, CardType } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ExpenseFormProps {
  onSubmit: (expense: Expense) => void;
  initialData?: Expense;
  onCancel?: () => void;
}

const ExpenseForm = ({ onSubmit, initialData, onCancel }: ExpenseFormProps) => {
  const { toast } = useToast();
  const [supermarketName, setSupermarketName] = useState(initialData?.supermarketName || "");
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchaseDate || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [cardType, setCardType] = useState<CardType>(initialData?.cardType || "visa");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supermarketName || !purchaseDate || !amount) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const expense: Expense = {
      id: initialData?.id || crypto.randomUUID(),
      supermarketName,
      purchaseDate,
      amount: parseFloat(amount),
      cardType,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSubmit(expense);
    
    if (!initialData) {
      setSupermarketName("");
      setPurchaseDate("");
      setAmount("");
      setCardType("visa");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Expense" : "New Expense"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supermarket">Supermarket Name *</Label>
          <Input
            id="supermarket"
            value={supermarketName}
            onChange={(e) => setSupermarketName(e.target.value)}
            placeholder="e.g., AutoMercado"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Purchase Date *</Label>
          <Input
            id="date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₡) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="card">Card Type *</Label>
          <Select value={cardType} onValueChange={(value) => setCardType(value as CardType)}>
            <SelectTrigger id="card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visa">Visa</SelectItem>
              <SelectItem value="amex">Amex</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {initialData ? "Update Expense" : "Add Expense"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;
