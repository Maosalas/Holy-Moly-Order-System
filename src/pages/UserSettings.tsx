import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";
import { User, Lock, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const UserSettings = () => {
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estado para actualizar perfil
  const [name, setName] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Estado para cambiar contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Cargar nombre actual del usuario
  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  const passwordRequirements = [
    {
      met: newPassword.length >= 8,
      text: "Al menos 8 caracteres",
    },
    {
      met: newPassword === confirmPassword && newPassword.length > 0,
      text: "Las contraseñas coinciden",
    },
    {
      met: newPassword !== currentPassword && newPassword.length > 0,
      text: "Diferente a la contraseña actual",
    },
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      const result = await authApi.updateProfile(name);

      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error actualizando perfil";
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMsg,
        });
      } else {
        // Update user in context
        if (result.data && typeof result.data === 'object' && 'user' in result.data) {
          const updatedUser = result.data.user as any;
          updateUser({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            roles: updatedUser.roles || (updatedUser.role ? [updatedUser.role] : []),
          });
        }
        toast({
          title: "Perfil actualizado",
          description: "Tu información ha sido actualizada exitosamente.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error de conexión. Por favor, intenta nuevamente.",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError("");

    // Validaciones frontend
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("La nueva contraseña debe ser diferente a la actual");
      setIsChangingPassword(false);
      return;
    }

    try {
      const result = await authApi.changePassword(currentPassword, newPassword);

      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error cambiando contraseña";
        setPasswordError(errorMsg);
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMsg,
        });
      } else {
        toast({
          title: "Contraseña cambiada",
          description: "Redirigiendo al inicio de sesión...",
        });

        // Limpiar formulario
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Cerrar sesión y redirigir al login después de 2 segundos
        setTimeout(() => {
          logout();
          navigate("/auth");
        }, 2000);
      }
    } catch (error) {
      setPasswordError("Error de conexión. Por favor, intenta nuevamente.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error de conexión. Por favor, intenta nuevamente.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración de Usuario</h1>
        <p className="text-muted-foreground mt-2">
          Administra tu información personal y seguridad
        </p>
      </div>

      {/* Sección 1: Actualizar Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </CardTitle>
          <CardDescription>
            Actualiza tu nombre y datos de perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El correo electrónico no se puede cambiar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={255}
                placeholder="Tu nombre completo"
              />
            </div>

            <Button type="submit" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Sección 2: Cambiar Contraseña */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Por tu seguridad, después de cambiar la contraseña deberás iniciar sesión nuevamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Tu contraseña actual"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">La contraseña debe cumplir:</p>
              <ul className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <li
                    key={index}
                    className={`text-sm flex items-center gap-2 ${
                      req.met ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    <Check
                      className={`h-4 w-4 ${
                        req.met ? "opacity-100" : "opacity-30"
                      }`}
                    />
                    {req.text}
                  </li>
                ))}
              </ul>
            </div>

            {passwordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isChangingPassword}
              variant="destructive"
            >
              {isChangingPassword ? "Cambiando..." : "Cambiar Contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSettings;
