import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, History, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { InventoryMovement } from "@/types/inventory";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/PaginationControls";

interface InventoryMovementHistoryProps {
  movements: InventoryMovement[];
  isLoading: boolean;
}

export function InventoryMovementHistory({ movements, isLoading }: InventoryMovementHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMovements = useMemo(() => movements.filter(m => m.itemName.toLowerCase().includes(searchQuery.toLowerCase())), [movements, searchQuery]);
  const sortedMovements = useMemo(() => [...filteredMovements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [filteredMovements]);

  const { paginatedItems, currentPage, totalPages, goToPage, hasNextPage, hasPreviousPage } = usePagination({ items: sortedMovements });

  const getMovementIcon = (type: InventoryMovement["movementType"]) => {
    switch (type) {
      case "deduction": return <ArrowDown className="h-4 w-4 text-destructive" />;
      case "restock": return <ArrowUp className="h-4 w-4 text-green-600" />;
      case "adjustment": return <RefreshCw className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMovementLabel = (type: InventoryMovement["movementType"]) => {
    switch (type) {
      case "deduction": return { label: "Deducción", variant: "destructive" as const };
      case "restock": return { label: "Reposición", variant: "default" as const };
      case "adjustment": return { label: "Ajuste", variant: "secondary" as const };
    }
  };

  if (isLoading) {
    return <Card><CardContent className="py-10 text-center"><p className="text-muted-foreground">Cargando historial...</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Historial de Movimientos</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Buscar por item..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </CardHeader>
      <CardContent>
        {sortedMovements.length === 0 ? (
          <div className="text-center py-8"><History className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">No hay movimientos registrados</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Item</TableHead><TableHead>Tipo</TableHead><TableHead>Cantidad</TableHead><TableHead>Stock</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(paginatedItems as InventoryMovement[]).map((movement) => {
                    const typeInfo = getMovementLabel(movement.movementType);
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(movement.createdAt), "dd MMM yyyy HH:mm", { locale: es })}</TableCell>
                        <TableCell className="font-medium">{movement.itemName}</TableCell>
                        <TableCell><div className="flex items-center gap-2">{getMovementIcon(movement.movementType)}<Badge variant={typeInfo.variant}>{typeInfo.label}</Badge></div></TableCell>
                        <TableCell><span className={movement.movementType === "deduction" ? "text-destructive" : "text-green-600"}>{movement.movementType === "deduction" ? "-" : "+"}{movement.quantity} {movement.unit}</span></TableCell>
                        <TableCell className="text-muted-foreground">{movement.previousStock} → {movement.newStock}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{movement.notes || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} hasNextPage={hasNextPage} hasPreviousPage={hasPreviousPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
