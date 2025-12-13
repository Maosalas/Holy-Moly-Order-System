// Analytics Types

export interface AnalyticsPeriodData {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  growthRate: number;
  periodData: AnalyticsPeriodData[];
}

export interface OrderStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface WeeklyTrendData {
  date: string;
  count: number;
  revenue: number;
}

export interface OrdersAnalytics {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  canceledOrders: number;
  averageOrderValue: number;
  statusBreakdown: OrderStatusBreakdown[];
  weeklyTrend: WeeklyTrendData[];
}

export interface TopCustomer {
  clientName: string;
  clientPhone: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface CustomersAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
  topCustomers: TopCustomer[];
}

export interface TopProduct {
  recipeId: string;
  recipeName: string;
  totalSold: number;
  totalRevenue: number;
}

export interface SalesByType {
  recipeType: string;
  count: number;
  revenue: number;
}

export interface ProductsAnalytics {
  totalRecipesSold: number;
  topProducts: TopProduct[];
  salesByType: SalesByType[];
}

export interface TopIngredient {
  ingredientId: string;
  ingredientName: string;
  totalUsed: number;
  unit: string;
  timesUsed: number;
  estimatedCost: number;
}

export interface IngredientsAnalytics {
  totalIngredientsUsed: number;
  totalEstimatedCost: number;
  topIngredients: TopIngredient[];
}

export interface AnalyticsSummary {
  revenue: {
    total: number;
    growth: number;
    averageOrderValue: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    growth: number;
  };
  customers: {
    total: number;
    new: number;
    retention: number;
  };
  products: {
    totalSold: number;
    topSelling: string;
  };
  expenses: {
    total: number;
    growth: number;
    count: number;
    averageExpense: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface AnalyticsQueryParams {
  organization_id: string;
  start_date?: string;
  end_date?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}
