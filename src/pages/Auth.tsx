import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { organizationsApi } from "@/lib/api";
import logo from "@/assets/Orderly-logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const planFromUrl = searchParams.get('plan') || 'free';

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "owner" as const,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleEmailChange = async (email: string, isLogin: boolean) => {
    if (isLogin) {
      setLoginForm({ ...loginForm, email });
    } else {
      setSignupForm({ ...signupForm, email });
    }

    // Validar que el email tenga formato válido antes de consultar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      try {
        const response = await organizationsApi.getLogoByEmail(email);
        if (response.data?.logoUrl) {
          setOrganizationLogo(response.data.logoUrl);
        } else {
          setOrganizationLogo(null);
        }
      } catch (error) {
        // Si no se encuentra logo, usar el default
        setOrganizationLogo(null);
      }
    } else {
      setOrganizationLogo(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { success, error, user } = await login(loginForm.email, loginForm.password);

    setIsLoading(false);

    if (success && user) {
      toast({
        title: "¡Bienvenido de vuelta!",
        description: "Has iniciado sesión exitosamente.",
      });

      // Si el usuario es super_admin, redirigir directamente sin pasar por checkout u organización
      if (user.roles.includes("super_admin")) {
        navigate("/super-admin");
        return;
      }

      // Para usuarios normales, verificar si hay un plan seleccionado
      const planSlug = searchParams.get('plan') || localStorage.getItem('selected_plan_slug');
      if (planSlug) {
        navigate(`/checkout?plan=${planSlug}`);
      } else {
        navigate("/dashboard");
      }
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
    setIsLoading(true);

    const { success, error } = await signup(
      signupForm.email,
      signupForm.password,
      signupForm.name,
      signupForm.role
    );

    setIsLoading(false);

    if (success) {
      toast({
        title: "¡Cuenta creada!",
        description: "Ahora configura tu suscripción.",
      });
      
      // Store selected plan for checkout
      if (planFromUrl) {
        localStorage.setItem('selected_plan_slug', planFromUrl);
      }
      
      // All plans (including free trial) go through checkout first
      // Free trial in Stripe still requires payment method for future billing
      navigate(`/checkout?plan=${planFromUrl}`);
    } else {
      toast({
        variant: "destructive",
        title: "Error al registrarse",
        description: error || "No se pudo crear la cuenta",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={organizationLogo || logo} 
              alt={organizationLogo ? "Organization Logo" : "Holy Moly Logo"} 
              className="h-100 w-100 object-contain" 
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {/* <TabsList className="grid w-full grid-cols-2"> */}
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo Electrónico</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@ejemplo.com"
                    value={loginForm.email}
                    onChange={(e) => handleEmailChange(e.target.value, true)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </form>
            </TabsContent>

            {/* Esta es la parte del registro de una persona */}
            <TabsContent value="signup">
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tu@ejemplo.com"
                    value={signupForm.email}
                    onChange={(e) => handleEmailChange(e.target.value, false)}
                    required
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
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
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
