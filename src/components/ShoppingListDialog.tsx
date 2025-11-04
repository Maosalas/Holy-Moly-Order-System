import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Order } from "@/types/order";
import { Quotation, QuotationRecipe, QuotationSupply, QuotationIngredient, QuotationAdditionalExpense } from "@/types/quotation";
import { useEffect, useState } from "react";
import { quotationsApi } from "@/lib/api";
import { Loader2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useOrganization } from "@/contexts/OrganizationContext";
import defaultLogo from "@/assets/Orderly-logo.png";

interface ShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Order[];
}

interface ConsolidatedItem {
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

interface ConsolidatedRecipe {
  name: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export const ShoppingListDialog = ({ open, onOpenChange, selectedOrders }: ShoppingListDialogProps) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (open && selectedOrders.length > 0) {
      loadQuotations();
    }
  }, [open, selectedOrders]);

  const loadQuotations = async () => {
    setIsLoading(true);
    try {
      const quotationIds = selectedOrders
        .filter(order => order.quotationId)
        .map(order => order.quotationId!);

      const quotationPromises = quotationIds.map(id => quotationsApi.getById(id));
      const results = await Promise.all(quotationPromises);

      const loadedQuotations = results
        .filter(result => result.data)
        .map(result => result.data as Quotation);

      setQuotations(loadedQuotations);
    } catch (error) {
      console.error("Error loading quotations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const consolidateSupplies = (): ConsolidatedItem[] => {
    const suppliesMap = new Map<string, ConsolidatedItem>();

    quotations.forEach(quotation => {
      quotation.selectedSupplies?.forEach((supply: QuotationSupply) => {
        const key = `${supply.supplyName}-${supply.unit}`;
        const existing = suppliesMap.get(key);

        if (existing) {
          existing.quantity += supply.quantity;
          existing.totalCost += supply.totalCost;
        } else {
          suppliesMap.set(key, {
            name: supply.supplyName,
            quantity: supply.quantity,
            unit: supply.unit,
            costPerUnit: supply.costPerUnit,
            totalCost: supply.totalCost,
          });
        }
      });
    });

    return Array.from(suppliesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const consolidateIngredients = (): ConsolidatedItem[] => {
    const ingredientsMap = new Map<string, ConsolidatedItem>();

    quotations.forEach(quotation => {
      quotation.additionalIngredients?.forEach((ingredient: QuotationIngredient) => {
        const key = `${ingredient.ingredientName}-${ingredient.units}`;
        const existing = ingredientsMap.get(key);

        if (existing) {
          existing.quantity += ingredient.quantity;
          existing.totalCost += ingredient.totalCost;
        } else {
          ingredientsMap.set(key, {
            name: ingredient.ingredientName,
            quantity: ingredient.quantity,
            unit: ingredient.units,
            costPerUnit: ingredient.costPerUnit,
            totalCost: ingredient.totalCost,
          });
        }
      });
    });

    return Array.from(ingredientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const consolidateExpenses = (): ConsolidatedItem[] => {
    const expensesMap = new Map<string, ConsolidatedItem>();

    quotations.forEach(quotation => {
      quotation.additionalExpenses?.forEach((expense: QuotationAdditionalExpense) => {
        const key = expense.expenseName;
        const existing = expensesMap.get(key);

        if (existing) {
          existing.quantity += expense.quantity;
          existing.totalCost += expense.totalPrice;
        } else {
          expensesMap.set(key, {
            name: expense.expenseName,
            quantity: expense.quantity,
            unit: 'unidad',
            costPerUnit: expense.unitPrice,
            totalCost: expense.totalPrice,
          });
        }
      });
    });

    return Array.from(expensesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const consolidateRecipes = (): ConsolidatedRecipe[] => {
    const recipesMap = new Map<string, ConsolidatedRecipe>();

    quotations.forEach(quotation => {
      quotation.recipes?.forEach((recipe: QuotationRecipe) => {
        const key = `${recipe.recipeName}-${recipe.recipeType.name}`;
        const existing = recipesMap.get(key);

        if (existing) {
          existing.quantity += recipe.quantity;
          existing.totalCost += recipe.totalCost;
        } else {
          recipesMap.set(key, {
            name: recipe.recipeName,
            type: recipe.recipeType.name,
            quantity: recipe.quantity,
            unitCost: recipe.unitCost,
            totalCost: recipe.totalCost,
          });
        }
      });
    });

    return Array.from(recipesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const supplies = consolidateSupplies();
  const ingredients = consolidateIngredients();
  const expenses = consolidateExpenses();
  const recipes = consolidateRecipes();

  const totalSupplies = supplies.reduce((sum, item) => sum + item.totalCost, 0);
  const totalIngredients = ingredients.reduce((sum, item) => sum + item.totalCost, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.totalCost, 0);
  const totalRecipes = recipes.reduce((sum, item) => sum + item.totalCost, 0);
  const grandTotal = totalSupplies + totalIngredients + totalExpenses + totalRecipes;

  const generatePDF = () => {
    const doc = new jsPDF();
    let yPosition = 10;

    // Add logo
    const logoToUse = currentOrganization?.logoUrl || defaultLogo;
    try {
      doc.addImage(logoToUse, 'PNG', 14, yPosition, 30, 30);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
    
    yPosition += 35;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Lista de Compras Consolidada", 105, yPosition, { align: "center" });

    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${selectedOrders.length} pedido${selectedOrders.length !== 1 ? 's' : ''} seleccionado${selectedOrders.length !== 1 ? 's' : ''}`,
      105,
      yPosition,
      { align: "center" }
    );

    yPosition += 15;

    // Recipes
    if (recipes.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Recetas", 14, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [["Nombre", "Tipo", "Cantidad", "Costo Unitario", "Total"]],
        body: recipes.map(recipe => [
          recipe.name,
          recipe.type,
          recipe.quantity.toString(),
          `CRC ${recipe.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          `CRC ${recipe.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        ]),
        foot: [["", "", "", "Subtotal:", `CRC ${totalRecipes.toLocaleString('en-US', { minimumFractionDigits: 2 })}`]],
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: "bold" },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Supplies
    if (supplies.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Suministros", 14, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [["Nombre", "Cantidad", "Unidad", "Costo por Unidad", "Total"]],
        body: supplies.map(supply => [
          supply.name,
          supply.quantity.toString(),
          supply.unit,
          `CRC ${supply.costPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          `CRC ${supply.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        ]),
        foot: [["", "", "", "Subtotal:", `CRC ${totalSupplies.toLocaleString('en-US', { minimumFractionDigits: 2 })}`]],
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: "bold" },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Additional Ingredients
    if (ingredients.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Ingredientes Adicionales", 14, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [["Nombre", "Cantidad", "Unidad", "Costo por Unidad", "Total"]],
        body: ingredients.map(ingredient => [
          ingredient.name,
          ingredient.quantity.toString(),
          ingredient.unit,
          `CRC ${ingredient.costPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          `CRC ${ingredient.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        ]),
        foot: [["", "", "", "Subtotal:", `CRC ${totalIngredients.toLocaleString('en-US', { minimumFractionDigits: 2 })}`]],
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: "bold" },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Other Expenses
    if (expenses.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Otros Gastos", 14, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [["Nombre", "Cantidad", "Unidad", "Precio Unitario", "Total"]],
        body: expenses.map(expense => [
          expense.name,
          expense.quantity.toString(),
          expense.unit,
          `CRC ${expense.costPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          `CRC ${expense.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        ]),
        foot: [["", "", "", "Subtotal:", `CRC ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`]],
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: "bold" },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Grand Total
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const totalText = `Total General: CRC ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    doc.text(totalText, 105, yPosition, { align: "center" });

    // Save PDF
    const fileName = `Lista_Compras_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Lista de Compras Consolidada</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {selectedOrders.length} pedido{selectedOrders.length !== 1 ? 's' : ''} seleccionado{selectedOrders.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={generatePDF} className="gap-2" disabled={isLoading}>
              <FileDown className="h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recetas */}
            {recipes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recetas</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo Unitario</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipes.map((recipe, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{recipe.name}</TableCell>
                          <TableCell>{recipe.type}</TableCell>
                          <TableCell className="text-right">{recipe.quantity}</TableCell>
                          <TableCell className="text-right">
                            ₡{recipe.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₡{recipe.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={4} className="text-right font-semibold">Subtotal Recetas:</TableCell>
                        <TableCell className="text-right font-bold">
                          ₡{totalRecipes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Suministros */}
            {supplies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Suministros</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead className="text-right">Costo por Unidad</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplies.map((supply, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{supply.name}</TableCell>
                          <TableCell className="text-right">{supply.quantity}</TableCell>
                          <TableCell>{supply.unit}</TableCell>
                          <TableCell className="text-right">
                            ₡{supply.costPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₡{supply.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={4} className="text-right font-semibold">Subtotal Suministros:</TableCell>
                        <TableCell className="text-right font-bold">
                          ₡{totalSupplies.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Ingredientes Adicionales */}
            {ingredients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ingredientes Adicionales</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead className="text-right">Costo por Unidad</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredients.map((ingredient, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{ingredient.name}</TableCell>
                          <TableCell className="text-right">{ingredient.quantity}</TableCell>
                          <TableCell>{ingredient.unit}</TableCell>
                          <TableCell className="text-right">
                            ₡{ingredient.costPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₡{ingredient.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={4} className="text-right font-semibold">Subtotal Ingredientes:</TableCell>
                        <TableCell className="text-right font-bold">
                          ₡{totalIngredients.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Otros Gastos */}
            {expenses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Otros Gastos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead className="text-right">Precio Unitario</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell className="text-right">{expense.quantity}</TableCell>
                          <TableCell>{expense.unit}</TableCell>
                          <TableCell className="text-right">
                            ₡{expense.costPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₡{expense.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={4} className="text-right font-semibold">Subtotal Otros Gastos:</TableCell>
                        <TableCell className="text-right font-bold">
                          ₡{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Total General */}
            <Card className="border-2 border-primary">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total General:</span>
                  <span className="text-primary">
                    ₡{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};