import { useState, useEffect } from "react";
import { OrderForm } from "@/components/OrderForm";
import { OrderList } from "@/components/OrderList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Order } from "@/types/order";

const ORDERS_STORAGE_KEY = "holy-moly-orders";

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>(() => {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!stored) return [];
    
    const parsedOrders = JSON.parse(stored);
    // Migrate old orders to new schema
    return parsedOrders.map((order: any) => ({
      ...order,
      costAmount: order.costAmount ?? 0,
      chargeAmount: order.chargeAmount ?? order.totalAmount ?? 0,
      paymentMethod: order.paymentMethod ?? "cash",
      downPayment: order.downPayment ?? 0,
      suppliesNeeded: order.suppliesNeeded ?? "",
      statuses: order.statuses ?? (order.status ? [order.status] : ["waiting-for-payment"]),
    }));
  });

  useEffect(() => {
    // Migrate orders in localStorage
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (stored) {
      const parsedOrders = JSON.parse(stored);
      const migratedOrders = parsedOrders.map((order: any) => ({
        ...order,
        costAmount: order.costAmount ?? 0,
        chargeAmount: order.chargeAmount ?? order.totalAmount ?? 0,
        paymentMethod: order.paymentMethod ?? "cash",
        downPayment: order.downPayment ?? 0,
        suppliesNeeded: order.suppliesNeeded ?? "",
        statuses: order.statuses ?? (order.status ? [order.status] : ["waiting-for-payment"]),
      }));
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(migratedOrders));
    }
    
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const handleSubmit = (orderData: Omit<Order, "id" | "createdAt">) => {
    if (editingOrder) {
      setOrders(
        orders.map((o) =>
          o.id === editingOrder.id
            ? { ...orderData, id: o.id, createdAt: o.createdAt }
            : o
        )
      );
      toast({
        title: "Order Updated",
        description: `Order for ${orderData.clientName} has been updated.`,
      });
    } else {
      const newOrder: Order = {
        ...orderData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setOrders([newOrder, ...orders]);
      toast({
        title: "Order Created",
        description: `Order for ${orderData.clientName} has been created.`,
      });
    }
    setIsFormOpen(false);
    setEditingOrder(undefined);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setOrderToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (orderToDelete) {
      const order = orders.find((o) => o.id === orderToDelete);
      setOrders(orders.filter((o) => o.id !== orderToDelete));
      toast({
        title: "Order Deleted",
        description: `Order for ${order?.clientName} has been removed.`,
      });
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingOrder(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Client Orders</h2>
          <p className="text-muted-foreground mt-1">Manage all your client orders</p>
        </div>
        {!isFormOpen && (
          <Button
            onClick={() => setIsFormOpen(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            New Order
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <OrderForm
          initialData={editingOrder}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <OrderList
          orders={orders}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Order"
        description={`Are you sure you want to delete the order for "${orders.find((o) => o.id === orderToDelete)?.clientName || ""}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Orders;
