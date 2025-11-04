import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, Users, CreditCard, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { organizationsApi } from "@/lib/api";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";

const steps = [
  { id: 1, name: "Organización", icon: Building2 },
  { id: 2, name: "Miembros", icon: Users },
  { id: 3, name: "Plan de Suscripción", icon: CreditCard },
];

const orgSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(255),
  slug: z.string().min(1, "Slug requerido").max(255).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
});

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [orgData, setOrgData] = useState({ name: "", slug: "" });
  const [members, setMembers] = useState<{ email: string; role: string }[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("staff");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const { plans } = useSubscriptionPlans(true);

  const form = useForm({
    resolver: zodResolver(orgSchema),
    defaultValues: orgData,
  });

  const handleNext = () => {
    if (currentStep === 1) {
      form.handleSubmit((data) => {
        setOrgData(data);
        setCurrentStep(2);
      })();
    } else if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
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

    if (members.some((m) => m.email === newMemberEmail)) {
      toast({
        title: "Email duplicado",
        description: "Este email ya fue agregado",
        variant: "destructive",
      });
      return;
    }

    setMembers([...members, { email: newMemberEmail, role: newMemberRole }]);
    setNewMemberEmail("");
    setNewMemberRole("staff");
  };

  const removeMember = (email: string) => {
    setMembers(members.filter((m) => m.email !== email));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1. Create organization
      const orgResult = await organizationsApi.create({
        name: orgData.name,
        slug: orgData.slug,
      });

      if (orgResult.error || !orgResult.data) {
        throw new Error(orgResult.error || "Error creando organización");
      }

      const orgId = (orgResult.data as any).id;

      // 2. Update subscription plan if not free (store in settings for now)
      if (selectedPlan !== "free") {
        await organizationsApi.update(orgId, {
          settings: { subscription_plan: selectedPlan },
        });
      }

      // 3. Add members
      for (const member of members) {
        await organizationsApi.addMemberByEmail(orgId, member.email, member.role);
      }

      toast({
        title: "Organización creada",
        description: `${orgData.name} fue creada exitosamente`,
      });

      // Reset form
      setCurrentStep(1);
      setOrgData({ name: "", slug: "" });
      setMembers([]);
      setSelectedPlan("free");
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear la organización",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Organización *</Label>
              <Input
                id="name"
                placeholder="Mi Panadería"
                {...form.register("name")}
                onChange={(e) => {
                  form.register("name").onChange(e);
                  // Auto-generate slug
                  const slug = e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "");
                  form.setValue("slug", slug);
                }}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                placeholder="mi-panaderia"
                {...form.register("slug")}
              />
              <p className="text-xs text-muted-foreground">
                Solo minúsculas, números y guiones. Se usará en la URL.
              </p>
              {form.formState.errors.slug && (
                <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agregar Miembros (Opcional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="email@ejemplo.com"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMember())}
                />
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addMember} size="sm">
                  Agregar
                </Button>
              </div>
            </div>

            {members.length > 0 && (
              <div className="space-y-2">
                <Label>Miembros agregados ({members.length})</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {members.map((member) => (
                    <Card key={member.email}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{member.email}</span>
                          <Badge variant="outline">{member.role}</Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(member.email)}
                        >
                          Eliminar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Nota: El primer usuario que haga login será el owner automáticamente si no se agregan miembros aquí.
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Label>Seleccionar Plan de Suscripción</Label>
            <div className="grid gap-4">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlan === plan.slug
                      ? "ring-2 ring-primary shadow-md"
                      : "hover:shadow-sm"
                  }`}
                  onClick={() => setSelectedPlan(plan.slug)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{plan.name}</h3>
                          {selectedPlan === plan.slug && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <p className="text-2xl font-bold">
                          ${plan.priceMonthly.toFixed(2)}
                          <span className="text-sm text-muted-foreground font-normal">/mes</span>
                        </p>
                      </div>
                      <Badge variant={plan.active ? "default" : "secondary"}>
                        {plan.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                      <p>
                        • {plan.maxOrdersPerMonth === -1
                          ? "Órdenes ilimitadas"
                          : `${plan.maxOrdersPerMonth} órdenes/mes`}
                      </p>
                      <p>
                        • {plan.maxUsers === -1
                          ? "Usuarios ilimitados"
                          : `${plan.maxUsers} usuarios`}
                      </p>
                      <p>• {plan.maxStorageGb} GB de almacenamiento</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Organización</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep > step.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    currentStep === step.id ? "font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">{renderStep()}</div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            Atrás
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={handleNext}>
                Siguiente
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear Organización"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
