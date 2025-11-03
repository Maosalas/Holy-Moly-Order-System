import { useState } from "react";
import { OrderForm } from "@/components/OrderForm";
import { OrderList } from "@/components/OrderList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ShoppingListDialog } from "@/components/ShoppingListDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingCart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Order } from "@/types/order";
import { ordersApi } from "@/lib/api";
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder, useOrder } from "@/hooks/use-orders";

const Orders = () => {
  const { user } = useAuth();

  // Usar React Query hooks
  const { data: orders = [], isLoading } = useOrders();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isFetchingOrder, setIsFetchingOrder] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);

  const handleSubmit = async (orderData: Omit<Order, "id" | "createdAt">) => {
    // Transform orderData for API - replace paymentMethod object with paymentMethodId
    const apiPayload = {
      ...orderData,
      paymentMethodId: orderData.paymentMethod.id,
      paymentMethod: undefined, // Remove the full object
    };
    // Remove undefined properties
    const { paymentMethod, ...cleanPayload } = apiPayload;

    try {
      if (editingOrder) {
        await updateOrder.mutateAsync({ id: editingOrder.id, order: cleanPayload });
      } else {
        await createOrder.mutateAsync(cleanPayload);
      }
      setIsFormOpen(false);
      setEditingOrder(undefined);
    } catch (error) {
      // Los errores ya son manejados por los hooks
      console.error("Error submitting order:", error);
    }
  };

  const handleEdit = async (order: Order) => {
    console.log("Editing order:", order);
    setIsFetchingOrder(true);
    try {
      // Fetch the full order data including client photos
      const result = await ordersApi.getById(order.id);
      if (result.data) {
        setEditingOrder(result.data as Order);
      } else {
        // Fallback to the order from the list if fetch fails
        setEditingOrder(order);
        if (result.error) {
          toast({
            title: "Warning",
            description: "Could not load full order data. You can still edit other fields.",
            variant: "default",
          });
        }
      }
      setIsFormOpen(true);
    } finally {
      setIsFetchingOrder(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setOrderToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      const order = orders.find((o) => o.id === orderToDelete);

      try {
        // Download calendar cancellation event
        if (order) {
          const { downloadICS } = await import("@/lib/utils");
          downloadICS(order, 'delete');
        }

        await deleteOrder.mutateAsync(orderToDelete);
        setDeleteDialogOpen(false);
        setOrderToDelete(null);
      } catch (error) {
        // Los errores ya son manejados por los hooks
        console.error("Error deleting order:", error);
        setDeleteDialogOpen(false);
        setOrderToDelete(null);
      }
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

  const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.id));

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
        <div className="flex items-center gap-3">
          {selectedOrderIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedOrderIds.length} seleccionado{selectedOrderIds.length !== 1 ? 's' : ''}
              </Badge>
              <Button
                onClick={() => setShoppingListOpen(true)}
                variant="default"
                size="lg"
                className="gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                Generar Lista de Compras
              </Button>
            </div>
          )}
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
          isDeleting={deleteOrder.isPending || isFetchingOrder}
          selectedOrderIds={selectedOrderIds}
          onSelectionChange={setSelectedOrderIds}
        />
      )}

      <ShoppingListDialog
        open={shoppingListOpen}
        onOpenChange={setShoppingListOpen}
        selectedOrders={selectedOrders}
      />

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
