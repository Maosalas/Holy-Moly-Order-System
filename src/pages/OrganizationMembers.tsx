import { useEffect, useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { organizationsApi } from "@/lib/api";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Trash2, Mail, RefreshCw } from "lucide-react";
import type { OrganizationMember, OrganizationRole } from "@/types/organization";

export default function OrganizationMembers() {
  const { 
    currentOrganization, 
    members, 
    isLoading,
    isInitializing,
    fetchOrganizationMembers,
    addMember,
    updateMemberRole,
    removeMember
  } = useOrganization();
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<OrganizationRole>("viewer");
  const [memberToDelete, setMemberToDelete] = useState<OrganizationMember | null>(null);
  const [emailStatuses, setEmailStatuses] = useState<Record<string, any>>({});
  const [resendingEmails, setResendingEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Only fetch members after initialization is complete and we have an organization
    if (!isInitializing && currentOrganization) {
      fetchOrganizationMembers(currentOrganization.id);
    }
  }, [currentOrganization, isInitializing]);

  useEffect(() => {
    // Fetch email statuses for all members
    if (members.length > 0 && currentOrganization) {
      members.forEach(async (member) => {
        const result = await organizationsApi.getMemberEmailStatus(currentOrganization.id, member.id);
        if (result.data) {
          setEmailStatuses(prev => ({
            ...prev,
            [member.id]: result.data
          }));
        }
      });
    }
  }, [members, currentOrganization]);

  const handleAddMember = async () => {
    if (!currentOrganization || !newMemberEmail || !newMemberName) return;

    try {
      const result = await addMember(currentOrganization.id, newMemberEmail, newMemberRole, newMemberName);
      if (result) {
        setIsAddDialogOpen(false);
        setNewMemberEmail("");
        setNewMemberName("");
        setNewMemberRole("viewer");
        // Refresh the members list
        fetchOrganizationMembers(currentOrganization.id);
      }
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: OrganizationRole) => {
    if (!currentOrganization) return;
    await updateMemberRole(currentOrganization.id, userId, newRole);
  };

  const handleRemoveMember = async () => {
    if (!currentOrganization || !memberToDelete) return;
    const success = await removeMember(currentOrganization.id, memberToDelete.userId);
    if (success) {
      setMemberToDelete(null);
    }
  };

  const handleResendWelcome = async (memberId: string) => {
    if (!currentOrganization) return;

    setResendingEmails(prev => new Set(prev).add(memberId));
    
    try {
      const result = await organizationsApi.resendWelcomeEmail(currentOrganization.id, memberId);
      
      if (result.data?.emailSent) {
        toast({
          title: "Email enviado",
          description: "El correo de bienvenida ha sido reenviado exitosamente",
        });
        
        // Refresh email status
        const statusResult = await organizationsApi.getMemberEmailStatus(currentOrganization.id, memberId);
        if (statusResult.data) {
          setEmailStatuses(prev => ({
            ...prev,
            [memberId]: statusResult.data
          }));
        }
      } else {
        throw new Error(result.data?.emailError || "Error al enviar email");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo reenviar el correo de bienvenida",
        variant: "destructive",
      });
    } finally {
      setResendingEmails(prev => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }
  };

  if (!currentOrganization) {
    return (
      <div className="container max-w-6xl py-6">
        <p className="text-muted-foreground">No hay organización seleccionada</p>
      </div>
    );
  }

  const canManage = ["owner", "admin"].includes(currentOrganization.userRole);

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/organization/settings")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gestión de Miembros</h1>
            <p className="text-muted-foreground">
              Administra quién tiene acceso a {currentOrganization.name}
            </p>
          </div>
        </div>
        
        {canManage && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar Miembro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Miembro</DialogTitle>
                <DialogDescription>
                  Invita a un nuevo miembro a tu organización
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Juan Pérez"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select 
                    value={newMemberRole} 
                    onValueChange={(value) => setNewMemberRole(value as OrganizationRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddMember} disabled={!newMemberEmail || !newMemberName}>
                  Agregar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Miembros Actuales</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "miembro" : "miembros"} en la organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado Email</TableHead>
                  <TableHead>Se unió</TableHead>
                  {canManage && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.user?.name || "N/A"}
                    </TableCell>
                    <TableCell>{member.user?.email || "N/A"}</TableCell>
                    <TableCell>
                      {canManage && member.role !== "owner" ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateRole(member.userId, value as OrganizationRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {emailStatuses[member.id]?.hasEmailLog ? (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              emailStatuses[member.id].emailLog?.status === 'sent' 
                                ? 'default' 
                                : emailStatuses[member.id].emailLog?.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {emailStatuses[member.id].emailLog?.status === 'sent' && <Mail className="h-3 w-3 mr-1" />}
                            {emailStatuses[member.id].emailLog?.status}
                          </Badge>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendWelcome(member.id)}
                              disabled={resendingEmails.has(member.id)}
                            >
                              <RefreshCw className={`h-3 w-3 ${resendingEmails.has(member.id) ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin registro</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        try {
                          const date = new Date(member.joinedAt);
                          if (isNaN(date.getTime())) {
                            return "N/A";
                          }
                          return date.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          });
                        } catch (error) {
                          console.error("Error formatting date:", error);
                          return "N/A";
                        }
                      })()}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {member.role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMemberToDelete(member)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará a {memberToDelete?.user?.name} de la organización.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
