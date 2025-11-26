import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Eye, Calendar, Search, Calculator, ShoppingCart } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { QuotationPreviewDialog } from "@/components/QuotationPreviewDialog";
import type { Quotation } from "@/types/quotation";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "./PaginationControls";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuotationListProps {
  quotations: Quotation[];
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: string) => void;
  onGenerateOrder: (quotation: Quotation) => void;
}

export function QuotationList({ quotations, onEdit, onDelete, onGenerateOrder }: QuotationListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

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
  if (isMobile) {
    return (
      <>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cotizaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-3">
          {paginatedItems.map((quotation) => (

            <Card key={quotation.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {quotation.clientName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold">{quotation.clientName}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onGenerateOrder(quotation)}
                        title="Generar pedido"
                      >
                        <ShoppingCart className="h-4 w-4 text-green-600" />
                      </Button>
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
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fecha creado:</span>
                      </div>
                      <span className="font-semibold">{new Date(quotation.createdAt).toLocaleDateString('en-US')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recetas:</span>
                      <span className="font-medium">{quotation.recipes.length} receta(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Suministros:</span>
                      <span className="font-medium">{quotation.selectedSupplies?.length || 0} suministro(s)</span>
                    </div>

                    <div className="space-y-1 flex items-center gap-2 justify-between">
                      <span className="text-muted-foreground">Costo total:</span>
                      <div className="text-right">
                        <div className="gap-1 font-semibold">
                          ₡{quotation.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div>
                    </div>
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
      </>
    );
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones</CardTitle>
        </CardHeader>
        <CardContent>
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
          <div className="">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Cliente</TableHead>
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
                          onClick={() => onGenerateOrder(quotation)}
                          title="Generar pedido"
                        >
                          <ShoppingCart className="h-4 w-4 text-green-600" />
                        </Button>
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
        </CardContent>
      </Card>

    </>
  );
}
