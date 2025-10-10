import { Ingredient } from "@/types/ingredient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "./PaginationControls";

interface IngredientListProps {
  ingredients: Ingredient[];
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export const IngredientList = ({ ingredients, onEdit, onDelete, isDeleting }: IngredientListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) return ingredients;
    const query = searchQuery.toLowerCase();
    return ingredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(query) ||
      ingredient.provider.toLowerCase().includes(query)
    );
  }, [ingredients, searchQuery]);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination({ items: filteredIngredients, itemsPerPage: 10 });

  if (ingredients.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            No ingredients yet. Click "New Ingredient" to add your first ingredient.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Base de datos de ingredientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Provedor</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((ingredient) => (
                <TableRow key={ingredient.id}>
                  <TableCell className="font-medium">{ingredient.name}</TableCell>
                  <TableCell>{ingredient.provider}</TableCell>
                  <TableCell>{ingredient.qtyProvider.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <small className="font-bold">{ingredient.units}</small></TableCell>
                  <TableCell>₡{ingredient.cost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(ingredient)}
                        disabled={isDeleting}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(ingredient.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
      />
    </>
  );
};
