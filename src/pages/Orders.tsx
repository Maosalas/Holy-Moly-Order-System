import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/components/OrderForm";
import { OrderList } from "@/components/OrderList";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Home, ChefHat } from "lucide-react";
import type { Order } from "@/types/order";

const Orders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Client Orders</h1>
            </div>
            <nav className="flex gap-2">
              <Button variant="ghost" asChild>
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Recipes
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/ingredients">
                  <ChefHat className="mr-2 h-4 w-4" />
                  Ingredients
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <OrderForm onSubmit={handleCreateOrder} />
          <OrderList
            orders={orders}
            onUpdate={handleUpdateOrder}
            onDelete={handleDeleteOrder}
          />
        </div>
      </main>
    </div>
  );
};

export default Orders;
