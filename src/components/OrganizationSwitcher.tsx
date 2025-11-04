import { Check, ChevronsUpDown, Building2, Plus, Settings } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function OrganizationSwitcher() {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { organizations, currentOrganization, switchOrganization, createOrganization } = useOrganization();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.roles?.includes("super_admin");

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) return;

    setIsCreating(true);
    const newOrg = await createOrganization(newOrgName.trim(), newOrgSlug.trim());
    setIsCreating(false);

    if (newOrg) {
      setCreateDialogOpen(false);
      setNewOrgName("");
      setNewOrgSlug("");
      switchOrganization(newOrg);
    }
  };

  const handleNameChange = (name: string) => {
    setNewOrgName(name);
    // Auto-generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setNewOrgSlug(slug);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between bg-card"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {currentOrganization?.name || "Seleccionar organización"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-popover z-50">
        <Command>
          <CommandInput placeholder="Buscar organización..." />
          <CommandList>
            <CommandEmpty>No se encontraron organizaciones.</CommandEmpty>
            <CommandGroup heading="Organizaciones">
              {organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  onSelect={() => {
                    switchOrganization(org);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentOrganization?.id === org.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{org.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {org.userRole}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  navigate("/organization/settings");
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </CommandItem>
              {isSuperAdmin && (
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setCreateDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Nueva organización</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Organización</DialogTitle>
            <DialogDescription>
              Ingresa los detalles de tu nueva organización.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nombre de la Organización</Label>
              <Input
                id="org-name"
                placeholder="Mi Empresa"
                value={newOrgName}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug (URL amigable)</Label>
              <Input
                id="org-slug"
                placeholder="mi-empresa"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                Solo letras minúsculas, números y guiones
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={!newOrgName.trim() || !newOrgSlug.trim() || isCreating}
            >
              {isCreating ? "Creando..." : "Crear Organización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Popover>
  );
}
