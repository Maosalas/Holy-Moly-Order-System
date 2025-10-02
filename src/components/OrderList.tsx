import { Order } from "@/types/order";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Edit, Trash2, Calendar, Package } from "lucide-react";
import { OrderPreviewDialog } from "./OrderPreviewDialog";

interface OrderListProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
}

export const OrderList = ({ orders, onEdit, onDelete }: OrderListProps) => {
  const handleWhatsApp = (phoneNumber: string, clientName: string) => {
    const message = `Hi ${clientName}! This is about your order.`;
    const url = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "waiting-for-payment": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "partially-paid": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "payment-received": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "confirmed": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "finished": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };
    return colors[status as keyof typeof colors] || "";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      "waiting-for-payment": "Waiting",
      "partially-paid": "Partial",
      "payment-received": "Paid",
      "confirmed": "Confirmed",
      "finished": "Finished",
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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Client</TableHead>
            <TableHead className="font-semibold">Delivery Date</TableHead>
            <TableHead className="font-semibold">Amount & Payment</TableHead>
            <TableHead className="font-semibold">Payment Method</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Details</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
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
                          Paid: ₡{order.downPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Balance: ₡{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(100-paymentProgress).toFixed(0)}%)
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
                    {order.statuses.map(status => (
                      <Badge key={status} className={`text-xs ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[250px]">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {order.orderDetails}
                    </p>
                    {order.clientPhotos.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.clientPhotos.length} photo{order.clientPhotos.length !== 1 ? 's' : ''}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(order)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(order.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
