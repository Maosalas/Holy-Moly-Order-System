import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ShoppingCart, Plus, Trash2, Package, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryItem } from "@/types/inventory";
import { useCreatePurchase } from "@/hooks/use-inventory";
import { useExpenses } from "@/hooks/use-expenses";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface InventoryPurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InventoryItem | null;
  preSelectedExpenseId?: string | null;
  ingredients: any[];
  supplies: any[];
}

interface PurchaseLineItem {
  itemId: string;
  itemType: 'ingredient' | 'supply';
  quantity: number;
  unit: string;
  itemName?: string;
}

interface PurchaseableItem {
  id: string;
  name: string;
  unit: string;
  type: 'ingredient' | 'supply';
  currentStock?: number;
  isLowStock?: boolean;
}

export function InventoryPurchaseForm({ isOpen, onClose, selectedItem, preSelectedExpenseId, ingredients, supplies }: InventoryPurchaseFormProps) {
  const createPurchase = useCreatePurchase();
  const { data: expenses = [] } = useExpenses();
  const { toast } = useToast();

  const [purchaseLines, setPurchaseLines] = useState<PurchaseLineItem[]>([]);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  // Current line being added
  const [currentItem, setCurrentItem] = useState<string>("");
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [expenseComboboxOpen, setExpenseComboboxOpen] = useState(false);

  // Combine ingredients and supplies into a single purchaseable items array
  const purchaseableItems: PurchaseableItem[] = useMemo(() => {
    const ingredientItems: PurchaseableItem[] = (ingredients || []).map((ing: any) => ({
      id: ing.id,
      name: ing.name,
      unit: ing.unit || 'unidad',
      type: 'ingredient' as const,
      currentStock: ing.currentStock,
      isLowStock: ing.isLowStock,
    }));

    const supplyItems: PurchaseableItem[] = (supplies || []).map((sup: any) => ({
      id: sup.id,
      name: sup.name,
      unit: sup.unit || 'unidad',
      type: 'supply' as const,
      currentStock: sup.currentStock,
      isLowStock: sup.isLowStock,
    }));

    return [...ingredientItems, ...supplyItems].sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients, supplies]);

  useEffect(() => {
    console.log('📦 Purchaseable items available:', purchaseableItems.length, purchaseableItems);
    console.log('🥕 Ingredients:', ingredients.length);
    console.log('📦 Supplies:', supplies.length);
  }, [purchaseableItems, ingredients, supplies]);

  // Pre-select expense if navigated from expense creation
  useEffect(() => {
    if (preSelectedExpenseId && isOpen && expenses.length > 0) {
      const expense = expenses.find((exp: any) => exp.id === preSelectedExpenseId);
      if (expense) {
        setSelectedExpenseId(preSelectedExpenseId);
        setPurchaseDate(expense.purchaseDate);
      }
    }
  }, [preSelectedExpenseId, isOpen, expenses]);

  // Pre-populate form when a specific item is selected for restock
  useEffect(() => {
    if (selectedItem && isOpen) {
      const itemId = selectedItem.ingredientId || selectedItem.supplyId;
      if (itemId) {
        // Pre-select the item in the combobox
        setCurrentItem(itemId);
        // Optionally set a suggested quantity based on min threshold
        const suggestedQuantity = selectedItem.minStockThreshold - selectedItem.currentStock;
        if (suggestedQuantity > 0) {
          setCurrentQuantity(suggestedQuantity);
        }
      }
    } else if (!isOpen) {
      // Reset current item fields when dialog closes
      setCurrentItem("");
      setCurrentQuantity(0);
      if (!preSelectedExpenseId) {
        setSelectedExpenseId("");
      }
    }
  }, [selectedItem, isOpen, preSelectedExpenseId]);

  const addItemToList = (itemId: string, quantity?: number) => {
    const item = purchaseableItems.find(i => i.id === itemId);
    if (!item) {
      console.error('Item not found:', itemId);
      return;
    }

    const newLine: PurchaseLineItem = {
      itemId: itemId,
      itemType: item.type,
      quantity: quantity !== undefined ? quantity : currentQuantity,
      unit: item.unit,
      itemName: item.name,
    };

    setPurchaseLines([...purchaseLines, newLine]);

    // Reset current line
    setCurrentItem("");
    setCurrentQuantity(0);
  };

  const handleAddLine = () => {
    if (!currentItem || currentQuantity <= 0) {
      toast({
        title: "Campos incompletos",
        description: "Selecciona un item y cantidad válida",
        variant: "destructive",
      });
      return;
    }

    addItemToList(currentItem, currentQuantity);
  };

  const removeLine = (index: number) => {
    setPurchaseLines(purchaseLines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof PurchaseLineItem, value: any) => {
    const newLines = [...purchaseLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setPurchaseLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (purchaseLines.length === 0) {
      toast({
        title: "Sin items",
        description: "Agrega al menos un item a la compra",
        variant: "destructive",
      });
      return;
    }

    if (!selectedExpenseId) {
      toast({
        title: "Gasto requerido",
        description: "Selecciona un gasto para asociar con esta compra",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a purchase for each line item
      for (const line of purchaseLines) {
        const purchaseData = {
          inventoryItemId: line.itemId,
          quantity: line.quantity,
          unit: line.unit,
          cost: 0, // El costo está en el gasto
          expenseId: selectedExpenseId,
          purchaseDate,
          notes: `${line.itemType === 'ingredient' ? 'Ingrediente' : 'Suministro'}: ${line.itemName}. ${notes || ''}`,
        };

        await createPurchase.mutateAsync(purchaseData);
      }

      toast({
        title: "Compra registrada",
        description: `Se registraron ${purchaseLines.length} items exitosamente`,
      });

      // Reset form
      setPurchaseLines([]);
      setSelectedExpenseId("");
      setPurchaseDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
      setCurrentItem("");
      setCurrentQuantity(0);
      onClose();
    } catch (error) {
      console.error('Error creating purchase:', error);
    }
  };

  const availableItems = useMemo(() => {
    return purchaseableItems.filter(item => !purchaseLines.some(line => line.itemId === item.id));
  }, [purchaseableItems, purchaseLines]);

  console.log('🔍 Available items for selection:', availableItems.length);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Registrar Compra / Reposición
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información general de la compra */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense">Gasto Asociado *</Label>
              <Popover open={expenseComboboxOpen} onOpenChange={setExpenseComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={expenseComboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedExpenseId
                      ? expenses.find((exp: any) => exp.id === selectedExpenseId)?.supermarketName
                      : "Seleccionar gasto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar gasto..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron gastos.</CommandEmpty>
                      <CommandGroup>
                        {expenses.map((expense: any) => (
                          <CommandItem
                            key={expense.id}
                            value={`${expense.supermarketName} ${expense.purchaseDate}`}
                            onSelect={() => {
                              setSelectedExpenseId(expense.id);
                              setPurchaseDate(expense.purchaseDate);
                              setExpenseComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedExpenseId === expense.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{expense.supermarketName}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(expense.purchaseDate), "dd MMM yyyy")} - ${expense.amount.toFixed(2)}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Fecha de compra</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                disabled
              />
            </div>
          </div>

          <Separator />

          {/* Agregar items */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Items a comprar</Label>

            <Card className="border-2 border-dashed">
              <CardContent className="pt-4">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-8 space-y-2">
                    <Label className="text-xs">Item</Label>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={comboboxOpen}
                          className="w-full justify-between"
                        >
                          {currentItem
                            ? availableItems.find((item) => item.id === currentItem)?.name
                            : "Seleccionar item..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar item..." />
                          <CommandList>
                            <CommandEmpty>No se encontraron items.</CommandEmpty>
                            <CommandGroup>
                              {availableItems.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.name} ${item.type}`}
                                  onSelect={() => {
                                    setCurrentItem(item.id);
                                    setComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      currentItem === item.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex items-center gap-2 flex-1">
                                    <Package className="h-3 w-3" />
                                    <span>{item.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({item.type === 'ingredient' ? 'Ingrediente' : 'Suministro'})
                                    </span>
                                    {item.isLowStock && item.currentStock !== undefined && (
                                      <span className="text-xs text-amber-600">
                                        (Stock: {item.currentStock})
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={currentQuantity || ""}
                      onChange={(e) => setCurrentQuantity(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div className="col-span-2">
                    <Button
                      type="button"
                      onClick={handleAddLine}
                      className="w-full"
                      size="sm"
                      disabled={!currentItem || currentQuantity <= 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de items agregados */}
            {purchaseLines.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Items agregados ({purchaseLines.length})</Label>
                {purchaseLines.map((line, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <p className="font-medium text-sm">{line.itemName}</p>
                          <p className="text-xs text-muted-foreground">{line.unit}</p>
                        </div>

                        <div className="col-span-5">
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              disabled={createPurchase.isPending || purchaseLines.length === 0}
            >
              {createPurchase.isPending ? "Guardando..." : `Registrar ${purchaseLines.length} item(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
