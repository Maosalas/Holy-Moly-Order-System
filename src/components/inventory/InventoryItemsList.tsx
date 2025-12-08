import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Search, ShoppingCart, Package, AlertTriangle, Edit2 } from "lucide-react";
import { InventoryItem } from "@/types/inventory";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/PaginationControls";

interface InventoryItemsListProps {
  items: InventoryItem[];
  isLoading: boolean;
  onRestock: (item: InventoryItem) => void;
  onEdit?: (item: InventoryItem) => void;
}

export function InventoryItemsList({ items, isLoading, onRestock, onEdit }: InventoryItemsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = 
        filter === "all" ? true :
        filter === "low" ? item.isLowStock && item.currentStock > 0 :
        filter === "out" ? item.currentStock === 0 : true;
      return matchesSearch && matchesFilter;
    });
  }, [items, searchQuery, filter]);

  const { paginatedItems, currentPage, totalPages, goToPage, hasNextPage, hasPreviousPage } = usePagination({ items: filteredItems });

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock === 0) {
      return { label: "Sin Stock", variant: "destructive" as const, color: "text-destructive" };
    }
    if (item.isLowStock) {
      return { label: "Stock Bajo", variant: "warning" as const, color: "text-amber-600" };
    }
    return { label: "Normal", variant: "secondary" as const, color: "text-green-600" };
  };

  const getStockPercentage = (item: InventoryItem) => {
    if (item.minStockThreshold === 0) return 100;
    const safeStock = item.minStockThreshold * 2;
    return Math.min((item.currentStock / safeStock) * 100, 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Cargando inventario...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items en Inventario
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
              Todos ({items.length})
            </Button>
            <Button variant={filter === "low" ? "default" : "outline"} size="sm" onClick={() => setFilter("low")}>
              Stock Bajo ({items.filter(i => i.isLowStock && i.currentStock > 0).length})
            </Button>
            <Button variant={filter === "out" ? "destructive" : "outline"} size="sm" onClick={() => setFilter("out")}>
              Sin Stock ({items.filter(i => i.currentStock === 0).length})
            </Button>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Buscar por nombre..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </CardHeader>
      <CardContent>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No se encontraron items</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Mínimo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginatedItems as InventoryItem[]).map((item) => {
                    const status = getStockStatus(item);
                    const percentage = getStockPercentage(item);
                    return (
                      <TableRow key={item.id} className={item.currentStock === 0 ? "bg-destructive/5" : item.isLowStock ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell><Badge variant="outline">{item.itemType === "ingredient" ? "Ingrediente" : "Suministro"}</Badge></TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className={status.color}>{item.currentStock} {item.unit}</span>
                            <Progress value={percentage} className="h-1.5 w-20" />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.minStockThreshold} {item.unit}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant === "warning" ? "outline" : status.variant} className={status.variant === "warning" ? "border-amber-500 text-amber-600" : ""}>
                            {item.currentStock === 0 && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {onEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(item)}><Edit2 className="h-4 w-4" /></Button>}
                            <Button variant={item.isLowStock ? "default" : "outline"} size="sm" onClick={() => onRestock(item)}>
                              <ShoppingCart className="h-4 w-4 mr-1" />Reponer
                            </Button>
                          </div>
                        </TableCell>
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
