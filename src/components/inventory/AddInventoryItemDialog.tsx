import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Beaker } from "lucide-react";
import { InventoryItemFormData } from "@/types/inventory";
import { useCreateInventoryItem } from "@/hooks/use-inventory";
import { useIngredients } from "@/hooks/use-ingredients";
import { useSupplies } from "@/hooks/use-supplies";

interface AddInventoryItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddInventoryItemDialog({ isOpen, onClose }: AddInventoryItemDialogProps) {
  const createItem = useCreateInventoryItem();
  const { data: ingredients = [] } = useIngredients();
  const { data: supplies = [] } = useSupplies();

  const [itemType, setItemType] = useState<"ingredient" | "supply">("ingredient");
  const [formData, setFormData] = useState<Partial<InventoryItemFormData>>({
    itemType: "ingredient",
    ingredientId: "",
    supplyId: "",
    currentStock: 0,
    minStockThreshold: 0,
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      itemType,
      ingredientId: itemType === "ingredient" ? prev.ingredientId : "",
      supplyId: itemType === "supply" ? prev.supplyId : "",
    }));
  }, [itemType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedId = itemType === "ingredient" ? formData.ingredientId : formData.supplyId;
    if (!selectedId) return;

    await createItem.mutateAsync({
      itemType,
      ingredientId: itemType === "ingredient" ? formData.ingredientId : undefined,
      supplyId: itemType === "supply" ? formData.supplyId : undefined,
      currentStock: formData.currentStock || 0,
      minStockThreshold: formData.minStockThreshold || 0,
    });

    // Reset form
    setFormData({
      itemType: "ingredient",
      ingredientId: "",
      supplyId: "",
      currentStock: 0,
      minStockThreshold: 0,
    });
    setItemType("ingredient");
    onClose();
  };

  const selectedItem = itemType === "ingredient" 
    ? (ingredients as any[]).find(i => i.id === formData.ingredientId)
    : (supplies as any[]).find(s => s.id === formData.supplyId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Agregar Item al Inventario
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={itemType} onValueChange={(v) => setItemType(v as "ingredient" | "supply")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ingredient" className="flex items-center gap-2">
                <Beaker className="h-4 w-4" />
                Ingrediente
              </TabsTrigger>
              <TabsTrigger value="supply" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Suministro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ingredient" className="mt-4">
              <div className="space-y-2">
                <Label>Seleccionar Ingrediente *</Label>
                <Select 
                  value={formData.ingredientId} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, ingredientId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ingrediente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(ingredients as any[]).map(ingredient => (
                      <SelectItem key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({ingredient.units})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="supply" className="mt-4">
              <div className="space-y-2">
                <Label>Seleccionar Suministro *</Label>
                <Select 
                  value={formData.supplyId} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, supplyId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar suministro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(supplies as any[]).map(supply => (
                      <SelectItem key={supply.id} value={supply.id}>
                        {supply.name} ({supply.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentStock">Stock Actual *</Label>
              <Input
                id="currentStock"
                type="number"
                min="0"
                step="0.01"
                value={formData.currentStock || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, currentStock: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                required
              />
              {selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Unidad: {selectedItem.units || selectedItem.unit}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStockThreshold">Stock Mínimo *</Label>
              <Input
                id="minStockThreshold"
                type="number"
                min="0"
                step="0.01"
                value={formData.minStockThreshold || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, minStockThreshold: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                required
              />
              <p className="text-xs text-muted-foreground">
                Se alertará cuando el stock baje de este nivel
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createItem.isPending || !(formData.ingredientId || formData.supplyId)}
            >
              {createItem.isPending ? "Guardando..." : "Agregar al Inventario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
