import { useState } from "react";
import { Expense, CardType } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ExpenseFormProps {
  onSubmit: (expense: Expense) => void;
}

const ExpenseForm = ({ onSubmit }: ExpenseFormProps) => {
  const { toast } = useToast();
  const [supermarketName, setSupermarketName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [cardType, setCardType] = useState<CardType>("visa");

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
      id: Date.now().toString(),
      supermarketName,
      purchaseDate,
      amount: parseFloat(amount),
      cardType,
      createdAt: new Date().toISOString(),
    };

    onSubmit(expense);
    
    setSupermarketName("");
    setPurchaseDate("");
    setAmount("");
    setCardType("visa");
    
    toast({
      title: "Expense added",
      description: "Your expense has been recorded successfully",
    });
  };

  return (
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

      <Button type="submit" className="w-full">Add Expense</Button>
    </form>
  );
};

export default ExpenseForm;
