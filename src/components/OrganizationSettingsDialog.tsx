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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { superAdminApi, subscriptionPlansApi, organizationsApi } from "@/lib/api";
import { OrganizationWithRole, SubscriptionPlan, OrganizationMember } from "@/types/organization";
import { Loader2, Mail, Key, CreditCard } from "lucide-react";

interface OrganizationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: OrganizationWithRole | null;
  onSuccess?: () => void;
}

interface SubscriptionPlanOption {
  id: string;
  name: string;
  code: SubscriptionPlan;
  price: number;
  features: any[];
}

const OrganizationSettingsDialog = ({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: OrganizationSettingsDialogProps) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | "">("");
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanOption[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [selectedMemberForEmail, setSelectedMemberForEmail] = useState<string>("");
  const [selectedMemberForPassword, setSelectedMemberForPassword] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && organization) {
      setSelectedPlan(organization.subscriptionPlan);
      setSelectedMemberForEmail("");
      setSelectedMemberForPassword("");
      loadSubscriptionPlans();
      loadMembers();
    }
  }, [open, organization]);

  const loadSubscriptionPlans = async () => {
    setIsLoadingPlans(true);
    const result = await subscriptionPlansApi.getAll(false); // Get all plans including inactive

    if (result.error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los planes de suscripción",
        variant: "destructive",
      });
      setIsLoadingPlans(false);
      return;
    }

    console.log("Subscription plans loaded:", result.data);
    setSubscriptionPlans(result.data || []);
    setIsLoadingPlans(false);
  };

  const loadMembers = async () => {
    if (!organization) return;

    setIsLoadingMembers(true);
    const result = await organizationsApi.getMembers(organization.id);

    if (result.error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los miembros",
        variant: "destructive",
      });
      setIsLoadingMembers(false);
      return;
    }

    setMembers(result.data || []);
    setIsLoadingMembers(false);
  };

  const handleUpdatePlan = async () => {
    if (!organization || !selectedPlan) return;

    setIsUpdatingPlan(true);
    const result = await superAdminApi.updateOrganizationSubscription(organization.id, {
      subscriptionPlan: selectedPlan,
    });

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      setIsUpdatingPlan(false);
      return;
    }

    toast({
      title: "Plan Actualizado",
      description: `El plan de ${organization.name} ha sido actualizado a ${selectedPlan}`,
    });

    setIsUpdatingPlan(false);
    onSuccess?.();
  };

  const handleResendConfirmationEmail = async () => {
    if (!organization || !selectedMemberForEmail) {
      toast({
        title: "Error",
        description: "Por favor selecciona un destinatario",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    const result = await superAdminApi.resendConfirmationEmail(organization.id, selectedMemberForEmail);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      setIsSendingEmail(false);
      return;
    }

    const selectedMember = members.find(m => m.userId === selectedMemberForEmail);
    const recipientName = selectedMember?.user?.name || selectedMember?.user?.email || "el usuario seleccionado";

    toast({
      title: "Correo Enviado",
      description: `Se ha enviado el correo de confirmación a ${recipientName}`,
    });

    setIsSendingEmail(false);
  };

  const handleSendPasswordReset = async () => {
    if (!organization || !selectedMemberForPassword) {
      toast({
        title: "Error",
        description: "Por favor selecciona un destinatario",
        variant: "destructive",
      });
      return;
    }

    setIsSendingPasswordReset(true);

    const result = await superAdminApi.sendPasswordResetEmail(organization.id, selectedMemberForPassword);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      setIsSendingPasswordReset(false);
      return;
    }

    const selectedMember = members.find(m => m.userId === selectedMemberForPassword);
    const recipientName = selectedMember?.user?.name || selectedMember?.user?.email || "el usuario seleccionado";

    toast({
      title: "Correo Enviado",
      description: `Se ha enviado el correo de cambio de contraseña a ${recipientName}`,
    });

    setIsSendingPasswordReset(false);
  };

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajustes de Organización</DialogTitle>
          <DialogDescription>
            Gestionar configuración para {organization.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan de Suscripción */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="plan" className="text-base font-semibold">
                Plan de Suscripción
              </Label>
            </div>
            <div className="space-y-2">
              <Select
                value={selectedPlan}
                onValueChange={(value) => setSelectedPlan(value as SubscriptionPlan)}
                disabled={isLoadingPlans}
              >
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingPlans ? (
                    <SelectItem value="loading" disabled>
                      Cargando planes...
                    </SelectItem>
                  ) : subscriptionPlans.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No hay planes disponibles
                    </SelectItem>
                  ) : (
                    subscriptionPlans.map((plan) => {
                      const price = plan.price || 0;
                      const displayPrice = typeof price === 'number'
                        ? price.toFixed(2)
                        : price;

                      return (
                        <SelectItem key={plan.id} value={plan.code}>
                          {plan.name} - ${displayPrice}/mes
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleUpdatePlan}
                disabled={
                  isUpdatingPlan ||
                  !selectedPlan ||
                  selectedPlan === organization.subscriptionPlan
                }
                className="w-full"
              >
                {isUpdatingPlan ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Plan"
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Correos Electrónicos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">
                Correos Electrónicos
              </Label>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email-recipient" className="text-sm">
                  Destinatario
                </Label>
                <Select
                  value={selectedMemberForEmail}
                  onValueChange={setSelectedMemberForEmail}
                  disabled={isLoadingMembers}
                >
                  <SelectTrigger id="email-recipient">
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingMembers ? (
                      <SelectItem value="loading" disabled>
                        Cargando miembros...
                      </SelectItem>
                    ) : members.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No hay miembros
                      </SelectItem>
                    ) : (
                      members.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.user?.name || member.user?.email} ({member.role})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleResendConfirmationEmail}
                disabled={isSendingEmail || !selectedMemberForEmail}
                variant="outline"
                className="w-full justify-start"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Reenviar Correo de Confirmación
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Seguridad */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">
                Seguridad
              </Label>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="password-recipient" className="text-sm">
                  Destinatario
                </Label>
                <Select
                  value={selectedMemberForPassword}
                  onValueChange={setSelectedMemberForPassword}
                  disabled={isLoadingMembers}
                >
                  <SelectTrigger id="password-recipient">
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingMembers ? (
                      <SelectItem value="loading" disabled>
                        Cargando miembros...
                      </SelectItem>
                    ) : members.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No hay miembros
                      </SelectItem>
                    ) : (
                      members.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.user?.name || member.user?.email} ({member.role})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSendPasswordReset}
                disabled={isSendingPasswordReset || !selectedMemberForPassword}
                variant="outline"
                className="w-full justify-start"
              >
                {isSendingPasswordReset ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Enviar Correo de Cambio de Contraseña
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizationSettingsDialog;
