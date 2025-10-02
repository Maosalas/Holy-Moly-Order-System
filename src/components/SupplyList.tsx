import { Supply } from "@/types/supply";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Package } from "lucide-react";

interface SupplyListProps {
  supplies: Supply[];
  onEdit: (supply: Supply) => void;
  onDelete: (id: string) => void;
}

const SupplyList = ({ supplies, onEdit, onDelete }: SupplyListProps) => {
  const totalValue = supplies.reduce((sum, supply) => sum + supply.cost, 0);

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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Inventory Overview</CardTitle>
          <CardDescription>Total supplies value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">₡{totalValue.toLocaleString()}</div>
        </CardContent>
      </Card>

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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(supply.id)}
                          title="Delete"
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
    </>
  );
};

export default SupplyList;
