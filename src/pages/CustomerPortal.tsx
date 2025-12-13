import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Package, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Loader2,
  AlertCircle,
  Phone
} from "lucide-react";
import { ordersApi } from "@/lib/api";
import type { Order, OrderStatus } from "@/types/order";
import { formatDateForDisplay, parseDateFromDB } from "@/lib/utils";

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType; step: number }> = {
  waiting_for_payment: { 
    label: "Esperando Pago", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-300", 
    icon: Clock,
    step: 1
  },
  partially_paid: { 
    label: "Pago Parcial", 
    color: "bg-blue-100 text-blue-800 border-blue-300", 
    icon: CreditCard,
    step: 2
  },
  payment_received: { 
    label: "Pago Recibido", 
    color: "bg-green-100 text-green-800 border-green-300", 
    icon: CheckCircle2,
    step: 3
  },
  confirmed: { 
    label: "Confirmado", 
    color: "bg-purple-100 text-purple-800 border-purple-300", 
    icon: CheckCircle2,
    step: 4
  },
  finished: { 
    label: "Finalizado", 
    color: "bg-gray-100 text-gray-800 border-gray-300", 
    icon: Package,
    step: 5
  },
};

const CustomerPortal = () => {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!token) {
        setError("Token no válido");
        setLoading(false);
        return;
      }

      try {
        const { data, error: apiError } = await ordersApi.getByPortalToken(token);
        if (apiError) throw new Error(apiError);
        if (!data) throw new Error("Pedido no encontrado");
        setOrder(data as Order);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar el pedido");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando información del pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Pedido no encontrado</h2>
            <p className="text-muted-foreground">
              {error || "El enlace puede haber expirado o ser inválido. Por favor contacta al vendedor."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatus = order.statuses.length > 0 
    ? (typeof order.statuses[order.statuses.length - 1] === 'string' 
        ? order.statuses[order.statuses.length - 1] 
        : (order.statuses[order.statuses.length - 1] as { status: string }).status) as OrderStatus
    : 'waiting_for_payment';

  const currentStep = statusConfig[currentStatus]?.step || 1;
  const progressPercent = (currentStep / 5) * 100;
  const remainingBalance = order.chargeAmount - order.downPayment;
  const deliveryDate = parseDateFromDB(order.deliveryDate);

  const getPhotoUrl = (photo: string | { id: string; photoUrl: string; createdAt: string }): string => {
    const url = typeof photo === 'string' ? photo : photo.photoUrl;
    if (url && !url.startsWith('data:') && !url.startsWith('http')) {
      return `data:image/jpeg;base64,${url}`;
    }
    return url || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Estado de tu Pedido</h1>
          <p className="text-muted-foreground">Hola {order.clientName}, aquí puedes ver el estado de tu pedido</p>
        </div>

        {/* Status Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Estado Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <Badge className={`text-lg px-4 py-2 ${statusConfig[currentStatus]?.color}`}>
                {statusConfig[currentStatus]?.label || currentStatus}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Esperando</span>
                <span>Parcial</span>
                <span>Pagado</span>
                <span>Confirmado</span>
                <span>Listo</span>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="mt-6 space-y-3">
              {order.statuses.map((statusObj, index) => {
                const statusValue = typeof statusObj === 'string' ? statusObj : statusObj.status;
                const statusDate = typeof statusObj === 'string' ? null : statusObj.createdAt;
                const config = statusConfig[statusValue as OrderStatus];
                const StatusIcon = config?.icon || Clock;

                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${config?.color || 'bg-muted'}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{config?.label || statusValue}</p>
                      {statusDate && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(statusDate).toLocaleDateString('es-CR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalles del Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fecha de Entrega</span>
                <span className="font-semibold">
                  {formatDateForDisplay(deliveryDate)}
                </span>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-muted-foreground mb-2">Descripción</p>
                <p className="text-foreground">{order.orderDetails}</p>
              </div>

              {order.clientPhotos.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground mb-3">Fotos de Referencia</p>
                    <div className="grid grid-cols-2 gap-2">
                      {order.clientPhotos.map((photo, index) => (
                        <img
                          key={index}
                          src={getPhotoUrl(photo)}
                          alt={`Referencia ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {order.needsCakeTopper && order.topperDetails && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground mb-2">Detalles del Topper</p>
                    <p className="text-foreground">{order.topperDetails}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Información de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total del Pedido</span>
              <span className="text-xl font-bold">₡{order.chargeAmount.toLocaleString()}</span>
            </div>
            
            {order.downPayment > 0 && (
              <>
                <div className="flex items-center justify-between text-green-600">
                  <span>Adelanto Pagado</span>
                  <span className="font-semibold">-₡{order.downPayment.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo Pendiente</span>
                  <span className="text-xl font-bold text-primary">₡{remainingBalance.toLocaleString()}</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-muted-foreground">Método de Pago</span>
              <Badge variant="secondary">
                {typeof order.paymentMethod === 'string' ? order.paymentMethod : order.paymentMethod.name}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Phone className="h-5 w-5 mx-auto mb-2" />
              <p className="text-sm">
                ¿Tienes preguntas sobre tu pedido? Contáctanos directamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Este enlace es privado y solo para tu uso personal.</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
