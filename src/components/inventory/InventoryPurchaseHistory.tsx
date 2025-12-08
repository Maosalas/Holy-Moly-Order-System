import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShoppingCart } from "lucide-react";
import { InventoryPurchase } from "@/types/inventory";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/PaginationControls";

interface InventoryPurchaseHistoryProps {
  purchases: InventoryPurchase[];
  isLoading: boolean;
}

export function InventoryPurchaseHistory({ purchases, isLoading }: InventoryPurchaseHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => 
      purchase.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.supplierName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [purchases, searchQuery]);

  const sortedPurchases = useMemo(() => {
    return [...filteredPurchases].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [filteredPurchases]);

  const { paginatedItems, currentPage, totalPages, goToPage, hasNextPage, hasPreviousPage } = usePagination({ items: sortedPurchases });

  if (isLoading) {
    return <Card><CardContent className="py-10 text-center"><p className="text-muted-foreground">Cargando historial...</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Historial de Compras</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Buscar por item o proveedor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </CardHeader>
      <CardContent>
        {sortedPurchases.length === 0 ? (
          <div className="text-center py-8"><ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">No hay compras registradas</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Item</TableHead><TableHead>Cantidad</TableHead><TableHead>Costo</TableHead><TableHead>Proveedor</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(paginatedItems as InventoryPurchase[]).map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(purchase.purchaseDate), "dd MMM yyyy", { locale: es })}</TableCell>
                      <TableCell className="font-medium">{purchase.itemName}</TableCell>
                      <TableCell><Badge variant="outline">+{purchase.quantity} {purchase.unit}</Badge></TableCell>
                      <TableCell>{purchase.cost > 0 ? `$${purchase.cost.toFixed(2)}` : "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{purchase.supplierName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{purchase.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
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
