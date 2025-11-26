import { useState, useEffect } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecipes } from "@/hooks/use-recipes";

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
  const { data: recipes = [] } = useRecipes();

  // Separar el nombre del parámetro del nombre de la receta si estamos editando
  const getParameterParts = (fullKey: string) => {
    if (!fullKey) return { name: "", recipeName: "" };

    // Buscar si el parámetro termina con algún nombre de receta
    const recipe = recipes.find(r => fullKey.endsWith(r.name));
    if (recipe) {
      const name = fullKey.replace(recipe.name, "").trim();
      return { name, recipeName: recipe.name };
    }
    return { name: fullKey, recipeName: "" };
  };

  const parts = parameter ? getParameterParts(parameter.parameterKey) : { name: "", recipeName: "" };

  const [parameterName, setParameterName] = useState(parts.name);
  const [selectedRecipeName, setSelectedRecipeName] = useState(parts.recipeName);
  const [value, setValue] = useState(parameter?.value.toString() || "");
  const [unit, setUnit] = useState(parameter?.unit || "gr");
  const [description, setDescription] = useState(parameter?.description || "");
  const [recipePopoverOpen, setRecipePopoverOpen] = useState(false);

  // Actualizar cuando cambie el parámetro
  useEffect(() => {
    if (parameter) {
      const parts = getParameterParts(parameter.parameterKey);
      setParameterName(parts.name);
      setSelectedRecipeName(parts.recipeName);
      setValue(parameter.value.toString());
      setUnit(parameter.unit);
      setDescription(parameter.description || "");
    } else {
      setParameterName("");
      setSelectedRecipeName("");
      setValue("");
      setUnit("gr");
      setDescription("");
    }
  }, [parameter, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construir el parameterKey completo con el nombre de la receta
    const fullParameterKey = selectedRecipeName
      ? `${parameterName.trim()} ${selectedRecipeName}`.trim()
      : parameterName.trim();

    onSubmit({
      parameterKey: fullParameterKey,
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
            <Label>Receta Asociada *</Label>
            <Popover open={recipePopoverOpen} onOpenChange={setRecipePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={recipePopoverOpen}
                  className="w-full justify-between"
                >
                  {selectedRecipeName || "Selecciona una receta"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar receta..." />
                  <CommandList>
                    <CommandEmpty>No se encontró ninguna receta.</CommandEmpty>
                    <CommandGroup>
                      {recipes.map((recipe: any) => (
                        <CommandItem
                          key={recipe.id}
                          value={recipe.name}
                          onSelect={() => {
                            setSelectedRecipeName(recipe.name);
                            setRecipePopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedRecipeName === recipe.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {recipe.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              El nombre de la receta se agregará automáticamente al parámetro
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parameterName">Nombre del Parámetro *</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="parameterName"
                value={parameterName}
                onChange={(e) => setParameterName(e.target.value)}
                placeholder="Ej: Relleno Mini, Cubierta Grande"
                className="flex-1"
                required
              />
              {selectedRecipeName && (
                <span className="text-sm text-muted-foreground whitespace-nowrap font-medium px-3 py-2 bg-muted rounded-md">
                  {selectedRecipeName}
                </span>
              )}
            </div>
            {parameterName && selectedRecipeName && (
              <p className="text-xs text-muted-foreground">
                Nombre completo: <span className="font-medium">{parameterName} {selectedRecipeName}</span>
              </p>
            )}
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
