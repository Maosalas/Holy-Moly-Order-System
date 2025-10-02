import { useState } from "react";
import { Supply } from "@/types/supply";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface SupplyFormProps {
  onSubmit: (supply: Supply) => void;
  initialData?: Supply;
  onCancel?: () => void;
}

const SupplyForm = ({ onSubmit, initialData, onCancel }: SupplyFormProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(initialData?.name || "");
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "");
  const [unit, setUnit] = useState(initialData?.unit || "");
  const [cost, setCost] = useState(initialData?.cost?.toString() || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !quantity || !unit.trim() || !cost) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const parsedQuantity = parseFloat(quantity);
    const parsedCost = parseFloat(cost);

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(parsedCost) || parsedCost < 0) {
      toast({
        title: "Invalid cost",
        description: "Please enter a valid cost",
        variant: "destructive",
      });
      return;
    }

    const supply: Supply = {
      id: initialData?.id || crypto.randomUUID(),
      name: name.trim(),
      quantity: parsedQuantity,
      unit: unit.trim(),
      cost: parsedCost,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSubmit(supply);

    if (!initialData) {
      setName("");
      setQuantity("");
      setUnit("");
      setCost("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Supply" : "New Supply"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Supply Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Parchment Paper, Piping Bags"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., rolls, pieces, boxes"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Cost (₡) *</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {initialData ? "Update Supply" : "Add Supply"}
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

export default SupplyForm;
