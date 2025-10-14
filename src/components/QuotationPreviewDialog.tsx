import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "lucide-react";
import type { Quotation } from "@/types/quotation";

interface QuotationPreviewDialogProps {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotationPreviewDialog({
  quotation,
  open,
  onOpenChange,
}: QuotationPreviewDialogProps) {
  if (!quotation) return null;

  const getSizeBadgeColor = (size: string) => {
    const colors = {
      pequeño: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      mediano: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      grande: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    };
    return colors[size as keyof typeof colors] || "";
  };

  const recipesByType = {
    queque: quotation.recipes.filter(r => r.recipeType === 'queque'),
    relleno: quotation.recipes.filter(r => r.recipeType === 'relleno'),
    cubierta: quotation.recipes.filter(r => r.recipeType === 'cubierta'),
    unidad: quotation.recipes.filter(r => r.recipeType === 'unidad'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalles de Cotización</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">{quotation.clientName}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getSizeBadgeColor(quotation.size)}>
                  {quotation.size}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(quotation.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold">Recetas Incluidas</h4>
            
            {Object.entries(recipesByType).map(([type, recipes]) => 
              recipes.length > 0 && (
                <div key={type} className="space-y-2">
                  <h5 className="text-sm font-medium text-muted-foreground uppercase">{type}</h5>
                  {recipes.map((recipe, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium">{recipe.recipeName}</span>
                        <div className="text-sm text-muted-foreground">
                          ₡{recipe.unitCost.toFixed(2)} × {recipe.quantity}
                        </div>
                      </div>
                      <span className="font-semibold">₡{recipe.totalCost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {quotation.selectedSupplies && quotation.selectedSupplies.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold">Suministros Incluidos</h4>
                {quotation.selectedSupplies.map((supply, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium">{supply.supplyName}</span>
                      <div className="text-sm text-muted-foreground">
                        ₡{supply.costPerUnit.toFixed(2)} / {supply.unit} × {supply.quantity}
                      </div>
                    </div>
                    <span className="font-semibold">₡{supply.totalCost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {quotation.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Notas</h4>
                <p className="text-sm text-muted-foreground">{quotation.notes}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <span className="text-lg font-semibold">Costo Total:</span>
            <span className="text-2xl font-bold">₡{quotation.totalCost.toFixed(2)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
