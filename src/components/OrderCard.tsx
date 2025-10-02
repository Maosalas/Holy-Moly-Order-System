import { Order } from "@/types/order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, MessageCircle, Calendar, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
}

export const OrderCard = ({ order, onEdit, onDelete }: OrderCardProps) => {
  const handleWhatsApp = () => {
    const message = `Hi ${order.clientName}! This is about your order for ${order.deliveryDate}`;
    const url = `https://wa.me/${order.phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const deliveryDate = new Date(order.deliveryDate);
  const isUpcoming = deliveryDate >= new Date();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
        {order.clientPhotos.length > 0 ? (
          <img 
            src={order.clientPhotos[0]} 
            alt={`${order.clientName}'s order`}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="h-16 w-16 text-muted-foreground" />
        )}
      </div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{order.clientName}</CardTitle>
          {order.needsCakeTopper && (
            <Badge variant="secondary" className="text-xs">Topper</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {deliveryDate.toLocaleDateString()}
          {isUpcoming && (
            <Badge variant="outline" className="text-xs">Upcoming</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {order.orderDetails}
        </p>
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
