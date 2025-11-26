import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { subscriptionFeaturesApi } from "@/lib/api";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface SubscriptionFeature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  valueType: 'boolean' | 'number' | 'string' | 'json';
  defaultValue: any;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Componente para gestionar los features disponibles en el sistema
 * Solo accesible para super admins
 */
export default function SubscriptionFeaturesManager() {
  const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<SubscriptionFeature | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    valueType: 'boolean' as 'boolean' | 'number' | 'string' | 'json',
    defaultValue: '',
    displayOrder: 0,
  });

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    setIsLoading(true);
    const result = await subscriptionFeaturesApi.getAll();

    if (result.error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los features",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setFeatures((result.data as SubscriptionFeature[]) || []);
    setIsLoading(false);
  };

  const handleOpenDialog = (feature?: SubscriptionFeature) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        key: feature.key,
        name: feature.name,
        description: feature.description || '',
        valueType: feature.valueType,
        defaultValue: JSON.stringify(feature.defaultValue),
        displayOrder: feature.displayOrder,
      });
    } else {
      setEditingFeature(null);
      setFormData({
        key: '',
        name: '',
        description: '',
        valueType: 'boolean',
        defaultValue: 'false',
        displayOrder: features.length + 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Parsear el valor por defecto según el tipo
    let parsedDefaultValue;
    try {
      if (formData.valueType === 'boolean') {
        parsedDefaultValue = formData.defaultValue === 'true';
      } else if (formData.valueType === 'number') {
        parsedDefaultValue = parseFloat(formData.defaultValue);
      } else if (formData.valueType === 'json') {
        parsedDefaultValue = JSON.parse(formData.defaultValue);
      } else {
        parsedDefaultValue = formData.defaultValue;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Valor por defecto inválido para el tipo seleccionado",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    const data = {
      key: formData.key,
      name: formData.name,
      description: formData.description || null,
      value_type: formData.valueType,
      default_value: parsedDefaultValue,
      display_order: formData.displayOrder,
    };

    let result;
    if (editingFeature) {
      // Actualizar
      result = await subscriptionFeaturesApi.update(editingFeature.id, data);
    } else {
      // Crear
      result = await subscriptionFeaturesApi.create(data);
    }

    if (result.error) {
      const errorMsg = typeof result.error === 'string'
        ? result.error
        : (result.error as any)?.message || "Error al guardar el feature";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    toast({
      title: "Éxito",
      description: editingFeature ? "Feature actualizado" : "Feature creado",
    });

    setIsDialogOpen(false);
    setIsSaving(false);
    loadFeatures();
  };

  const handleDelete = async (feature: SubscriptionFeature) => {
    if (!confirm(`¿Estás seguro de eliminar el feature "${feature.name}"?`)) {
      return;
    }

    const result = await subscriptionFeaturesApi.delete(feature.id);

    if (result.error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el feature",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Éxito",
      description: "Feature eliminado",
    });

    loadFeatures();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription Features</CardTitle>
            <CardDescription>
              Gestiona los features disponibles en el sistema
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Feature
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor por Defecto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay features configurados
                  </TableCell>
                </TableRow>
              ) : (
                features.map((feature) => (
                  <TableRow key={feature.id}>
                    <TableCell>{feature.displayOrder}</TableCell>
                    <TableCell className="font-medium">{feature.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {feature.key}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {feature.valueType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">
                        {JSON.stringify(feature.defaultValue)}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(feature)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(feature)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* Dialog para crear/editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingFeature ? 'Editar Feature' : 'Nuevo Feature'}
              </DialogTitle>
              <DialogDescription>
                {editingFeature
                  ? 'Modifica los detalles del feature'
                  : 'Define un nuevo feature para el sistema'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key">Key *</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="api_access"
                  disabled={!!editingFeature} // No se puede editar el key
                />
                <p className="text-xs text-muted-foreground">
                  Solo letras minúsculas, números y guiones bajos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="API Access"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Acceso a la API REST..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valueType">Tipo de Valor *</Label>
                <Select
                  value={formData.valueType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, valueType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultValue">Valor por Defecto *</Label>
                <Input
                  id="defaultValue"
                  value={formData.defaultValue}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultValue: e.target.value })
                  }
                  placeholder={
                    formData.valueType === 'boolean'
                      ? 'true o false'
                      : formData.valueType === 'number'
                      ? '0'
                      : formData.valueType === 'json'
                      ? '{}'
                      : 'texto'
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayOrder">Orden de Visualización</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, displayOrder: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
