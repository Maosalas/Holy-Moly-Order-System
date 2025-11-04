// const API_BASE_URL = "https://api-holymoly.networksalas.com/api";
const API_BASE_URL = "http://localhost:3000/api"; // For local development

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

// Get current organization ID from localStorage
const getCurrentOrgId = (): string | null => {
  const org = localStorage.getItem("holy-moly-current-org");
  if (!org) return null;
  const parsed = JSON.parse(org);
  return parsed.id || null;
};

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  includeOrgHeader: boolean = true
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const orgId = getCurrentOrgId();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(includeOrgHeader && orgId && { "X-Organization-Id": orgId }),
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
};

// Ingredients API
export const ingredientsApi = {
  getAll: () => apiFetch("/ingredients", { method: "GET" }),

  create: (ingredient: any) =>
    apiFetch("/ingredients", {
      method: "POST",
      body: JSON.stringify(ingredient),
    }),

  update: (id: string, ingredient: any) =>
    apiFetch(`/ingredients/${id}`, {
      method: "PUT",
      body: JSON.stringify(ingredient),
    }),

  delete: (id: string) =>
    apiFetch(`/ingredients/${id}`, {
      method: "DELETE",
    }),
};

// Recipes API
export const recipesApi = {
  getAll: async () => {
    const result = await apiFetch("/recipes", { method: "GET" });
    // Las recetas se migran en los componentes individuales según sea necesario
    return result;
  },

  create: (recipe: any) =>
    apiFetch("/recipes", {
      method: "POST",
      body: JSON.stringify(recipe),
    }),

  update: (id: string, recipe: any) =>
    apiFetch(`/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify(recipe),
    }
    ),

  delete: (id: string) =>
    apiFetch(`/recipes/${id}`, {
      method: "DELETE",
    }),

  // Endpoint para migrar recetas antiguas a elaboraciones
  migrateToElaborations: () =>
    apiFetch("/recipes/migrate-to-elaborations", {
      method: "POST",
    }),
};

// Supplies API
export const suppliesApi = {
  getAll: () => apiFetch("/supplies", { method: "GET" }),

  create: (supply: any) =>
    apiFetch("/supplies", {
      method: "POST",
      body: JSON.stringify(supply),
    }),

  update: (id: string, supply: any) =>
    apiFetch(`/supplies/${id}`, {
      method: "PUT",
      body: JSON.stringify(supply),
    }),

  delete: (id: string) =>
    apiFetch(`/supplies/${id}`, {
      method: "DELETE",
    }),
};

// Orders API
export const ordersApi = {
  getAll: () => apiFetch("/orders", { method: "GET" }),

  getById: (id: string) => apiFetch(`/orders/${id}`, { method: "GET" }),

  create: (order: any) =>
    apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify(order),
    }),

  update: (id: string, order: any) =>
    apiFetch(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(order),
    }),

  updateTopper: (id: string, data: { topperDetails?: string; topperPhotos?: string[] }) =>
    apiFetch(`/orders/${id}/topper`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch(`/orders/${id}`, {
      method: "DELETE",
    }),
};

// Expenses API
export const expensesApi = {
  getAll: () => apiFetch("/expenses", { method: "GET" }),

  getById: (id: string) => apiFetch(`/expenses/${id}`, { method: "GET" }),

  create: (expense: any) =>
    apiFetch("/expenses", {
      method: "POST",
      body: JSON.stringify(expense),
    }),

  update: (id: string, expense: any) =>
    apiFetch(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(expense),
    }),

  delete: (id: string) =>
    apiFetch(`/expenses/${id}`, {
      method: "DELETE",
    }),
};

// Card Types API
export const cardTypesApi = {
  getAll: () => apiFetch("/card-types", { method: "GET" }),

  getById: (id: string) => apiFetch(`/card-types/${id}`, { method: "GET" }),

  create: (cardType: any) =>
    apiFetch("/card-types", {
      method: "POST",
      body: JSON.stringify(cardType),
    }),

  update: (id: string, cardType: any) =>
    apiFetch(`/card-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(cardType),
    }),

  delete: (id: string) =>
    apiFetch(`/card-types/${id}`, {
      method: "DELETE",
    }),
};

// Recipe Types API
export const recipeTypesApi = {
  getAll: () => apiFetch("/recipe-types", { method: "GET" }),

  getById: (id: string) => apiFetch(`/recipe-types/${id}`, { method: "GET" }),

  create: (recipeType: any) =>
    apiFetch("/recipe-types", {
      method: "POST",
      body: JSON.stringify(recipeType),
    }),

  update: (id: string, recipeType: any) =>
    apiFetch(`/recipe-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(recipeType),
    }),

  delete: (id: string) =>
    apiFetch(`/recipe-types/${id}`, {
      method: "DELETE",
    }),
};

// Payment Methods API
export const paymentMethodsApi = {
  getAll: () => apiFetch("/payment-methods", { method: "GET" }),

  getById: (id: string) => apiFetch(`/payment-methods/${id}`, { method: "GET" }),

  create: (paymentMethod: any) =>
    apiFetch("/payment-methods", {
      method: "POST",
      body: JSON.stringify(paymentMethod),
    }),

  update: (id: string, paymentMethod: any) =>
    apiFetch(`/payment-methods/${id}`, {
      method: "PUT",
      body: JSON.stringify(paymentMethod),
    }),

  delete: (id: string) =>
    apiFetch(`/payment-methods/${id}`, {
      method: "DELETE",
    }),
};

// Quotations API
export const quotationsApi = {
  getAll: () => apiFetch("/quotations", { method: "GET" }),

  getById: (id: string) => apiFetch(`/quotations/${id}`, { method: "GET" }),

  create: (quotation: any) =>
    apiFetch("/quotations", {
      method: "POST",
      body: JSON.stringify(quotation),
    }),

  update: (id: string, quotation: any) =>
    apiFetch(`/quotations/${id}`, {
      method: "PUT",
      body: JSON.stringify(quotation),
    }),

  delete: (id: string) =>
    apiFetch(`/quotations/${id}`, {
      method: "DELETE",
    }),

  // Get size multipliers for fillings by recipe ID
  getFillingMultipliers: (recipeId: string) => apiFetch<Array<{ id: string, recipeId: string, size: string, multiplier: number }>>(`/quotations/filling-multipliers/${recipeId}`, { method: "GET" }),

  // Get size multipliers for coverings by recipe ID
  getCoveringMultipliers: (recipeId: string) => apiFetch<Array<{ id: string, recipeId: string, size: string, multiplier: number }>>(`/quotations/covering-multipliers/${recipeId}`, { method: "GET" }),

  // Get size multipliers for cakes by recipe ID
  getCakeMultipliers: (recipeId: string) => apiFetch<Array<{ id: string, recipeId: string, size: string, multiplier: number }>>(`/quotations/cake-multipliers/${recipeId}`, { method: "GET" }),

  // Save size multipliers for fillings
  saveFillingMultipliers: (recipeId: string, multipliers: Array<{ size: string, multiplier: number }>) =>
    apiFetch("/quotations/filling-multipliers", {
      method: "POST",
      body: JSON.stringify({ recipeId, multipliers }),
    }),

  // Save size multipliers for coverings
  saveCoveringMultipliers: (recipeId: string, multipliers: Array<{ size: string, multiplier: number }>) =>
    apiFetch("/quotations/covering-multipliers", {
      method: "POST",
      body: JSON.stringify({ recipeId, multipliers }),
    }),

  // Save size multipliers for cakes
  saveCakeMultipliers: (recipeId: string, multipliers: Array<{ size: string, multiplier: number }>) =>
    apiFetch("/quotations/cake-multipliers", {
      method: "POST",
      body: JSON.stringify({ recipeId, multipliers }),
    }),
};

// Organizations API
export const organizationsApi = {
  // Add member by email
  addMemberByEmail: async (organizationId: string, email: string, role: string) => {
    return apiFetch(`/organizations/${organizationId}/members/by-email`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
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
};
