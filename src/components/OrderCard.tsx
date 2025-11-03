import { Order } from "@/types/order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, MessageCircle, Calendar, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TopperUploadDialog } from "./TopperUploadDialog";

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
}

export const OrderCard = ({ order, onEdit, onDelete }: OrderCardProps) => {
  const handleWhatsApp = () => {
    const message = `Hola ${order.clientName}! Te hablamos de Holy Moly acerca de tu orden ${order.orderDetails}`;
    const url = `https://wa.me/${order.phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const deliveryDate = new Date(order.deliveryDate);
  const isUpcoming = deliveryDate >= new Date();

  const getStatusColor = (status: string) => {
    const colors = {
      "waiting_for_payment": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "partially_paid": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "payment_received": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "confirmed": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "finished": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };
    return colors[status as keyof typeof colors] || colors["waiting_for_payment"];
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      "waiting_for_payment": "Waiting",
      "partially_paid": "Partial",
      "payment_received": "Paid",
      "confirmed": "Confirmed",
      "finished": "Finished",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const remainingBalance = order.chargeAmount - order.downPayment;

  const getPhotoUrl = (photo: string | { id: string; photoUrl: string; createdAt: string }): string => {
    const url = typeof photo === 'string' ? photo : photo.photoUrl;
    // Ensure base64 images have proper data URL prefix
    if (url && !url.startsWith('data:') && !url.startsWith('http')) {
      return `data:image/jpeg;base64,${url}`;
    }
    return url || '';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
        {order.clientPhotos.length > 0 ? (
          <img
            src={getPhotoUrl(order.clientPhotos[0])}
            alt={`${order.clientName}'s order`}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="h-16 w-16 text-muted-foreground" />
        )}
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{order.clientName}</CardTitle>
          <div className="flex flex-wrap gap-1">
            {order.statuses.map(statusObj => {
              const statusValue = typeof statusObj === 'string' ? statusObj : statusObj.status;
              const statusKey = typeof statusObj === 'string' ? statusObj : statusObj.id;
              return (
                <Badge key={statusKey} className={getStatusColor(statusValue)}>
                  {getStatusLabel(statusValue)}
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {deliveryDate.toLocaleDateString()}
          {isUpcoming && (
            <Badge variant="outline" className="text-xs">Upcoming</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {order.orderDetails}
        </p>

        {order.needsCakeTopper && (order.topperDetails || (order.topperPhotos && order.topperPhotos.length > 0)) && (
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold mb-2">Cake Topper Info</p>
            {order.topperDetails && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{order.topperDetails}</p>
            )}
            {order.topperPhotos && order.topperPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-1">
                {order.topperPhotos.slice(0, 3).map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Topper ${index + 1}`}
                    className="w-full h-16 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {order.needsCakeTopper && (
          <div className="pt-2">
            <TopperUploadDialog clientName={order.clientName} />
          </div>
        )}

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Amount:</span>
            <span className="font-semibold flex items-center gap-1">
              ₡{order.chargeAmount.toLocaleString()}
            </span>
          </div>
          {order.downPayment > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Down Payment:</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ₡{order.downPayment.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-semibold">
                  ₡{remainingBalance.toLocaleString()}
                </span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Method:</span>
            <Badge variant="secondary" className="text-xs capitalize">
              {typeof order.paymentMethod === 'string' ? order.paymentMethod : order.paymentMethod.name}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsApp}
          className="flex-1 gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(order)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(order.id)}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
