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
  const remainingBalance = order.chargeAmount - order.downPayment;

  const getPhotoUrl = (photo: string | { id: string; photoUrl: string; createdAt: string }): string => {
    // Debug logging - see the full object structure
    console.log('Photo object:', photo);
    console.log('Photo keys:', typeof photo === 'object' ? Object.keys(photo) : 'N/A');

    const url = typeof photo === 'string' ? photo : photo.photoUrl;

    console.log('Extracted URL:', url?.substring(0, 50));

    // Ensure base64 images have proper data URL prefix
    if (url && !url.startsWith('data:') && !url.startsWith('http')) {
      return `data:image/jpeg;base64,${url}`;
    }
    return url || '';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "waiting_for_payment": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "partially_paid": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "payment_received": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "confirmed": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "finished": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };
    return colors[status as keyof typeof colors] || colors["waiting-for-payment"];
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      "waiting_for_payment": "En espera",
      "partially_paid": "Pago Parcial",
      "payment_received": "Pagado",
      "confirmed": "Confirmado",
      "finished": "Terminado",
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
          <DialogTitle className="text-2xl">Orden de {order.clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Photos */}
          {order.clientPhotos.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Fotos de referencia</h3>
              <div className="grid grid-cols-2 gap-2">
                {order.clientPhotos.map((photo, index) => {
                  const photoUrl = getPhotoUrl(photo);
                  return (
                    <img
                      key={typeof photo === 'string' ? index : photo.id}
                      src={photoUrl}
                      alt={`Client photo ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border"
                      onError={(e) => {
                        console.error('Failed to load image:', photoUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Client Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Información del cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-semibold">{order.clientName}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Numero de teléfono</p>
                </div>
                <p className="font-semibold">{order.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Detalles de Orden</h3>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
              {order.orderDetails}
            </p>
          </div>

          {/* Quotation Reference */}
          {order.quotationId && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Cotización</h3>
              <p className="text-sm bg-muted px-3 py-2 rounded-lg">
                ID: {order.quotationId}
              </p>
            </div>
          )}

          {/* Delivery Information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Información de Entrega</h3>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{deliveryDate.toLocaleDateString('es-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Información de pago</h3>
            <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Monto Cobrado</p>
                </div>
                <p className="text-lg font-bold">₡{order.chargeAmount.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Método de pago</p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {typeof order.paymentMethod === 'string' ? order.paymentMethod : order.paymentMethod.name}
                </Badge>
              </div>
              {order.downPayment > 0 && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Depósito</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      ₡{order.downPayment.toLocaleString()}
                    </p>
                  </div>
                  {remainingBalance > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Balance</p>
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
            <h3 className="font-semibold text-sm text-muted-foreground">Status de Orden</h3>
            <div className="flex flex-wrap gap-2">
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

          {/* Cake Topper */}
          {order.needsCakeTopper && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-muted-foreground">Información del Cake Topper</h3>
              </div>
              
              {order.topperDetails && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Detalles:</p>
                  <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">{order.topperDetails}</p>
                </div>
              )}
              
              {order.topperPhotos && order.topperPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Fotos de referencia:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {order.topperPhotos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Topper reference ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {(!order.topperDetails && (!order.topperPhotos || order.topperPhotos.length === 0)) && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground italic">No hay información del topper disponible aún.</p>
                  <div className="mt-2">
                    <TopperUploadDialog clientName={order.clientName} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
