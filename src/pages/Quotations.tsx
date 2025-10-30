import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calculator } from "lucide-react";
import { QuotationForm } from "@/components/QuotationForm";
import { QuotationList } from "@/components/QuotationList";
import { useQuotations, useCreateQuotation, useUpdateQuotation, useDeleteQuotation } from "@/hooks/use-quotations";
import type { Quotation } from "@/types/quotation";

const Quotations = () => {
  // Usar React Query hooks
  const { data: quotations = [], isLoading } = useQuotations();
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  const deleteQuotation = useDeleteQuotation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | undefined>();

  const handleCreate = async (quotationData: any) => {
    try {
      await createQuotation.mutateAsync(quotationData);
      setIsFormOpen(false);
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
        />
      )}
    </div>
  );
};

export default Quotations;
