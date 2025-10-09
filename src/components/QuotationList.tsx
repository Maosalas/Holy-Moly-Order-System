import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, Calendar } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { QuotationPreviewDialog } from "@/components/QuotationPreviewDialog";
import type { Quotation } from "@/types/quotation";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "./PaginationControls";

interface QuotationListProps {
  quotations: Quotation[];
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: string) => void;
}

export function QuotationList({ quotations, onEdit, onDelete }: QuotationListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination({ items: quotations, itemsPerPage: 10 });

  const getSizeBadgeColor = (size: string) => {
    const colors = {
      pequeño: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      mediano: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      grande: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    };
    return colors[size as keyof typeof colors] || "";
  };

  if (quotations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No hay cotizaciones aún. Crea una nueva cotización para comenzar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginatedItems.map((quotation) => (
          <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{quotation.clientName}</CardTitle>
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
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {quotation.recipes.length} receta(s) incluida(s)
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">Costo Total:</span>
                  <span className="text-xl font-bold">₡{quotation.totalCost.toFixed(2)}</span>
                </div>

                {quotation.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {quotation.notes}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewQuotation(quotation)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(quotation)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(quotation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
      />

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            onDelete(deleteId);
            setDeleteId(null);
          }
        }}
        title="Eliminar cotización"
        description="¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer."
      />

      <QuotationPreviewDialog
        quotation={previewQuotation}
        open={previewQuotation !== null}
        onOpenChange={(open) => !open && setPreviewQuotation(null)}
      />
    </>
  );
}
