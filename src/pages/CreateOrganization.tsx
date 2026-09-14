import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { organizationsApi } from "@/lib/api";
import { SearchSelect } from "@/components/ui/search-select";

interface Member {
  email: string;
  name: string;
  role: "admin" | "staff" | "viewer";
}

const CreateOrganization = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { createOrganization, organizations, isInitializing } = useOrganization();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "staff" | "viewer">("staff");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    // Si ya tiene organización, ir directo al dashboard
    if (!isInitializing && organizations.length > 0) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, isInitializing, organizations]);


  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    const generatedSlug = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setSlug(generatedSlug);
  };

  const addMember = () => {
    if (!newMemberEmail || !newMemberEmail.includes("@")) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido",
        variant: "destructive",
      });
      return;
    }

    if (!newMemberName || newMemberName.trim().length === 0) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa el nombre del miembro",
        variant: "destructive",
      });
      return;
    }

    if (members.some((m) => m.email === newMemberEmail)) {
      toast({
        title: "Email duplicado",
        description: "Este email ya fue agregado",
        variant: "destructive",
      });
      return;
    }

    setMembers([...members, { email: newMemberEmail, name: newMemberName, role: newMemberRole }]);
    setNewMemberEmail("");
    setNewMemberName("");
    setNewMemberRole("staff");
  };

  const removeMember = (email: string) => {
    setMembers(members.filter((m) => m.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el nombre y slug de la organización",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create organization
      const org = await createOrganization(name, slug);
      
      if (!org) {
        throw new Error("Error creating organization");
      }

      // Add members if any
      if (members.length > 0) {
        for (const member of members) {
          await organizationsApi.addMemberByEmail(org.id, member.email, member.role, member.name);
        }
      }

      // Check for pending subscription from localStorage
      const pendingSubscription = localStorage.getItem('pendingSubscription');
      if (pendingSubscription) {
        // Subscription will be handled by the backend after Stripe webhook
        localStorage.removeItem('pendingSubscription');
      }

      toast({
        title: "¡Organización creada!",
        description: `${name} ha sido creada exitosamente. Ahora completa tu suscripción.`,
      });

      // Get selected plan from localStorage and redirect to checkout
      const selectedPlan = localStorage.getItem('selected_plan_slug') || 'starter';
      navigate(`/checkout?plan=${selectedPlan}&orgId=${org.id}`);
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la organización",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 flex items-center justify-center">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Crea tu organización</CardTitle>
          <CardDescription>
            Configura tu espacio de trabajo y agrega miembros de tu equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Organización *</Label>
                <Input
                  id="name"
                  placeholder="Mi Panadería"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input
                  id="slug"
                  placeholder="mi-panaderia"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  pattern="[a-z0-9-]+"
                />
                <p className="text-xs text-muted-foreground">
                  Solo minúsculas, números y guiones. Se usará en la URL.
                </p>
              </div>
            </div>

            {/* Add Members Section */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base">Agregar Miembros (Opcional)</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Invita a tu equipo a colaborar
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Nombre completo"
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="email@ejemplo.com"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMember())}
                    className="flex-1"
                  />
                  <SearchSelect
                    aria-label="Rol del miembro"
                    value={newMemberRole}
                    onChange={(event) => setNewMemberRole(event.target.value as Member["role"])}
                    className="h-10 w-32 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </SearchSelect>
                  <Button type="button" onClick={addMember} size="icon" variant="secondary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {members.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Miembros agregados ({members.length})</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {members.map((member) => (
                      <div
                        key={member.email}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-background px-2 py-1 rounded">{member.role}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(member.email)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando organización...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Crear Organización
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateOrganization;
