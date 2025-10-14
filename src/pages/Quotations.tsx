import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calculator } from "lucide-react";
import { QuotationForm } from "@/components/QuotationForm";
import { QuotationList } from "@/components/QuotationList";
import { quotationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Quotation } from "@/types/quotation";

const Quotations = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | undefined>();
  const { toast } = useToast();

  const loadQuotations = async () => {
    const { data, error } = await quotationsApi.getAll();
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las cotizaciones",
        variant: "destructive",
      });
      setQuotations([]);
    } else {
      setQuotations((data as Quotation[]) || []);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const handleCreate = async (quotationData: any) => {
    const { error } = await quotationsApi.create(quotationData);
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la cotización",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Cotización creada correctamente",
      });
      setIsFormOpen(false);
      loadQuotations();
    }
  };

  const handleUpdate = async (id: string, quotationData: any) => {
    const { error } = await quotationsApi.update(id, quotationData);
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la cotización",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Cotización actualizada correctamente",
      });
      setEditingQuotation(undefined);
      setIsFormOpen(false);
      loadQuotations();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await quotationsApi.delete(id);
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la cotización",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Cotización eliminada correctamente",
      });
      loadQuotations();
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
