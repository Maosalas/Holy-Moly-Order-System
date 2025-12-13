import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Package, Beaker, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [ingredientComboOpen, setIngredientComboOpen] = useState(false);
  const [supplyComboOpen, setSupplyComboOpen] = useState(false);
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
                <Popover open={ingredientComboOpen} onOpenChange={setIngredientComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={ingredientComboOpen}
                      className="w-full justify-between"
                    >
                      {formData.ingredientId
                        ? (ingredients as any[]).find((ing: any) => ing.id === formData.ingredientId)?.name
                        : "Seleccionar ingrediente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar ingrediente..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron ingredientes.</CommandEmpty>
                        <CommandGroup>
                          {(ingredients as any[]).map((ingredient: any) => (
                            <CommandItem
                              key={ingredient.id}
                              value={ingredient.name}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, ingredientId: ingredient.id }));
                                setIngredientComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.ingredientId === ingredient.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {ingredient.name} ({ingredient.units})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>

            <TabsContent value="supply" className="mt-4">
              <div className="space-y-2">
                <Label>Seleccionar Suministro *</Label>
                <Popover open={supplyComboOpen} onOpenChange={setSupplyComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supplyComboOpen}
                      className="w-full justify-between"
                    >
                      {formData.supplyId
                        ? (supplies as any[]).find((sup: any) => sup.id === formData.supplyId)?.name
                        : "Seleccionar suministro..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar suministro..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron suministros.</CommandEmpty>
                        <CommandGroup>
                          {(supplies as any[]).map((supply: any) => (
                            <CommandItem
                              key={supply.id}
                              value={supply.name}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, supplyId: supply.id }));
                                setSupplyComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.supplyId === supply.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {supply.name} ({supply.unit})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
