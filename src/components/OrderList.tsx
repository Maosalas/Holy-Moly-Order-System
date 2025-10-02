import { Order } from "@/types/order";
import { Card, CardContent } from "@/components/ui/card";
import { OrderCard } from "./OrderCard";

interface OrderListProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
}

export const OrderList = ({ orders, onEdit, onDelete }: OrderListProps) => {
  if (orders.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">No orders yet</p>
            <p className="text-sm mt-2">Create your first order to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
