import { useState, useEffect } from "react";
import { OrderForm } from "@/components/OrderForm";
import { OrderList } from "@/components/OrderList";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types/order";

const ORDERS_STORAGE_KEY = "holy-moly-orders";

const Orders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>(() => {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const handleCreateOrder = (orderData: Omit<Order, "id" | "createdAt">) => {
    const newOrder: Order = {
      ...orderData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setOrders((prev) => [newOrder, ...prev]);
    toast({
      title: "Order created",
      description: "The order has been created successfully",
    });
  };

  const handleUpdateOrder = (id: string, orderData: Omit<Order, "id" | "createdAt">) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, ...orderData } : order
      )
    );
    toast({
      title: "Order updated",
      description: "The order has been updated successfully",
    });
  };

  const handleDeleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== id));
    toast({
      title: "Order deleted",
      description: "The order has been deleted successfully",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold">Client Orders</h2>
        <p className="text-muted-foreground mt-1">Manage all your client orders</p>
      </div>
      <OrderForm onSubmit={handleCreateOrder} />
      <OrderList
        orders={orders}
        onUpdate={handleUpdateOrder}
        onDelete={handleDeleteOrder}
      />
    </div>
  );
};

export default Orders;
