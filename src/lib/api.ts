// Read API URL from environment variables
// Falls back to localhost if not defined
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Get auth token from localStorage (only for token storage)
const getAuthToken = (): string | null => {
  const auth = localStorage.getItem("holy-moly-auth");
  if (!auth) return null;
  const parsed = JSON.parse(auth);
  return parsed.token || null;
};

// Get current organization ID from user's auth data
const getCurrentOrgId = (): string | null => {
  const auth = localStorage.getItem("holy-moly-auth");
  if (!auth) return null;
  try {
    const parsed = JSON.parse(auth);
    return parsed.user?.currentOrganizationId || null;
  } catch (error) {
    console.error("Error parsing auth data:", error);
    return null;
  }
};

// Get auth user roles from localStorage
const getUserRoles = (): string[] => {
  const auth = localStorage.getItem("holy-moly-auth");
  if (!auth) return [];
  const parsed = JSON.parse(auth);
  return parsed.user?.roles || [];
};

// Get impersonation state
const isImpersonating = (): boolean => {
  const impersonation = localStorage.getItem("holy-moly-impersonation");
  if (!impersonation) return false;
  const parsed = JSON.parse(impersonation);
  return parsed.isImpersonating || false;
};

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  includeOrgHeader: boolean = true
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const orgId = getCurrentOrgId();
  const roles = getUserRoles();
  const impersonating = isImpersonating();

  // Solo enviar X-Organization-Id si:
  // 1. includeOrgHeader es true
  // 2. Hay un orgId
  // 3. NO es superadmin O está impersonando
  const shouldIncludeOrgHeader = includeOrgHeader && orgId &&
    (!roles.includes("super_admin") || impersonating);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(shouldIncludeOrgHeader && { "X-Organization-Id": orgId }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 204 No Content (common for DELETE requests)
    if (response.status === 204) {
      return { data: {} as T };
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || "An error occurred" };
    }

    // Handle standard API response format {success: true, data: ...}
    if (data.success !== undefined) {
      return data.success ? { data: data.data } : { error: data.message || data.error };
    }

    return { data };
  } catch (error) {
    return { error: "Network error" };
  }
}

// Auth API
export const authApi = {
  signup: (email: string, password: string, name: string, role: "owner" | "cake_topper_provider" | "super_admin") =>
    apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role }),
    }, false), // No org header for auth

  login: (email: string, password: string) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false), // No org header for auth

  logout: () =>
    apiFetch("/auth/logout", {
      method: "POST",
    }, false), // No org header for auth

  getCurrentUser: () => apiFetch("/auth/me", { method: "GET" }, false), // No org header for auth

  forgotPassword: (email: string) =>
    apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, false), // No org header for auth

  resetPassword: (token: string, newPassword: string) =>
    apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }, false), // No org header for auth

  updateProfile: (name: string) =>
    apiFetch("/auth/update-profile", {
      method: "PUT",
      body: JSON.stringify({ name }),
    }, false), // No org header for auth

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }, false), // No org header for auth
};

export const organizationsApi = {
  // Add member by email
  addMemberByEmail: async (organizationId: string, email: string, role: string, name?: string) => {
    return apiFetch(`/organizations/${organizationId}/members/by-email`, {
      method: "POST",
      body: JSON.stringify({ email, role, name }),
    });
  },
  getAll: () => apiFetch("/organizations", { method: "GET" }, false), // No org header needed

  getAllForSuperAdmin: () => apiFetch("/super-admin/organizations", { method: "GET" }, false), // Super admin endpoint

  getById: (id: string) => apiFetch(`/organizations/${id}`, { method: "GET" }, false),

  create: (data: { name: string; slug: string }) =>
    apiFetch("/organizations", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),

  update: (id: string, data: { name?: string; logo_url?: string; settings?: Record<string, any> }) =>
    apiFetch(`/organizations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, false),

  delete: (id: string) =>
    apiFetch(`/organizations/${id}`, {
      method: "DELETE",
    }, false),

  // Members
  getMembers: (orgId: string) =>
    apiFetch(`/organizations/${orgId}/members`, { method: "GET" }, false),

  getMember: (orgId: string, userId: string) =>
    apiFetch(`/organizations/${orgId}/members/${userId}`, { method: "GET" }, false),

  addMember: (orgId: string, data: { user_id: string; role: string }) =>
    apiFetch(`/organizations/${orgId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    }, false),

  updateMemberRole: (orgId: string, userId: string, data: { role: string }) =>
    apiFetch(`/organizations/${orgId}/members/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, false),

  removeMember: (orgId: string, userId: string) =>
    apiFetch(`/organizations/${orgId}/members/${userId}`, {
      method: "DELETE",
    }, false),
  getLogoByEmail: (email: string) =>
    apiFetch<{ logoUrl: string | null }>(`/organizations/logo-by-email?email=${encodeURIComponent(email)}`, {
      method: "GET",
    }, false),

  // Email audit endpoints
  getMemberEmailStatus: async (organizationId: string, memberId: string) => {
    return apiFetch<{
      hasEmailLog: boolean;
      emailLog?: {
        id: string;
        email: string;
        status: 'pending' | 'sent' | 'failed' | 'bounced';
        errorMessage?: string;
        createdAt: string;
        updatedAt: string;
      };
      message?: string;
    }>(`/organizations/${organizationId}/members/${memberId}/email-status`, {}, false);
  },

  resendWelcomeEmail: async (organizationId: string, memberId: string) => {
    return apiFetch<{
      emailSent: boolean;
      emailError?: string;
      member: {
        id: string;
        email: string;
        name: string;
      };
    }>(`/organizations/${organizationId}/members/${memberId}/resend-welcome`, {
      method: "POST",
    }, false);
  },
};

// User Roles API
export const userRolesApi = {
  getUserRoles: (userId: string) =>
    apiFetch(`/users/${userId}/roles`, { method: "GET" }, false),
};

// Subscription Plans API
export const subscriptionPlansApi = {
  getAll: (activeOnly: boolean = true) =>
    apiFetch(`/subscription-plans?active_only=${activeOnly}`, { method: "GET" }),

  getById: (id: string) =>
    apiFetch(`/subscription-plans/${id}`, { method: "GET" }),

  create: (data: any) =>
    apiFetch("/super-admin/subscription-plans", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),

  update: (id: string, data: any) =>
    apiFetch(`/super-admin/subscription-plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, false),

  delete: (id: string) =>
    apiFetch(`/super-admin/subscription-plans/${id}`, {
      method: "DELETE",
    }, false),

  // Plan Features Management
  getPlanFeatures: (planId: string) =>
    apiFetch(`/subscription-plans/${planId}/features`, { method: "GET" }),

  updateAllPlanFeatures: (planId: string, features: Record<string, any>) =>
    apiFetch(`/subscription-plans/${planId}/features`, {
      method: "PUT",
      body: JSON.stringify(features),
    }, false),

  updatePlanFeature: (planId: string, featureKey: string, data: { value: any }) =>
    apiFetch(`/subscription-plans/${planId}/features/${featureKey}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }, false),

  deletePlanFeature: (planId: string, featureKey: string) =>
    apiFetch(`/subscription-plans/${planId}/features/${featureKey}`, {
      method: "DELETE",
    }, false),
};

// Subscription Features API
export const subscriptionFeaturesApi = {
  getAll: () =>
    apiFetch("/subscription-features", { method: "GET" }),

  getById: (id: string) =>
    apiFetch(`/subscription-features/${id}`, { method: "GET" }),

  create: (data: any) =>
    apiFetch("/subscription-features", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),

  update: (id: string, data: any) =>
    apiFetch(`/subscription-features/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, false),

  delete: (id: string) =>
    apiFetch(`/subscription-features/${id}`, {
      method: "DELETE",
    }, false),
};

// Super Admin API
export const superAdminApi = {
  // Organizations
  createOrganization: (data: any) =>
    apiFetch("/super-admin/organizations", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),

  getAllOrganizations: (params?: { page?: number; limit?: number; status?: string; plan?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.plan) queryParams.append("plan", params.plan);
    if (params?.search) queryParams.append("search", params.search);
    
    return apiFetch(`/super-admin/organizations?${queryParams.toString()}`, { method: "GET" }, false);
  },

  updateOrganizationSubscription: (orgId: string, data: any) =>
    apiFetch(`/super-admin/organizations/${orgId}/subscription`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }, false),

  impersonateOrganization: (orgId: string) =>
    apiFetch(`/super-admin/organizations/${orgId}/impersonate`, {
      method: "POST",
    }, false),

  // Send confirmation email to specific user in organization
  resendConfirmationEmail: (orgId: string, userId: string) =>
    apiFetch(`/super-admin/organizations/${orgId}/resend-confirmation`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }, false),

  // Send password reset email to specific user in organization
  sendPasswordResetEmail: (orgId: string, userId: string) =>
    apiFetch(`/super-admin/organizations/${orgId}/send-password-reset`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }, false),
};

// Stripe API
export const stripeApi = {
  createCheckoutSession: (data: { planId: string; organizationId: string; billingInterval: 'monthly' | 'yearly' }) =>
    apiFetch("/stripe/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createPortalSession: (organizationId: string) =>
    apiFetch("/stripe/create-billing-portal-session", {
      method: "POST",
      body: JSON.stringify({ organizationId }),
    }),

  getSubscriptionStatus: (organizationId: string) =>
    apiFetch(`/stripe/subscription-status/${organizationId}`, { method: "GET" }),
};

// ============================================================
// Datos del negocio: ahora viven en Lovable Cloud (Supabase)
// ============================================================
export { analyticsApi } from "./supabaseAnalytics";
export {
  ingredientsApi,
  suppliesApi,
  recipesApi,
  recipeParametersApi,
  quotationsApi,
  ordersApi,
  expensesApi,
  inventoryApi,
  paymentMethodsApi,
  cardTypesApi,
  recipeTypesApi,
} from "./supabaseData";
