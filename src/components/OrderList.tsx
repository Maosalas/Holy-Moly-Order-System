import { Order } from "@/types/order";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Edit, Trash2, Calendar, Package, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { OrderPreviewDialog } from "./OrderPreviewDialog";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "./PaginationControls";

interface OrderListProps {
  orders: Order[];
  onEdit?: (order: Order) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export const OrderList = ({ orders, onEdit, onDelete, isDeleting }: OrderListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(order =>
      order.clientName.toLowerCase().includes(query) ||
      order.phoneNumber.includes(query) ||
      order.orderDetails.toLowerCase().includes(query) ||
      order.paymentMethod.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination({ items: filteredOrders, itemsPerPage: 10 });

  const handleWhatsApp = (phoneNumber: string, clientName: string) => {
    const message = `Hola ${clientName}! Te hablamos de Holy Moly...`;
    const url = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "waiting_for_payment": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "partially_paid": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "payment_received": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "confirmed": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "finished": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };
    return colors[status as keyof typeof colors] || "";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      "waiting_for_payment": "Espera",
      "partially_paid": "Parcial",
      "payment_received": "Pagado",
      "confirmed": "Confirmado",
      "finished": "Terminado",
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (orders.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">No orders yet</p>
            <p className="text-sm mt-2">Create your first order to get started</p>
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
              placeholder="Buscar pedidos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-3">
          {paginatedItems.map((order) => (

            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {order.clientPhotos.length > 0 ? (
                        <img
                          src={order.clientPhotos[0]}
                          alt={order.clientName}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-background"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium text-muted-foreground">
                            {order.clientName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{order.clientName}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <OrderPreviewDialog order={order} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(order)}
                        title="Edit"
                        disabled={isDeleting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWhatsApp(order.phoneNumber, order.clientName)}
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(order.id)}
                        title="Delete"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Detalles:</span>
                      <span className="font-medium">{order.orderDetails}</span>
                    </div>
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fecha de entrega:</span>
                      </div>
                      <span className="font-semibold">{new Date(order.deliveryDate).toLocaleDateString('en-US')}</span>

                    </div>
                    <div className="space-y-1 flex items-center gap-2 justify-between">
                      <span className="text-muted-foreground">Pago:</span>
                      <div className="text-right">
                        <div className="gap-1 font-semibold">
                          ₡{order.chargeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {order.downPayment > 0 && (
                          <>
                            <div className="text-xs text-green-600 dark:text-green-400">
                              Pagado: ₡{order.downPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Balance: ₡{(order.chargeAmount - order.downPayment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(100 - ((order.downPayment / order.chargeAmount) * 100)).toFixed(0)}%)
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div>

                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-muted-foreground">Status:</span>
                        {order.statuses.map(statusObj => {
                          const statusValue = typeof statusObj === 'string' ? statusObj : statusObj.status;
                          const statusKey = typeof statusObj === 'string' ? statusObj : statusObj.id;
                          return (
                            <Badge key={statusKey} className={`text-xs ${getStatusColor(statusValue)}`}>
                              {getStatusLabel(statusValue)}
                            </Badge>
                          );
                        })}
                      </div>

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
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, teléfono o detalles..."
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
                  <TableHead className="font-semibold">Fecha de entrega</TableHead>
                  <TableHead className="font-semibold">Monto y cobro</TableHead>
                  <TableHead className="font-semibold">Método de pago</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Detalles</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((order) => {
                  const remainingBalance = order.chargeAmount - order.downPayment;
                  const paymentProgress = (order.downPayment / order.chargeAmount) * 100;

                  return (
                    <TableRow key={order.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {order.clientPhotos.length > 0 ? (
                            <img
                              src={order.clientPhotos[0]}
                              alt={order.clientName}
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-background"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-sm font-medium text-muted-foreground">
                                {order.clientName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">{order.clientName}</div>
                            <div className="text-xs text-muted-foreground">{order.phoneNumber}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div className="font-medium">
                            {new Date(order.deliveryDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 font-semibold">
                            ₡{order.chargeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {order.downPayment > 0 && (
                            <>
                              <div className="text-xs text-green-600 dark:text-green-400">
                                Pagado: ₡{order.downPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Balance: ₡{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(100 - paymentProgress).toFixed(0)}%)
                              </div>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {order.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {order.statuses.map(statusObj => {
                            const statusValue = typeof statusObj === 'string' ? statusObj : statusObj.status;
                            const statusKey = typeof statusObj === 'string' ? statusObj : statusObj.id;
                            return (
                              <Badge key={statusKey} className={`text-xs ${getStatusColor(statusValue)}`}>
                                {getStatusLabel(statusValue)}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px]">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {order.orderDetails}
                          </p>
                          {order.clientPhotos.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.clientPhotos.length} foto{order.clientPhotos.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end items-center">
                          <OrderPreviewDialog order={order} />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleWhatsApp(order.phoneNumber, order.clientName)}
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(order)}
                              title="Edit"
                              disabled={isDeleting}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(order.id)}
                              title="Delete"
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        </CardContent>
      </Card>
    </>
  );
};
