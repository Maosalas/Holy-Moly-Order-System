import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart } from "lucide-react";
import { InventoryItem, InventoryPurchaseFormData } from "@/types/inventory";
import { useCreatePurchase } from "@/hooks/use-inventory";
import { format } from "date-fns";

interface InventoryPurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InventoryItem | null;
  items: InventoryItem[];
}

export function InventoryPurchaseForm({ isOpen, onClose, selectedItem, items }: InventoryPurchaseFormProps) {
  const createPurchase = useCreatePurchase();
  
  const [formData, setFormData] = useState<Partial<InventoryPurchaseFormData>>({
    inventoryItemId: "",
    quantity: 0,
    unit: "",
    cost: 0,
    supplierName: "",
    purchaseDate: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  useEffect(() => {
    if (selectedItem) {
      setFormData(prev => ({
        ...prev,
        inventoryItemId: selectedItem.id,
        unit: selectedItem.unit,
      }));
    }
  }, [selectedItem]);

  const handleItemChange = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    setFormData(prev => ({
      ...prev,
      inventoryItemId: itemId,
      unit: item?.unit || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.inventoryItemId || !formData.quantity || formData.quantity <= 0) {
      return;
    }

    await createPurchase.mutateAsync(formData as InventoryPurchaseFormData);
    
    // Reset form
    setFormData({
      inventoryItemId: "",
      quantity: 0,
      unit: "",
      cost: 0,
      supplierName: "",
      purchaseDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
    onClose();
  };

  const selectedItemData = items.find(i => i.id === formData.inventoryItemId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Registrar Compra / Reposición
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item">Item a reponer *</Label>
            <Select 
              value={formData.inventoryItemId} 
              onValueChange={handleItemChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar item..." />
              </SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2">
                      <span>{item.itemName}</span>
                      {item.isLowStock && (
                        <span className="text-xs text-amber-600">(Stock bajo)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItemData && (
              <p className="text-xs text-muted-foreground">
                Stock actual: {selectedItemData.currentStock} {selectedItemData.unit}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.quantity || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidad</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="kg, unidades, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Costo total</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Fecha de compra</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierName">Proveedor</Label>
            <Input
              id="supplierName"
              value={formData.supplierName}
              onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
              placeholder="Nombre del proveedor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createPurchase.isPending || !formData.inventoryItemId || !formData.quantity}
            >
              {createPurchase.isPending ? "Guardando..." : "Registrar Compra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
