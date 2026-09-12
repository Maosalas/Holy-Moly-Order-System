/**
 * Métricas calculadas directamente desde Lovable Cloud (Supabase).
 */
import { supabase } from "@/lib/supabaseClient";
import {
  RevenueAnalytics,
  OrdersAnalytics,
  CustomersAnalytics,
  ProductsAnalytics,
  IngredientsAnalytics,
  AnalyticsSummary,
} from "@/types/analytics";

type Result<T> = { data?: T; error?: string };

interface AnalyticsOptions {
  startDate?: string;
  endDate?: string;
  period?: "daily" | "weekly" | "monthly";
}

const FINISHED = ["finished", "payment_received", "confirmed"];

const lastStatus = (statuses: any): string => {
  const arr = Array.isArray(statuses) ? statuses : [];
  if (arr.length === 0) return "waiting_for_payment";
  const last = arr[arr.length - 1];
  return typeof last === "string" ? last : last?.status || "waiting_for_payment";
};

function range(options: AnalyticsOptions) {
  const end = options.endDate ? new Date(options.endDate) : new Date();
  const start = options.startDate
    ? new Date(options.startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { start, end };
}

async function fetchOrders(orgId: string, start: Date, end: Date) {
  const res = await supabase
    .from("orders")
    .select("*")
    .eq("organization_id", orgId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });
  if (res.error) throw new Error(res.error.message);
  return res.data || [];
}

async function fetchPreviousRevenue(orgId: string, start: Date, end: Date) {
  const span = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - span);
  const res = await supabase
    .from("orders")
    .select("charge_amount")
    .eq("organization_id", orgId)
    .gte("created_at", prevStart.toISOString())
    .lt("created_at", start.toISOString());
  if (res.error) return { revenue: 0, count: 0 };
  const rows = res.data || [];
  return {
    revenue: rows.reduce((sum: number, o: any) => sum + Number(o.charge_amount || 0), 0),
    count: rows.length,
  };
}

const growth = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

const dayKey = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

export const analyticsApi = {
  getRevenue: async (
    organizationId: string,
    options: AnalyticsOptions = {}
  ): Promise<Result<RevenueAnalytics>> => {
    try {
      const { start, end } = range(options);
      const orders = await fetchOrders(organizationId, start, end);
      const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.charge_amount || 0), 0);
      const prev = await fetchPreviousRevenue(organizationId, start, end);

      const buckets = new Map<string, { revenue: number; orderCount: number }>();
      orders.forEach((o: any) => {
        const key = dayKey(o.created_at);
        const b = buckets.get(key) || { revenue: 0, orderCount: 0 };
        b.revenue += Number(o.charge_amount || 0);
        b.orderCount += 1;
        buckets.set(key, b);
      });

      return {
        data: {
          totalRevenue,
          totalOrders: orders.length,
          averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
          growthRate: growth(totalRevenue, prev.revenue),
          periodData: Array.from(buckets.entries()).map(([date, b]) => ({ date, ...b })),
        },
      };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  getOrders: async (
    organizationId: string,
    options: AnalyticsOptions = {}
  ): Promise<Result<OrdersAnalytics>> => {
    try {
      const { start, end } = range(options);
      const orders = await fetchOrders(organizationId, start, end);
      const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.charge_amount || 0), 0);

      const counts = new Map<string, number>();
      orders.forEach((o: any) => {
        const st = lastStatus(o.statuses);
        counts.set(st, (counts.get(st) || 0) + 1);
      });

      const completed = orders.filter((o: any) => lastStatus(o.statuses) === "finished").length;
      const pending = orders.filter((o: any) => !FINISHED.includes(lastStatus(o.statuses))).length;

      const weekly = new Map<string, { count: number; revenue: number }>();
      orders.forEach((o: any) => {
        const key = dayKey(o.created_at);
        const b = weekly.get(key) || { count: 0, revenue: 0 };
        b.count += 1;
        b.revenue += Number(o.charge_amount || 0);
        weekly.set(key, b);
      });

      return {
        data: {
          totalOrders: orders.length,
          pendingOrders: pending,
          completedOrders: completed,
          canceledOrders: 0,
          averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
          statusBreakdown: Array.from(counts.entries()).map(([status, count]) => ({
            status,
            count,
            percentage: orders.length ? (count / orders.length) * 100 : 0,
          })),
          weeklyTrend: Array.from(weekly.entries()).map(([date, b]) => ({ date, ...b })),
        },
      };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  getCustomers: async (
    organizationId: string,
    options: AnalyticsOptions = {}
  ): Promise<Result<CustomersAnalytics>> => {
    try {
      const { start, end } = range(options);
      const orders = await fetchOrders(organizationId, start, end);

      const byClient = new Map<string, { phone: string; orders: number; revenue: number }>();
      orders.forEach((o: any) => {
        const key = (o.client_name || "Sin nombre").trim().toLowerCase();
        const c = byClient.get(key) || { phone: o.phone_number || "", orders: 0, revenue: 0 };
        c.orders += 1;
        c.revenue += Number(o.charge_amount || 0);
        byClient.set(key, c);
      });

      const returning = Array.from(byClient.values()).filter((c) => c.orders > 1).length;
      const total = byClient.size;

      const topCustomers = Array.from(byClient.entries())
        .map(([name, c]) => ({
          clientName: name.replace(/\b\w/g, (m) => m.toUpperCase()),
          clientPhone: c.phone,
          totalOrders: c.orders,
          totalRevenue: c.revenue,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      return {
        data: {
          totalCustomers: total,
          newCustomers: total - returning,
          returningCustomers: returning,
          retentionRate: total ? (returning / total) * 100 : 0,
          topCustomers,
        },
      };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  getProducts: async (
    organizationId: string,
    options: AnalyticsOptions = {}
  ): Promise<Result<ProductsAnalytics>> => {
    try {
      const { start, end } = range(options);
      const res = await supabase
        .from("quotations")
        .select("recipes, total_cost, selling_price, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (res.error) throw new Error(res.error.message);

      const byRecipe = new Map<string, { name: string; sold: number; revenue: number }>();
      const byType = new Map<string, { count: number; revenue: number }>();
      let totalSold = 0;

      (res.data || []).forEach((q: any) => {
        (Array.isArray(q.recipes) ? q.recipes : []).forEach((r: any) => {
          const qty = Number(r.quantity || 1);
          const revenue = Number(r.totalCost || 0);
          totalSold += qty;

          const key = r.recipeId || r.recipeName || "sin-id";
          const item = byRecipe.get(key) || { name: r.recipeName || "Sin nombre", sold: 0, revenue: 0 };
          item.sold += qty;
          item.revenue += revenue;
          byRecipe.set(key, item);

          const typeName = r.recipeType?.name || r.recipeType || "Otro";
          const t = byType.get(typeName) || { count: 0, revenue: 0 };
          t.count += qty;
          t.revenue += revenue;
          byType.set(typeName, t);
        });
      });

      return {
        data: {
          totalRecipesSold: totalSold,
          topProducts: Array.from(byRecipe.entries())
            .map(([recipeId, v]) => ({
              recipeId,
              recipeName: v.name,
              totalSold: v.sold,
              totalRevenue: v.revenue,
            }))
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 10),
          salesByType: Array.from(byType.entries()).map(([recipeType, v]) => ({
            recipeType,
            count: v.count,
            revenue: v.revenue,
          })),
        },
      };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  getIngredients: async (
    organizationId: string,
    options: AnalyticsOptions = {}
  ): Promise<Result<IngredientsAnalytics>> => {
    try {
      const { start, end } = range(options);
      const res = await supabase
        .from("quotation_items")
        .select("composition, created_at, quotations!inner(organization_id)")
        .eq("quotations.organization_id", organizationId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (res.error) throw new Error(res.error.message);

      const map = new Map<
        string,
        { name: string; unit: string; used: number; times: number; cost: number }
      >();

      const add = (ing: any) => {
        if (!ing) return;
        const key = ing.ingredientId || ing.ingredient_id || ing.ingredientName || ing.name;
        if (!key) return;
        const entry = map.get(key) || {
          name: ing.ingredientName || ing.name || "Sin nombre",
          unit: ing.units || ing.unit || ing.unit_code || "",
          used: 0,
          times: 0,
          cost: 0,
        };
        entry.used += Number(ing.quantity ?? ing.qty ?? ing.base_qty ?? 0);
        entry.times += 1;
        entry.cost += Number(ing.totalCost ?? ing.cost ?? ing.line_cost ?? 0);
        map.set(key, entry);
      };

      (res.data || []).forEach((item: any) => {
        const comp = item?.composition;
        const list = Array.isArray(comp)
          ? comp
          : Array.isArray(comp?.ingredients)
            ? comp.ingredients
            : Array.isArray(comp?.components)
              ? comp.components
              : [];
        list.forEach(add);
      });

      const topIngredients = Array.from(map.entries())
        .map(([ingredientId, v]) => ({
          ingredientId,
          ingredientName: v.name,
          totalUsed: v.used,
          unit: v.unit,
          timesUsed: v.times,
          estimatedCost: v.cost,
        }))
        .sort((a, b) => b.estimatedCost - a.estimatedCost)
        .slice(0, 10);

      return {
        data: {
          totalIngredientsUsed: map.size,
          totalEstimatedCost: topIngredients.reduce((s, i) => s + i.estimatedCost, 0),
          topIngredients,
        },
      };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  getSummary: async (
    organizationId: string,
    options: AnalyticsOptions = {}
  ): Promise<Result<AnalyticsSummary>> => {
    try {
      const { start, end } = range(options);
      const [revenue, orders, customers, products] = await Promise.all([
        analyticsApi.getRevenue(organizationId, options),
        analyticsApi.getOrders(organizationId, options),
        analyticsApi.getCustomers(organizationId, options),
        analyticsApi.getProducts(organizationId, options),
      ]);

      const expensesRes = await supabase
        .from("expenses")
        .select("amount, purchase_date")
        .eq("organization_id", organizationId)
        .gte("purchase_date", start.toISOString().slice(0, 10))
        .lte("purchase_date", end.toISOString().slice(0, 10));
      const expenses = expensesRes.data || [];
      const expensesTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

      const prev = await fetchPreviousRevenue(organizationId, start, end);

      return {
        data: {
          revenue: {
            total: revenue.data?.totalRevenue || 0,
            growth: revenue.data?.growthRate || 0,
            averageOrderValue: revenue.data?.averageOrderValue || 0,
          },
          orders: {
            total: orders.data?.totalOrders || 0,
            pending: orders.data?.pendingOrders || 0,
            completed: orders.data?.completedOrders || 0,
            growth: growth(orders.data?.totalOrders || 0, prev.count),
          },
          customers: {
            total: customers.data?.totalCustomers || 0,
            new: customers.data?.newCustomers || 0,
            retention: customers.data?.retentionRate || 0,
          },
          products: {
            totalSold: products.data?.totalRecipesSold || 0,
            topSelling: products.data?.topProducts?.[0]?.recipeName || "—",
          },
          expenses: {
            total: expensesTotal,
            growth: 0,
            count: expenses.length,
            averageExpense: expenses.length ? expensesTotal / expenses.length : 0,
          },
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
        },
      };
    } catch (e: any) {
      return { error: e.message };
    }
  },
};
