import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook para verificar si la organización actual tiene acceso a features específicos
 * basándose en su plan de suscripción.
 * Los super_admin tienen acceso a todos los features sin necesidad de suscripción.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { hasFeatureAccess, getCurrentPlan } = useSubscriptionFeatures();
 *
 *   if (hasFeatureAccess('api_access')) {
 *     // Mostrar features premium
 *   }
 * }
 * ```
 */
export function useSubscriptionFeatures() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  /**
   * Configuración de acceso a features por plan
   *
   * Para AGREGAR un feature:
   *   nombre_feature: ['plan1', 'plan2', ...]
   *
   * Para MODIFICAR qué planes tienen acceso:
   *   Cambia el array de planes
   *
   * Para ELIMINAR un feature:
   *   Elimina o comenta la línea
   */
  const featureAccess: Record<string, string[]> = {
    // API Access
    api_access: ['professional', 'enterprise'],

    // Custom Branding
    custom_branding: ['enterprise'],

    // Advanced Analytics
    advanced_analytics: ['professional', 'enterprise'],

    // Priority Support
    priority_support: ['professional', 'enterprise'],
    // Inventory Alerts
    inventory_alerts: ['enterprise'],
    // Dedicated Support
    dedicated_support: ['enterprise'],

    // Team Management
    team_management: ['starter', 'professional', 'enterprise'],

    // Custom Integrations
    custom_integrations: ['enterprise'],

    // Advanced Security
    advanced_security: ['professional', 'enterprise'],

    // White Label
    white_label: ['enterprise'],

    // SLA
    sla_guarantee: ['enterprise'],

    // ============================================
    // 📝 AGREGAR NUEVOS FEATURES AQUÍ:
    // ============================================
    // Ejemplo:
    // video_calls: ['professional', 'enterprise'],
    // unlimited_storage: ['enterprise'],
    // custom_reports: ['starter', 'professional', 'enterprise'],
  };

  /**
   * Verifica si el plan actual tiene acceso a un feature específico
   * Los super_admin tienen acceso a todos los features
   */
  const hasFeatureAccess = (feature: string): boolean => {
    // Super admins tienen acceso a todos los features
    if (user?.roles.includes("super_admin")) {
      return true;
    }

    if (!currentOrganization) {
      console.warn('⚠️ useSubscriptionFeatures: No organization context available');
      return false;
    }

    const plan = currentOrganization.subscriptionPlan;
    const status = currentOrganization.subscriptionStatus;

    // Si la suscripción no está activa o en trial, no tiene acceso
    if (status !== 'active' && status !== 'trial') {
      console.log(`🔒 Feature "${feature}" denied: subscription status is "${status}"`);
      return false;
    }

    // Verificar si el feature existe en la configuración
    if (!featureAccess[feature]) {
      console.warn(`⚠️ Feature "${feature}" not found in feature access configuration`);
      return false;
    }

    const hasAccess = featureAccess[feature].includes(plan);

    if (!hasAccess) {
      console.log(`🔒 Feature "${feature}" denied for plan "${plan}"`);
    }

    return hasAccess;
  };

  /**
   * Obtiene el plan actual de la organización
   */
  const getCurrentPlan = () => {
    return currentOrganization?.subscriptionPlan || 'free';
  };

  /**
   * Obtiene el estado de la suscripción
   */
  const getSubscriptionStatus = () => {
    return currentOrganization?.subscriptionStatus || 'trial';
  };

  /**
   * Verifica si la suscripción está activa
   * Los super_admin siempre retornan true
   */
  const isSubscriptionActive = (): boolean => {
    // Super admins no necesitan suscripción activa
    if (user?.roles.includes("super_admin")) {
      return true;
    }

    const status = getSubscriptionStatus();
    return status === 'active' || status === 'trial';
  };

  /**
   * Verifica si está en periodo de prueba
   */
  const isOnTrial = (): boolean => {
    return getSubscriptionStatus() === 'trial';
  };

  /**
   * Obtiene la fecha de fin del trial
   */
  const getTrialEndsAt = (): Date | null => {
    return currentOrganization?.trialEndsAt || null;
  };

  /**
   * Verifica si el trial ha expirado
   */
  const isTrialExpired = (): boolean => {
    const trialEndsAt = getTrialEndsAt();
    if (!trialEndsAt) return false;

    return new Date() > new Date(trialEndsAt);
  };

  /**
   * Obtiene los días restantes del trial
   */
  const getTrialDaysRemaining = (): number | null => {
    const trialEndsAt = getTrialEndsAt();
    if (!trialEndsAt) return null;

    const now = new Date();
    const end = new Date(trialEndsAt);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  /**
   * Obtiene todos los features disponibles para el plan actual
   */
  const getAvailableFeatures = (): string[] => {
    const plan = getCurrentPlan();
    return Object.entries(featureAccess)
      .filter(([_, plans]) => plans.includes(plan))
      .map(([feature]) => feature);
  };

  /**
   * Verifica si tiene acceso a múltiples features (todos deben estar disponibles)
   */
  const hasAllFeatures = (features: string[]): boolean => {
    return features.every((feature) => hasFeatureAccess(feature));
  };

  /**
   * Verifica si tiene acceso a al menos uno de los features
   */
  const hasAnyFeature = (features: string[]): boolean => {
    return features.some((feature) => hasFeatureAccess(feature));
  };

  return {
    // Verificación de features
    hasFeatureAccess,
    hasAllFeatures,
    hasAnyFeature,
    getAvailableFeatures,

    // Información del plan
    getCurrentPlan,
    getSubscriptionStatus,
    isSubscriptionActive,

    // Información del trial
    isOnTrial,
    getTrialEndsAt,
    isTrialExpired,
    getTrialDaysRemaining,

    // Datos completos de la organización
    organization: currentOrganization,
  };
}
