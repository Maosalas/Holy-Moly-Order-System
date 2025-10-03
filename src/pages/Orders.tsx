import { useState, useEffect } from "react";
import { OrderForm } from "@/components/OrderForm";
import { OrderList } from "@/components/OrderList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Order } from "@/types/order";
import { ordersApi } from "@/lib/api";

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const result = await ordersApi.getAll();
      if (result.data) {
        const ordersData = (result.data as any).orders || [];
        setOrders(ordersData.map((o: any) => ({
          ...o,
          createdAt: o.created_at,
          costAmount: o.cost_amount ?? 0,
          chargeAmount: o.charge_amount ?? 0,
          paymentMethod: o.payment_method ?? "cash",
          downPayment: o.down_payment ?? 0,
          selectedSupplies: o.selected_supplies ?? [],
          suppliesNeeded: o.supplies_needed ?? "",
          statuses: o.statuses ?? ["waiting-for-payment"],
        })));
      }
      setIsLoading(false);
    };
    fetchOrders();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const handleSubmit = async (orderData: Omit<Order, "id" | "createdAt">) => {
    if (editingOrder) {
      const result = await ordersApi.update(editingOrder.id, orderData);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
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
      const result = await ordersApi.create(orderData);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      const newOrder: Order = {
        ...orderData,
        id: (result.data as any).order.id,
        createdAt: (result.data as any).order.created_at,
      };
      setOrders([newOrder, ...orders]);
      toast({
        title: "Order Created",
        description: `${orderData.clientName} has been created.`,
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

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      const order = orders.find((o) => o.id === orderToDelete);
      const result = await ordersApi.delete(orderToDelete);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
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

  // Filter orders based on user role
  const visibleOrders = user?.role === "cake_topper_provider"
    ? orders.filter(order => order.needsCakeTopper)
    : orders;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            {user?.role === "cake_topper_provider" ? "Cake Topper Orders" : "Client Orders"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {user?.role === "cake_topper_provider" 
              ? "Orders requiring cake toppers" 
              : "Manage all your client orders"}
          </p>
        </div>
        {!isFormOpen && user?.role === "owner" && (
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
          orders={visibleOrders}
          onEdit={user?.role === "owner" ? handleEdit : undefined}
          onDelete={user?.role === "owner" ? handleDeleteClick : undefined}
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
