import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecipeParameter, RecipeParameterFormData } from "@/types/recipe-parameter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RecipeParameterFormProps {
  parameter?: RecipeParameter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RecipeParameterFormData) => void;
}

export function RecipeParameterForm({
  parameter,
  open,
  onOpenChange,
  onSubmit,
}: RecipeParameterFormProps) {
  const [parameterKey, setParameterKey] = useState(parameter?.parameterKey || "");
  const [value, setValue] = useState(parameter?.value.toString() || "");
  const [unit, setUnit] = useState(parameter?.unit || "gr");
  const [description, setDescription] = useState(parameter?.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      parameterKey: parameterKey.trim(),
      value: parseFloat(value),
      unit: unit.trim(),
      description: description.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {parameter ? "Editar Parámetro Global" : "Nuevo Parámetro Global"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parameterKey">Nombre del Parámetro *</Label>
            <Input
              id="parameterKey"
              value={parameterKey}
              onChange={(e) => setParameterKey(e.target.value)}
              placeholder="Ej: Relleno Cupcake, Crema de Mantequilla, Fondant"
              required
            />
            <p className="text-sm text-muted-foreground">
              Use un nombre descriptivo y único para identificar este parámetro
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidad *</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="gr, ml, unidades"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (Opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cantidad estándar de relleno para cupcakes"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {parameter ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
