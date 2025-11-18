import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, ShoppingCart } from "lucide-react";
import { QuotationForm } from "@/components/QuotationForm";
import { QuotationList } from "@/components/QuotationList";
import { useQuotations, useCreateQuotation, useUpdateQuotation, useDeleteQuotation } from "@/hooks/use-quotations";
import type { Quotation } from "@/types/quotation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Quotations = () => {
  const navigate = useNavigate();

  // Usar React Query hooks
  const { data: quotations = [], isLoading } = useQuotations();
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  const deleteQuotation = useDeleteQuotation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | undefined>();
  const [showGenerateOrderDialog, setShowGenerateOrderDialog] = useState(false);
  const [createdQuotation, setCreatedQuotation] = useState<Quotation | null>(null);

  const handleCreate = async (quotationData: any) => {
    try {
      const result = await createQuotation.mutateAsync(quotationData);
      setIsFormOpen(false);

      // Mostrar diálogo para preguntar si desea generar un pedido
      setCreatedQuotation(result as Quotation);
      setShowGenerateOrderDialog(true);
    } catch (error) {
      // Los errores ya son manejados por los hooks
      console.error("Error creating quotation:", error);
    }
  };

  const handleUpdate = async (id: string, quotationData: any) => {
    try {
      await updateQuotation.mutateAsync({ id, quotation: quotationData });
      setEditingQuotation(undefined);
      setIsFormOpen(false);
    } catch (error) {
      // Los errores ya son manejados por los hooks
      console.error("Error updating quotation:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuotation.mutateAsync(id);
    } catch (error) {
      // Los errores ya son manejados por los hooks
      console.error("Error deleting quotation:", error);
    }
  };

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingQuotation(undefined);
  };

  const handleGenerateOrder = (quotation: Quotation) => {
    // Navegar a la página de pedidos con el quotationId
    navigate(`/orders?quotationId=${quotation.id}`);
  };

  const handleConfirmGenerateOrder = () => {
    if (createdQuotation) {
      handleGenerateOrder(createdQuotation);
      setShowGenerateOrderDialog(false);
      setCreatedQuotation(null);
    }
  };

  const handleCancelGenerateOrder = () => {
    setShowGenerateOrderDialog(false);
    setCreatedQuotation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Cotizador
          </h2>
          <p className="text-muted-foreground mt-1">
            Calcula el costo de productos basado en recetas y tamaños
          </p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Cotización
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <QuotationForm
          quotation={editingQuotation}
          onSubmit={editingQuotation 
            ? (data) => handleUpdate(editingQuotation.id, data)
            : handleCreate
          }
          onCancel={handleCloseForm}
        />
      ) : (
        <QuotationList
          quotations={quotations}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onGenerateOrder={handleGenerateOrder}
        />
      )}

      {/* Diálogo para confirmar generación de pedido */}
      <AlertDialog open={showGenerateOrderDialog} onOpenChange={setShowGenerateOrderDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              ¿Generar pedido?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La cotización ha sido creada exitosamente. ¿Deseas generar un pedido basado en esta cotización?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelGenerateOrder}>
              No, gracias
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGenerateOrder} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Sí, generar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Quotations;
