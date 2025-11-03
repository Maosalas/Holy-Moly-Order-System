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
  const [supplierName, setSupplierName] = useState(initialData?.supplierName || "");
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "");
  const [unit, setUnit] = useState(initialData?.unit || "");
  const [cost, setCost] = useState(initialData?.cost?.toString() || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!name.trim() || !supplierName.trim() || !quantity || !unit.trim() || !cost) {
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
      organizationId: "temp-org-id", // TODO: Replace with actual org ID from auth context
      name: name.trim(),
      supplierName: supplierName.trim(),
      quantity: parsedQuantity,
      unit: unit.trim(),
      cost: parsedCost,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    try {
      await onSubmit(supply);

      if (!initialData) {
        setName("");
        setSupplierName("");
        setQuantity("");
        setUnit("");
        setCost("");
      }
    } finally {
      setIsSubmitting(false);
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

          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name *</Label>
            <Input
              id="supplierName"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g., Walmart, Amazon, Local Store"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0.1"
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
              step="any"
              min="0.1"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : (initialData ? "Update Supply" : "Add Supply")}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
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
