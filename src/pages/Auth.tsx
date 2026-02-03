import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import logo from "@/assets/Orderly-logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup, resendConfirmationEmail, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle email confirmation redirect
  useEffect(() => {
    const type = searchParams.get("type");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error de verificación",
        description: errorDescription || "Hubo un problema con la verificación del email.",
      });
    } else if (type === "signup" || type === "email_change") {
      toast({
        title: "¡Email verificado!",
        description: "Tu cuenta ha sido verificada. Ahora puedes iniciar sesión.",
      });
      setActiveTab("login");
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // Check if user is super_admin
      if (user?.roles.includes("super_admin")) {
        navigate("/super-admin");
        return;
      }

      const planSlug = searchParams.get("plan") || localStorage.getItem("selected_plan_slug");
      if (planSlug) {
        navigate("/create-organization");
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, authLoading, navigate, searchParams, user]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { success, error, needsEmailConfirmation, user: loggedInUser } = await login(loginForm.email, loginForm.password);

    setIsLoading(false);

    if (needsEmailConfirmation) {
      setPendingEmail(loginForm.email);
      setShowEmailConfirmation(true);
      toast({
        variant: "destructive",
        title: "Email no verificado",
        description: "Por favor verifica tu email para continuar.",
      });
      return;
    }

    if (success) {
      toast({
        title: "¡Bienvenido de vuelta!",
        description: "Has iniciado sesión exitosamente.",
      });
      
      // Navigation is handled by the useEffect
    } else {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: error || "Credenciales inválidas",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas no coinciden",
      });
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
      });
      return;
    }

    setIsLoading(true);

    const { success, error, needsEmailConfirmation } = await signup(
      signupForm.email,
      signupForm.password,
      signupForm.name
    );

    setIsLoading(false);

    if (success) {
      // Store selected plan for after verification
      const planSlug = searchParams.get("plan");
      if (planSlug) {
        localStorage.setItem("selected_plan_slug", planSlug);
      }

      if (needsEmailConfirmation) {
        setPendingEmail(signupForm.email);
        setShowEmailConfirmation(true);
        toast({
          title: "¡Cuenta creada!",
          description: "Por favor revisa tu email para verificar tu cuenta.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error al registrarse",
        description: error || "No se pudo crear la cuenta",
      });
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    const { success, error } = await resendConfirmationEmail(pendingEmail);
    setIsLoading(false);

    if (success) {
      setResendCooldown(60);
      toast({
        title: "Email reenviado",
        description: "Por favor revisa tu bandeja de entrada.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: error || "No se pudo reenviar el email",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Email confirmation pending view
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verifica tu email</CardTitle>
            <CardDescription>
              Hemos enviado un enlace de verificación a:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="font-medium">{pendingEmail}</p>
            </div>
            
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Haz clic en el enlace del email para activar tu cuenta. 
                Revisa también tu carpeta de spam.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={isLoading || resendCooldown > 0}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {resendCooldown > 0
                  ? `Reenviar en ${resendCooldown}s`
                  : "Reenviar email de verificación"}
              </Button>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowEmailConfirmation(false);
                  setActiveTab("login");
                }}
              >
                Volver al inicio de sesión
              </Button>
            </div>
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
              alt="Logo"
              className="h-24 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl">Bienvenido</CardTitle>
          <CardDescription>
            Inicia sesión o crea una cuenta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo Electrónico</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@ejemplo.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 font-normal text-sm h-auto"
                      onClick={() => navigate("/forgot-password")}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nombre Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Juan Pérez"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tu@ejemplo.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar Contraseña</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                
                {signupForm.password && signupForm.confirmPassword && 
                 signupForm.password !== signupForm.confirmPassword && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Las contraseñas no coinciden</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || (signupForm.password !== signupForm.confirmPassword && signupForm.confirmPassword !== "")}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    "Crear Cuenta"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
