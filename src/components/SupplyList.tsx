import { Supply } from "@/types/supply";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Package } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SupplyListProps {
  supplies: Supply[];
  onEdit: (supply: Supply) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const SupplyList = ({ supplies, onEdit, onDelete, isDeleting }: SupplyListProps) => {
  const isMobile = useIsMobile();

  if (supplies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No supplies yet</CardTitle>
          <CardDescription>Start tracking your supplies inventory</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {supplies.map((supply) => (
          <Card key={supply.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <h3 className="font-semibold text-base truncate">{supply.name}</h3>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(supply)}
                      title="Edit"
                      disabled={isDeleting}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(supply.id)}
                      title="Delete"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="font-medium">{supply.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="font-semibold">{supply.quantity} {supply.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-semibold">
                      ₡{supply.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
        <CardHeader>
          <CardTitle>Supplies Inventory</CardTitle>
          <CardDescription>All your tracked supplies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Supply Name</TableHead>
                  <TableHead className="font-semibold">Supplier</TableHead>
                  <TableHead className="font-semibold">Quantity</TableHead>
                  <TableHead className="font-semibold">Unit</TableHead>
                  <TableHead className="font-semibold">Cost</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.map((supply) => (
                  <TableRow key={supply.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{supply.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{supply.supplierName}</TableCell>
                    <TableCell className="font-semibold">{supply.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{supply.unit}</TableCell>
                    <TableCell className="font-semibold">
                      ₡{supply.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(supply)}
                          title="Edit"
                          disabled={isDeleting}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(supply.id)}
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
  );
};

export default SupplyList;
