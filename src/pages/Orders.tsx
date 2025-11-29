import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { OrderForm } from "@/components/OrderForm";
import { OrderList } from "@/components/OrderList";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ShoppingListDialog } from "@/components/ShoppingListDialog";
import { OrderLimitIndicator } from "@/components/OrderLimitIndicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ShoppingCart, Clock, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Order } from "@/types/order";
import { ordersApi, quotationsApi } from "@/lib/api";
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder, useOrder, useOrdersUsage } from "@/hooks/use-orders";
import type { Quotation } from "@/types/quotation";

const Orders = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Usar React Query hooks
  const { data: orders = [], isLoading } = useOrders();
  const { data: usage } = useOrdersUsage();
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
  const [quotationForOrder, setQuotationForOrder] = useState<Quotation | null>(null);

  // Detectar quotationId en la URL y cargar la cotización
  useEffect(() => {
    const quotationId = searchParams.get('quotationId');
    if (quotationId) {
      // Cargar la cotización y abrir el formulario
      const loadQuotation = async () => {
        try {
          const { data, error } = await quotationsApi.getById(quotationId);
          if (error) throw new Error(error);
          if (data) {
            setQuotationForOrder(data as Quotation);
            setIsFormOpen(true);
            // Limpiar el parámetro de la URL
            searchParams.delete('quotationId');
            setSearchParams(searchParams);
          }
        } catch (error) {
          console.error("Error loading quotation:", error);
          toast({
            title: "Error",
            description: "No se pudo cargar la cotización",
            variant: "destructive",
          });
        }
      };
      loadQuotation();
    }
  }, [searchParams, setSearchParams]);

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
      setQuotationForOrder(null);
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
    setQuotationForOrder(null);
  };

  // Filter orders based on user role
  const visibleOrders = user?.roles?.includes("cake_topper_provider")
    ? orders.filter(order => order.needsCakeTopper)
    : orders;

  // Filter orders by date (last month vs older)
  const oneMonthAgo = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  }, []);

  const recentOrders = useMemo(() => {
    return visibleOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= oneMonthAgo;
    });
  }, [visibleOrders, oneMonthAgo]);

  const oldOrders = useMemo(() => {
    return visibleOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate < oneMonthAgo;
    });
  }, [visibleOrders, oneMonthAgo]);

  const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">
              {user?.roles?.includes("cake_topper_provider") ? "Pedidos de Toppers" : "Pedidos de Clientes"}
            </h2>
            <OrderLimitIndicator variant="badge" />
          </div>
          <p className="text-muted-foreground mt-1">
            {user?.roles?.includes("cake_topper_provider")
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
              disabled={usage && !usage.canCreate}
            >
              <Plus className="h-5 w-5" />
              Nuevo Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Mostrar alerta de límite de órdenes */}
      {!user?.roles?.includes("cake_topper_provider") && (
        <OrderLimitIndicator variant="alert" showUpgradeButton />
      )}

      {isFormOpen ? (
        <OrderForm
          initialData={editingOrder}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          quotation={quotationForOrder || undefined}
        />
      ) : (
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="h-4 w-4" />
              Recientes ({recentOrders.length})
            </TabsTrigger>
            <TabsTrigger value="old" className="gap-2">
              <History className="h-4 w-4" />
              Antiguos ({oldOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-6">
            <OrderList
              orders={recentOrders}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              isDeleting={deleteOrder.isPending || isFetchingOrder}
              selectedOrderIds={selectedOrderIds}
              onSelectionChange={setSelectedOrderIds}
            />
          </TabsContent>

          <TabsContent value="old" className="mt-6">
            <OrderList
              orders={oldOrders}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              isDeleting={deleteOrder.isPending || isFetchingOrder}
              selectedOrderIds={selectedOrderIds}
              onSelectionChange={setSelectedOrderIds}
            />
          </TabsContent>
        </Tabs>
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
