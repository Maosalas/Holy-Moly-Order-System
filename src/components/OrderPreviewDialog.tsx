import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, Phone, Package, DollarSign, CreditCard } from "lucide-react";
import { Order } from "@/types/order";
import { TopperUploadDialog } from "./TopperUploadDialog";

interface OrderPreviewDialogProps {
  order: Order;
}

export const OrderPreviewDialog = ({ order }: OrderPreviewDialogProps) => {
  const deliveryDate = new Date(order.deliveryDate);
  const remainingBalance = order.totalAmount - order.downPayment;

  const getStatusColor = (status: string) => {
    const colors = {
      "waiting-for-payment": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "partially-paid": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "payment-received": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "confirmed": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "finished": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };
    return colors[status as keyof typeof colors] || colors["waiting-for-payment"];
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Preview Order">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Order Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Client Photos */}
          {order.clientPhotos.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Client Photos</h3>
              <div className="grid grid-cols-2 gap-2">
                {order.clientPhotos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Client photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Client Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Client Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{order.clientName}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Phone</p>
                </div>
                <p className="font-semibold">{order.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Order Details</h3>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
              {order.orderDetails}
            </p>
          </div>

          {/* Delivery Information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Delivery Information</h3>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{deliveryDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Payment Information</h3>
            <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                </div>
                <p className="text-lg font-bold">₡{order.totalAmount.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {order.paymentMethod}
                </Badge>
              </div>
              {order.downPayment > 0 && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Down Payment</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      ₡{order.downPayment.toLocaleString()}
                    </p>
                  </div>
                  {remainingBalance > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Remaining Balance</p>
                      <p className="font-semibold text-orange-600 dark:text-orange-400">
                        ₡{remainingBalance.toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Order Status */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Order Status</h3>
            <div className="flex flex-wrap gap-2">
              {order.statuses.map(status => (
                <Badge key={status} className={getStatusColor(status)}>
                  {getStatusLabel(status)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Cake Topper */}
          {order.needsCakeTopper && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-muted-foreground">Cake Topper Required</h3>
              </div>
              <TopperUploadDialog clientName={order.clientName} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
