import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { OrderForm } from "./OrderForm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Order } from "@/types/order";

interface OrderListProps {
  orders: Order[];
  onUpdate: (id: string, order: Omit<Order, "id" | "createdAt">) => void;
  onDelete: (id: string) => void;
}

export const OrderList = ({ orders, onUpdate, onDelete }: OrderListProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const handleWhatsApp = (phoneNumber: string, clientName: string) => {
    const message = encodeURIComponent(`Hello ${clientName}, regarding your order...`);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleUpdate = (orderData: Omit<Order, "id" | "createdAt">) => {
    if (editingOrder) {
      onUpdate(editingOrder.id, orderData);
      setEditingOrder(null);
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No orders yet. Create your first order above!
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{order.clientName}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWhatsApp(order.phoneNumber, order.clientName)}
                      className="gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      WhatsApp
                    </Button>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(order.deliveryDate).toLocaleDateString()}
                    </div>
                    {order.needsCakeTopper && (
                      <Badge variant="secondary">Cake Topper</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingOrder(order)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(order.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Order Details</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {order.orderDetails}
                </p>
              </div>
              {order.clientPhotos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Client Ideas ({order.clientPhotos.length})
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {order.clientPhotos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Client idea ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <DeleteConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            onDelete(deleteId);
            setDeleteId(null);
          }
        }}
        recipeName={orders.find(o => o.id === deleteId)?.clientName || "this order"}
      />

      <Sheet open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Order</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {editingOrder && (
              <OrderForm
                initialData={editingOrder}
                onSubmit={handleUpdate}
                onCancel={() => setEditingOrder(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
