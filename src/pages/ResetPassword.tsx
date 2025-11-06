import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";
import logo from "@/assets/Orderly-logo.png";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("Token de restablecimiento no válido");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    return null;
  };

  const passwordRequirements = [
    {
      met: newPassword.length >= 8,
      text: "Al menos 8 caracteres",
    },
    {
      met: newPassword === confirmPassword && newPassword.length > 0,
      text: "Las contraseñas coinciden",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.resetPassword(token, newPassword);

      if (result.error) {
        setError(result.error);
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      } else {
        setSuccess(true);
        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido actualizada exitosamente.",
        });

        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      }
    } catch (err) {
      setError("Error de conexión. Por favor, intenta nuevamente.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error de conexión. Por favor, intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <img
                src={logo}
                alt="Holy Moly Logo"
                className="h-100 w-100 object-contain"
              />
            </div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              Enlace Inválido
            </CardTitle>
            <CardDescription className="text-base pt-2">
              El enlace de restablecimiento no es válido o ha expirado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/forgot-password">
              <Button className="w-full">
                Solicitar nuevo enlace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <img
                src={logo}
                alt="Holy Moly Logo"
                className="h-100 w-100 object-contain"
              />
            </div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Contraseña Actualizada
            </CardTitle>
            <CardDescription className="text-base pt-2">
              Tu contraseña ha sido actualizada exitosamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Serás redirigido al inicio de sesión en unos segundos...
            </p>
            <Link to="/auth">
              <Button className="w-full">
                Ir al inicio de sesión ahora
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img
              src={logo}
              alt="Holy Moly Logo"
              className="h-100 w-100 object-contain"
            />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Lock className="h-6 w-6" />
            Restablecer Contraseña
          </CardTitle>
          <CardDescription className="text-base pt-2">
            Ingresa tu nueva contraseña a continuación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10 pr-10"
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

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Actualizar Contraseña"}
            </Button>

            <div className="text-center">
              <Link to="/auth">
                <Button variant="ghost" className="text-sm">
                  Cancelar y volver al inicio de sesión
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
