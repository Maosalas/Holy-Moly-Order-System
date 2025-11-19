import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface DeleteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

const DeleteOrganizationDialog = ({
  open,
  onOpenChange,
  organizationName,
  onConfirm,
  isDeleting = false,
}: DeleteOrganizationDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [nameText, setNameText] = useState("");

  // Reset inputs when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setNameText("");
    }
  }, [open]);

  const isValid =
    confirmText.toLowerCase() === "eliminar" &&
    nameText === organizationName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Organización
          </DialogTitle>
          <DialogDescription>
            Esta acción es permanente y no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Se eliminarán todos los datos asociados a esta organización, incluyendo:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Todos los miembros y sus roles</li>
              <li>Recetas, ingredientes y suministros</li>
              <li>Pedidos y cotizaciones</li>
              <li>Gastos y configuraciones</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Para confirmar, escribe <span className="font-mono font-bold">eliminar</span>
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="eliminar"
              disabled={isDeleting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-name">
              Escribe el nombre de la organización: <span className="font-bold">{organizationName}</span>
            </Label>
            <Input
              id="org-name"
              value={nameText}
              onChange={(e) => setNameText(e.target.value)}
              placeholder={organizationName}
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!isValid || isDeleting}
          >
            {isDeleting ? "Eliminando..." : "Eliminar Organización"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteOrganizationDialog;
