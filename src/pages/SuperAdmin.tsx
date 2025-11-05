import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { organizationsApi } from "@/lib/api";
import { OrganizationWithRole } from "@/types/organization";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Building2, Users, TrendingUp, Eye, Plus, Settings } from "lucide-react";
import CreateOrganizationDialog from "@/components/CreateOrganizationDialog";
import SubscriptionPlansManager from "@/components/SubscriptionPlansManager";

const SuperAdmin = () => {
  const [allOrganizations, setAllOrganizations] = useState<OrganizationWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const { switchOrganization } = useOrganization();

  useEffect(() => {
    loadAllOrganizations();
  }, []);

  const loadAllOrganizations = async () => {
    setIsLoading(true);
    const result = await organizationsApi.getAllForSuperAdmin();
    
    console.log("Fetched organizations:", result);

    if (result.error) {
      const errorMessage = typeof result.error === 'string' 
        ? result.error 
        : (result.error as any)?.message || 'Error al cargar organizaciones';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Transform snake_case to camelCase
    const organizations = (result.data as any[])?.map((org: any) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logo_url,
      subscriptionStatus: org.subscription_status,
      subscriptionPlan: org.subscription_plan,
      subscriptionStripeCustomerId: org.subscription_stripe_customer_id,
      subscriptionStripeSubscriptionId: org.subscription_stripe_subscription_id,
      trialEndsAt: org.trial_ends_at ? new Date(org.trial_ends_at) : undefined,
      settings: org.settings,
      createdAt: new Date(org.created_at),
      updatedAt: new Date(org.updated_at),
      userRole: org.user_role || 'viewer',
    })) || [];

    setAllOrganizations(organizations);
    setIsLoading(false);
  };

  const handleImpersonate = async (org: OrganizationWithRole) => {
    await switchOrganization(org);
    toast({
      title: "Impersonating Organization",
      description: `Switched to ${org.name}`,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      trial: "outline",
      active: "default",
      past_due: "destructive",
      canceled: "secondary",
      incomplete: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      free: "outline",
      starter: "secondary",
      professional: "default",
      enterprise: "default",
    };
    return <Badge variant={variants[plan] || "outline"}>{plan}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Super Admin Panel</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAllOrganizations} disabled={isLoading}>
            Actualizar
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Organización
          </Button>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allOrganizations.length}</div>
            <p className="text-xs text-muted-foreground">Registered organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allOrganizations.filter(org => org.subscriptionStatus === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Paid subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allOrganizations.filter(org => org.subscriptionStatus === 'trial').length}
            </div>
            <p className="text-xs text-muted-foreground">Organizations on trial</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Organizations and Plans */}
      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">
            <Building2 className="h-4 w-4 mr-2" />
            Organizaciones
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Settings className="h-4 w-4 mr-2" />
            Planes de Suscripción
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas las Organizaciones</CardTitle>
              <CardDescription>Ver y gestionar todas las organizaciones del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Cargando organizaciones...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allOrganizations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No se encontraron organizaciones
                        </TableCell>
                      </TableRow>
                    ) : (
                      allOrganizations.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                          <TableCell>{getPlanBadge(org.subscriptionPlan)}</TableCell>
                          <TableCell>{getStatusBadge(org.subscriptionStatus)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {org.createdAt.toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleImpersonate(org)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <SubscriptionPlansManager />
        </TabsContent>
      </Tabs>

      <CreateOrganizationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadAllOrganizations}
      />
    </div>
  );
};

export default SuperAdmin;
