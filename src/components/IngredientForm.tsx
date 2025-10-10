import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ingredient, IngredientFormData } from "@/types/ingredient";
import { toast } from "@/hooks/use-toast";

interface IngredientFormProps {
  ingredient?: Ingredient;
  onSubmit: (data: IngredientFormData) => void;
  onCancel: () => void;
}

export const IngredientForm = ({ ingredient, onSubmit, onCancel }: IngredientFormProps) => {
  const [name, setName] = useState(ingredient?.name || "");
  const [provider, setProvider] = useState(ingredient?.provider || "");
  const [qtyProvider, setQtyProvider] = useState(ingredient?.qtyProvider?.toString() || "");
  const [units, setUnits] = useState(ingredient?.units || "");
  const [cost, setCost] = useState(ingredient?.cost?.toString() || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!name.trim()) {
      toast({
        title: "Error de validación",
        description: "Nombre del ingrediente es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!provider.trim() || !qtyProvider || !units.trim() || !cost) {
      toast({
        title: "Error de validación",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        provider: provider.trim(),
        qtyProvider: parseFloat(qtyProvider),
        units: units.trim(),
        cost: parseFloat(cost),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">
          {ingredient ? "Editar ingrediente" : "Agregar nuevo ingrediente"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingrese el nombre del ingrediente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provedor *</Label>
            <Input
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="ingrese el nombre del proveedor"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qtyProvider">Cantidad*</Label>
              <Input
                id="qtyProvider"
                type="number"
                min="0"
                step="0.01"
                value={qtyProvider}
                onChange={(e) => setQtyProvider(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="units">Unidades *</Label>
              <Input
                id="units"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., kg, unidad, gr"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Costo *</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : (ingredient ? "Actualizar ingrediente" : "Crear ingrediente")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
