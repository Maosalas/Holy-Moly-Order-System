import { Recipe } from "@/types/recipe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChefHat, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { RecipePreviewDialog } from "./RecipePreviewDialog";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "./PaginationControls";

interface RecipeListProps {
  recipes: Recipe[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export const RecipeList = ({ recipes, onEdit, onDelete, isDeleting }: RecipeListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const query = searchQuery.toLowerCase();
    return recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(query) ||
      (recipe.categories || [(recipe as any).category]).some(cat => cat?.toLowerCase().includes(query))
    );
  }, [recipes, searchQuery]);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination({ items: filteredRecipes, itemsPerPage: 10 });

  if (recipes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No recipes yet</CardTitle>
          <CardDescription>Create your first recipe to get started</CardDescription>
        </CardHeader>
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
              placeholder="Buscar recetas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-3">
          {paginatedItems.map((recipe) => (

            <Card key={recipe.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                          {recipe.image ? (
                            <img
                              src={recipe.image}
                              alt={recipe.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ChefHat className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-semibold">{recipe.name}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <RecipePreviewDialog recipe={recipe} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(recipe)}
                        title="Edit"
                        disabled={isDeleting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(recipe.id)}
                        title="Delete"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Elaboraciones base:</span>
                      <span className="font-medium">{recipe.elaborations?.length || 0}</span>
                    </div>
                    {recipe.variations && recipe.variations.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Variaciones:</span>
                        <span className="font-medium text-primary">{recipe.variations.length}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categorías:</span>
                      <span className="font-medium">{(recipe.categories || [(recipe as any).category]).join(', ')}</span>
                    </div>

                    <div className="space-y-1 flex items-center gap-2 justify-between">
                      <span className="text-muted-foreground">Costo total:</span>
                      <div className="text-right">
                        <div className="gap-1 font-semibold">
                          <span className="font-bold text-primary text-lg">₡{recipe.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>

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
          <CardTitle>Recipe Collection</CardTitle>
          <CardDescription>All your saved recipes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Receta</TableHead>
                  <TableHead className="font-semibold">Elaboraciones Base</TableHead>
                  <TableHead className="font-semibold">Variaciones</TableHead>
                  <TableHead className="font-semibold">Costo Total</TableHead>
                  <TableHead className="font-semibold">Categorías</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                          {recipe.image ? (
                            <img
                              src={recipe.image}
                              alt={recipe.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ChefHat className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-semibold">{recipe.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{recipe.elaborations?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {recipe.variations && recipe.variations.length > 0 ? (
                          <span className="font-medium text-primary">{recipe.variations.length}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-primary text-lg">
                        ₡{recipe.totalCost.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(recipe.categories || [(recipe as any).category]).map((cat, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <RecipePreviewDialog recipe={recipe} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(recipe)}
                          title="Edit"
                          disabled={isDeleting}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(recipe.id)}
                          title="Delete"
                          disabled={isDeleting}
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
