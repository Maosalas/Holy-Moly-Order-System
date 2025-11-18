import { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Users, Upload, Wallet, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import defaultLogo from "@/assets/Orderly-logo.png";
import { PaymentMethodsList } from "@/components/PaymentMethodsList";
import { CardTypesList } from "@/components/CardTypesList";

export default function OrganizationSettings() {
  const { currentOrganization, updateOrganization, isLoading, fetchOrganizations } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState(currentOrganization?.name || "");
  const [logoUrl, setLogoUrl] = useState(currentOrganization?.logoUrl || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(currentOrganization?.logoUrl || defaultLogo);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona un archivo de imagen válido",
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La imagen no debe superar los 5MB",
      });
      return;
    }

    setLogoFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!currentOrganization) return;
    
    let logoBase64 = logoUrl;

    // Si hay un archivo nuevo, convertir a base64
    if (logoFile) {
      const reader = new FileReader();
      logoBase64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoFile);
      });
    }

    const success = await updateOrganization(currentOrganization.id, {
      name,
      logoUrl: logoBase64,
    });

    if (success) {
      setLogoFile(null);
      // Recargar las organizaciones para actualizar el logo en todo el sistema
      await fetchOrganizations();
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Building2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Miembros
          </TabsTrigger>
          <TabsTrigger value="payment-methods">
            <Wallet className="h-4 w-4 mr-2" />
            Métodos de Pago
          </TabsTrigger>
          <TabsTrigger value="card-types">
            <CreditCard className="h-4 w-4 mr-2" />
            Tipos de Tarjetas
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
                <Label htmlFor="logoFile">Logo de la Organización</Label>
                {logoPreview && (
                  <div className="mb-4 flex justify-center">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="h-24 w-24 object-contain rounded-lg border border-border"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    id="logoFile"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={!canManage}
                    className="cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!canManage}
                    onClick={() => document.getElementById('logoFile')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos aceptados: JPG, PNG, GIF. Máximo 5MB.
                </p>
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

        <TabsContent value="payment-methods">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
              <CardDescription>
                Configura los métodos de pago disponibles para los pedidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="card-types">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Tarjetas</CardTitle>
              <CardDescription>
                Configura los tipos de tarjetas aceptadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CardTypesList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
