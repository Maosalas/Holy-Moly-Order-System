import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Eye, Calendar, Search, Calculator } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredQuotations = useMemo(() => {
    if (!searchQuery.trim()) return quotations;
    const query = searchQuery.toLowerCase();
    return quotations.filter(quotation =>
      quotation.clientName.toLowerCase().includes(query) ||
      quotation.size.toLowerCase().includes(query) ||
      (quotation.notes && quotation.notes.toLowerCase().includes(query))
    );
  }, [quotations, searchQuery]);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination({ items: filteredQuotations, itemsPerPage: 10 });

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
      <Card className="w-full">
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">No hay cotizaciones aún</p>
            <p className="text-sm mt-2">Crea una nueva cotización para comenzar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, tamaño o notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Cliente</TableHead>
              <TableHead className="font-semibold">Tamaño</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold">Recetas</TableHead>
              <TableHead className="font-semibold">Suministros</TableHead>
              <TableHead className="font-semibold">Costo Total</TableHead>
              <TableHead className="text-right font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((quotation) => (
              <TableRow key={quotation.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="font-semibold">{quotation.clientName}</div>
                  {quotation.notes && (
                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                      {quotation.notes}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getSizeBadgeColor(quotation.size)}>
                    {quotation.size}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      {new Date(quotation.createdAt).toLocaleDateString('es-ES', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {quotation.recipes.length} receta(s)
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {quotation.selectedSupplies?.length || 0} suministro(s)
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold">
                    ₡{quotation.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewQuotation(quotation)}
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(quotation)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(quotation.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
