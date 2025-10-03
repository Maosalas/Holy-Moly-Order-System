const API_BASE_URL = "http://localhost:3000/api";

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

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
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
      return { error: data.error || "An error occurred" };
    }

    return { data };
  } catch (error) {
    return { error: "Network error" };
  }
}

// Auth API
export const authApi = {
  signup: (email: string, password: string, name: string, role: "owner" | "cake_topper_provider") =>
    apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role }),
    }),

  login: (email: string, password: string) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiFetch("/auth/logout", {
      method: "POST",
    }),

  getCurrentUser: () => apiFetch("/auth/me", { method: "GET" }),
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
  getAll: () => apiFetch("/recipes", { method: "GET" }),
  
  create: (recipe: any) =>
    apiFetch("/recipes", {
      method: "POST",
      body: JSON.stringify(recipe),
    }),

  update: (id: string, recipe: any) =>
    apiFetch(`/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify(recipe),
    }),

  delete: (id: string) =>
    apiFetch(`/recipes/${id}`, {
      method: "DELETE",
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

  delete: (id: string) =>
    apiFetch(`/orders/${id}`, {
      method: "DELETE",
    }),
};

// Expenses API
export const expensesApi = {
  getAll: () => apiFetch("/expenses", { method: "GET" }),
  
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
