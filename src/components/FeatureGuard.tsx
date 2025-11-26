import { ReactNode } from "react";
import { useSubscriptionFeatures } from "@/hooks/use-subscription-features";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface FeatureGuardProps {
  /**
   * Feature requerido para mostrar el contenido
   */
  feature: string;

  /**
   * Múltiples features (todos deben estar disponibles)
   */
  features?: string[];

  /**
   * Si true, solo uno de los features debe estar disponible
   */
  requireAny?: boolean;

  /**
   * Contenido a mostrar si el usuario tiene acceso
   */
  children: ReactNode;

  /**
   * Componente a mostrar si el usuario NO tiene acceso
   * Si no se proporciona, se muestra un mensaje por defecto
   */
  fallback?: ReactNode;

  /**
   * Si true, no muestra nada cuando no tiene acceso (en lugar del fallback)
   */
  hideWhenRestricted?: boolean;

  /**
   * Callback cuando se hace click en "Upgrade Plan"
   */
  onUpgradeClick?: () => void;
}

/**
 * Componente para restringir acceso a features basándose en el plan de suscripción
 *
 * @example
 * ```tsx
 * // Ejemplo básico
 * <FeatureGuard feature="api_access">
 *   <ApiKeySettings />
 * </FeatureGuard>
 *
 * // Con múltiples features
 * <FeatureGuard features={["api_access", "custom_branding"]}>
 *   <AdvancedSettings />
 * </FeatureGuard>
 *
 * // Requiere al menos uno
 * <FeatureGuard features={["priority_support", "dedicated_support"]} requireAny>
 *   <SupportChat />
 * </FeatureGuard>
 *
 * // Con fallback personalizado
 * <FeatureGuard
 *   feature="custom_branding"
 *   fallback={<CustomUpgradeMessage />}
 * >
 *   <BrandingSettings />
 * </FeatureGuard>
 *
 * // Ocultar completamente si no tiene acceso
 * <FeatureGuard feature="advanced_analytics" hideWhenRestricted>
 *   <AnalyticsDashboard />
 * </FeatureGuard>
 * ```
 */
export function FeatureGuard({
  feature,
  features = [],
  requireAny = false,
  children,
  fallback,
  hideWhenRestricted = false,
  onUpgradeClick,
}: FeatureGuardProps) {
  const { hasFeatureAccess, hasAllFeatures, hasAnyFeature, getCurrentPlan } =
    useSubscriptionFeatures();

  // Determinar si tiene acceso
  let hasAccess = false;

  if (feature) {
    hasAccess = hasFeatureAccess(feature);
  } else if (features.length > 0) {
    hasAccess = requireAny ? hasAnyFeature(features) : hasAllFeatures(features);
  }

  // Si tiene acceso, mostrar el contenido
  if (hasAccess) {
    return <>{children}</>;
  }

  // Si no tiene acceso y se debe ocultar, no mostrar nada
  if (hideWhenRestricted) {
    return null;
  }

  // Si hay un fallback personalizado, mostrarlo
  if (fallback) {
    return <>{fallback}</>;
  }

  // Mostrar mensaje por defecto
  const currentPlan = getCurrentPlan();
  const requiredFeature = feature || features[0] || "this feature";

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <Lock className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">Feature Premium</AlertTitle>
      <AlertDescription className="text-amber-800">
        <p className="mb-3">
          Esta función requiere un plan superior. Tu plan actual es{" "}
          <strong className="capitalize">{currentPlan}</strong>.
        </p>
        {onUpgradeClick && (
          <Button
            onClick={onUpgradeClick}
            variant="default"
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
          >
            Mejorar Plan
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Componente para mostrar diferentes contenidos basándose en el plan
 *
 * @example
 * ```tsx
 * <FeatureSwitch>
 *   <FeatureSwitch.When feature="api_access">
 *     <ApiSettings />
 *   </FeatureSwitch.When>
 *   <FeatureSwitch.When feature="custom_branding">
 *     <BrandingSettings />
 *   </FeatureSwitch.When>
 *   <FeatureSwitch.Otherwise>
 *     <BasicSettings />
 *   </FeatureSwitch.Otherwise>
 * </FeatureSwitch>
 * ```
 */
export function FeatureSwitch({ children }: { children: ReactNode }) {
  const { hasFeatureAccess } = useSubscriptionFeatures();

  const childrenArray = Array.isArray(children) ? children : [children];

  // Buscar el primer child que tenga acceso
  for (const child of childrenArray) {
    if (!child) continue;

    // Si es un FeatureSwitch.When
    if (
      typeof child === "object" &&
      "props" in child &&
      child.props.feature
    ) {
      if (hasFeatureAccess(child.props.feature)) {
        return child.props.children;
      }
    }

    // Si es FeatureSwitch.Otherwise
    if (
      typeof child === "object" &&
      "type" in child &&
      child.type === FeatureSwitchOtherwise
    ) {
      // Guardar el Otherwise para mostrar al final si nada más aplica
      continue;
    }
  }

  // Si ningún When aplica, buscar Otherwise
  const otherwise = childrenArray.find(
    (child) =>
      child &&
      typeof child === "object" &&
      "type" in child &&
      child.type === FeatureSwitchOtherwise
  );

  if (otherwise && typeof otherwise === "object" && "props" in otherwise) {
    return otherwise.props.children;
  }

  return null;
}

function FeatureSwitchWhen({
  feature,
  children,
}: {
  feature: string;
  children: ReactNode;
}) {
  return <>{children}</>;
}

function FeatureSwitchOtherwise({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

FeatureSwitch.When = FeatureSwitchWhen;
FeatureSwitch.Otherwise = FeatureSwitchOtherwise;
