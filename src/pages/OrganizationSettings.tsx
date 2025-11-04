import { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Users } from "lucide-react";

export default function OrganizationSettings() {
  const { currentOrganization, updateOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const [name, setName] = useState(currentOrganization?.name || "");
  const [logoUrl, setLogoUrl] = useState(currentOrganization?.logoUrl || "");

  const handleSave = async () => {
    if (!currentOrganization) return;
    
    const success = await updateOrganization(currentOrganization.id, {
      name,
      logoUrl,
    });

    if (success) {
      // Success toast is already shown in context
    }
  };

  if (!currentOrganization) {
    return (
      <div className="container max-w-4xl py-6">
        <p className="text-muted-foreground">No hay organización seleccionada</p>
      </div>
    );
  }

  const canManage = ["owner", "admin"].includes(currentOrganization.userRole);

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Configuración de Organización</h1>
          <p className="text-muted-foreground">
            Administra los detalles de tu organización
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">
            <Building2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Miembros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Información básica sobre tu organización
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManage}
                  placeholder="Nombre de la organización"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={currentOrganization.slug}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  El slug no se puede modificar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">URL del Logo</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  disabled={!canManage}
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>

              {canManage && (
                <Button onClick={handleSave} disabled={isLoading}>
                  Guardar Cambios
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suscripción</CardTitle>
              <CardDescription>
                Detalles de tu plan de suscripción
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Plan:</span>
                <Badge variant="secondary" className="capitalize">
                  {currentOrganization.subscriptionPlan}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado:</span>
                <Badge 
                  variant={
                    currentOrganization.subscriptionStatus === "active" 
                      ? "default" 
                      : currentOrganization.subscriptionStatus === "trial"
                      ? "secondary"
                      : "destructive"
                  }
                  className="capitalize"
                >
                  {currentOrganization.subscriptionStatus}
                </Badge>
              </div>
              {currentOrganization.trialEndsAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fin de prueba:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(currentOrganization.trialEndsAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Miembros de la Organización</CardTitle>
              <CardDescription>
                Administra los miembros y sus permisos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/organization/members")}
                variant="default"
              >
                Gestionar Miembros
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
