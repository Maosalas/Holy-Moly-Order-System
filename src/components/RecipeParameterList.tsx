import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { RecipeParameter } from "@/types/recipe-parameter";
import { RecipeParameterForm } from "./RecipeParameterForm";
import {
  useRecipeParameters,
  useCreateRecipeParameter,
  useUpdateRecipeParameter,
  useDeleteRecipeParameter,
} from "@/hooks/use-recipe-parameters";
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

export function RecipeParameterList() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingParameter, setEditingParameter] = useState<RecipeParameter | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parameterToDelete, setParameterToDelete] = useState<string | null>(null);

  const { data: parameters = [], isLoading } = useRecipeParameters();
  const createMutation = useCreateRecipeParameter();
  const updateMutation = useUpdateRecipeParameter();
  const deleteMutation = useDeleteRecipeParameter();

  const handleCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: any) => {
    if (editingParameter) {
      updateMutation.mutate({ id: editingParameter.id, data });
    }
  };

  const handleDelete = (id: string) => {
    setParameterToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (parameterToDelete) {
      deleteMutation.mutate(parameterToDelete);
      setDeleteDialogOpen(false);
      setParameterToDelete(null);
    }
  };

  const openCreateForm = () => {
    setEditingParameter(undefined);
    setFormOpen(true);
  };

  const openEditForm = (parameter: RecipeParameter) => {
    setEditingParameter(parameter);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Cargando parámetros...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Parámetros Globales</CardTitle>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Parámetro
          </Button>
        </CardHeader>
        <CardContent>
          {parameters.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No hay parámetros globales definidos
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Los parámetros globales te permiten definir cantidades estándar para
                rellenos, cubiertas y otros elementos que se repiten en tus recetas.
              </p>
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Parámetro
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parameters.map((param) => (
                  <TableRow key={param.id}>
                    <TableCell className="font-mono font-medium">
                      {param.parameterKey}
                    </TableCell>
                    <TableCell>{param.value}</TableCell>
                    <TableCell>{param.unit}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {param.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(param)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(param.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecipeParameterForm
        parameter={editingParameter}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={editingParameter ? handleUpdate : handleCreate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar parámetro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El parámetro será eliminado
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
