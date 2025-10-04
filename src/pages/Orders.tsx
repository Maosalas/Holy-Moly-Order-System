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
        setOrders(Array.isArray(result.data) ? result.data : []);
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
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
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
        title: "Pedido Actualizado",
        description: `El pedido de ${orderData.clientName} ha sido actualizado.`,
      });
    } else {
      const result = await ordersApi.create(orderData);
      if (result.error) {
        toast({
          title: "Error",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        return;
      }
      const orderDataResponse = (result.data as any).order || result.data;
      const newOrder: Order = {
        ...orderData,
        id: orderDataResponse.id,
        createdAt: orderDataResponse.created_at || orderDataResponse.createdAt,
      };
      setOrders([newOrder, ...orders]);
      toast({
        title: "Pedido Creado",
        description: `El pedido de ${orderData.clientName} ha sido creado.`,
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
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setOrderToDelete(null);
        return;
      }
      setOrders(orders.filter((o) => o.id !== orderToDelete));
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      toast({
        title: "Pedido Eliminado",
        description: `El pedido de ${order?.clientName} ha sido eliminado.`,
      });
    }
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
            {user?.role === "cake_topper_provider" ? "Pedidos de Toppers" : "Pedidos de Clientes"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {user?.role === "cake_topper_provider" 
              ? "Pedidos que requieren toppers para pasteles" 
              : "Administra todos los pedidos de tus clientes"}
          </p>
        </div>
        {!isFormOpen && (
          <Button
            onClick={() => setIsFormOpen(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Nuevo Pedido
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
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Pedido"
        description={`¿Estás seguro de que deseas eliminar el pedido de "${orders.find((o) => o.id === orderToDelete)?.clientName || ""}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};

export default Orders;
