import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat,
  DollarSign,
  Users,
  BarChart,
  Package,
  FileText,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Zap
} from "lucide-react";
import logo from "@/assets/Orderly-logo.png";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { subscriptionPlansApi, subscriptionFeaturesApi } from "@/lib/api";

export default function Landing() {
  const navigate = useNavigate();
  const { plans: dbPlans, isLoading: plansLoading } = useSubscriptionPlans(true);
  const [planFeatures, setPlanFeatures] = useState<Record<string, any>>({});
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(true);

  // Load all features and plan-specific features
  useEffect(() => {
    const loadFeatures = async () => {
      setLoadingFeatures(true);

      // Load all available features
      const featuresResult = await subscriptionFeaturesApi.getAll();
      if (!featuresResult.error) {
        setAllFeatures((featuresResult.data as any[]) || []);
      }

      // Load features for each plan
      if (dbPlans.length > 0) {
        const featuresMap: Record<string, any> = {};

        for (const plan of dbPlans) {
          const planFeaturesResult = await subscriptionPlansApi.getPlanFeatures(plan.id);
          if (!planFeaturesResult.error) {
            featuresMap[plan.id] = planFeaturesResult.data || {};
          }
        }

        setPlanFeatures(featuresMap);
      }

      setLoadingFeatures(false);
    };

    if (!plansLoading && dbPlans.length > 0) {
      loadFeatures();
    } else if (!plansLoading) {
      setLoadingFeatures(false);
    }
  }, [dbPlans, plansLoading]);

  const features = [
    {
      icon: ChefHat,
      title: "Gestión de Recetas",
      description: "Crea y administra todas tus recetas con variaciones, costos y parámetros personalizables."
    },
    {
      icon: Package,
      title: "Control de Inventario",
      description: "Gestiona ingredientes y suministros con seguimiento automático de costos y existencias."
    },
    {
      icon: FileText,
      title: "Órdenes y Cotizaciones",
      description: "Genera órdenes de producción y cotizaciones profesionales en segundos."
    },
    {
      icon: DollarSign,
      title: "Control de Gastos",
      description: "Registra y categoriza todos tus gastos operativos para un control financiero preciso."
    },
    {
      icon: BarChart,
      title: "Análisis Avanzados",
      description: "Obtén insights valiosos sobre costos, rentabilidad y tendencias de tu negocio."
    },
    {
      icon: Users,
      title: "Trabajo en Equipo",
      description: "Colabora con tu equipo con roles y permisos personalizados para cada usuario."
    }
  ];

  const handleSelectPlan = (planId: string, planSlug: string) => {
    // Save selected plan to localStorage for the checkout flow
    localStorage.setItem('selected_plan', JSON.stringify({ planId, planSlug }));
    // Navigate to auth with plan parameter
    navigate(`/auth?plan=${planSlug}`);
  };

  // Transform database plans to UI format
  const plans = dbPlans.map((plan, index) => {
    const featuresList: string[] = [];

    // Add basic plan info
    if (plan.maxOrdersPerMonth === -1) {
      featuresList.push("Órdenes ilimitadas");
    } else {
      featuresList.push(`Hasta ${plan.maxOrdersPerMonth} órdenes/mes`);
    }

    if (plan.maxUsers === -1) {
      featuresList.push("Usuarios ilimitados");
    } else {
      featuresList.push(`${plan.maxUsers} usuarios incluidos`);
    }

    featuresList.push(`${plan.maxStorageGb} GB almacenamiento`);

    // Add features from database
    const currentPlanFeatures = planFeatures[plan.id] || {};

    // Sort features by display_order and add to list
    const sortedFeatures = allFeatures
      .filter(feature => {
        const value = currentPlanFeatures[feature.key];
        // Include feature if it has a value and it's not false
        return value !== undefined && value !== false;
      })
      .sort((a, b) => {
        const orderA = a.display_order || a.displayOrder || 0;
        const orderB = b.display_order || b.displayOrder || 0;
        return orderA - orderB;
      });

    for (const feature of sortedFeatures) {
      const value = currentPlanFeatures[feature.key];
      const valueType = feature.value_type || feature.valueType;

      // Format feature based on type
      if (valueType === 'boolean' && value === true) {
        featuresList.push(feature.name);
      } else if (valueType === 'string' && value) {
        featuresList.push(value); // Use the string value directly
      } else if (valueType === 'number' && value) {
        // For numbers, show with the feature name
        featuresList.push(`${feature.name}: ${value}`);
      }
    }

    return {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      price: plan.priceMonthly,
      interval: "mes",
      description: plan.slug === "starter" ? "Perfecto para comenzar" :
                   plan.slug === "professional" ? "Para negocios en crecimiento" :
                   plan.slug === "enterprise" ? "Para operaciones a gran escala" :
                   "Plan personalizado",
      features: featuresList,
      highlighted: index === 1 || plan.slug === "professional" // Highlight middle plan or professional
    };
  });

  const testimonials = [
    {
      name: "Tatiana",
      role: "Propietaria, Holy Moly",
      content: "Orderly transformó completamente mi negocio. Ahora puedo calcular costos exactos y optimizar mis precios."
    },
    // {
    //   name: "Carlos Ramírez",
    //   role: "Chef Ejecutivo, Delicias Artesanales",
    //   content: "La gestión de recetas y órdenes es increíble. Ahorro horas cada semana en tareas administrativas."
    // },
    // {
    //   name: "Ana Martínez",
    //   role: "Gerente, Pastelerías Royale",
    //   content: "El control de inventario y gastos nos ayudó a reducir costos en un 30%. Una herramienta indispensable."
    // }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Holy Moly Logo" className="h-10 w-50" />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
              >
                Iniciar Sesión
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                className="gap-2"
              >
                Prueba Gratis
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Plataforma Todo-en-Uno para Pastelerías
          </Badge>
          <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
            Gestiona tu pastelería con{" "}
            <span className="text-primary">precisión</span> y{" "}
            <span className="text-primary">eficiencia</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Controla recetas, inventario, costos y órdenes desde una sola plataforma.
            Optimiza tu operación y aumenta tu rentabilidad.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg gap-2"
            >
              Comenzar Prueba Gratis
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg"
            >
              Ver Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            No requiere tarjeta de crédito • Configuración en 5 minutos
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Características
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Todo lo que necesitas para gestionar tu pastelería
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Herramientas profesionales diseñadas específicamente para el negocio de repostería
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Ahorra Tiempo</h3>
              <p className="text-muted-foreground">
                Automatiza tareas administrativas y dedica más tiempo a lo que amas: crear.
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Reduce Costos</h3>
              <p className="text-muted-foreground">
                Identifica áreas de mejora y optimiza tu rentabilidad con datos precisos.
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Crece Seguro</h3>
              <p className="text-muted-foreground">
                Escala tu negocio con confianza respaldado por datos y análisis profesionales.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Precios
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Planes flexibles para cada necesidad
            </h2>
            <p className="text-xl text-muted-foreground">
              Comienza gratis y crece con nosotros
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.highlighted ? 'border-primary border-2 shadow-lg scale-105' : ''}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Más Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="mb-4">{plan.description}</CardDescription>
                  <div className="space-y-1">
                    <div className="text-4xl font-bold">${plan.price}</div>
                    <div className="text-muted-foreground">por {plan.interval}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={plan.highlighted ? "default" : "outline"}
                    onClick={() => navigate("/auth")}
                  >
                    Comenzar Ahora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Testimonios
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Nuestros clientes nos respaldan
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <CheckCircle2 key={i} className="w-4 h-4 text-primary fill-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-bold">
            ¿Listo para transformar tu pastelería?
          </h2>
          <p className="text-xl text-muted-foreground">
            Únete a cientos de pastelerías que ya optimizaron su operación
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg gap-2"
            >
              Comenzar Gratis Ahora
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Holy Moly Logo" className="h-8 w-50" />
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 Orderly. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
