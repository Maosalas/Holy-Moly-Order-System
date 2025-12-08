import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { useOrganization } from "@/contexts/OrganizationContext";
import { 
  RevenueAnalytics, 
  OrdersAnalytics, 
  CustomersAnalytics, 
  ProductsAnalytics, 
  IngredientsAnalytics,
  AnalyticsSummary 
} from "@/types/analytics";

interface UseAnalyticsOptions {
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

export function useAnalyticsSummary(options: UseAnalyticsOptions = {}) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['analytics', 'summary', organizationId, options],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await analyticsApi.getSummary(organizationId, options);
      if (result.error) throw new Error(result.error);
      return result.data as AnalyticsSummary;
    },
    enabled: !!organizationId,
  });
}

export function useRevenueAnalytics(options: UseAnalyticsOptions = {}) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['analytics', 'revenue', organizationId, options],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await analyticsApi.getRevenue(organizationId, options);
      if (result.error) throw new Error(result.error);
      return result.data as RevenueAnalytics;
    },
    enabled: !!organizationId,
  });
}

export function useOrdersAnalytics(options: UseAnalyticsOptions = {}) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['analytics', 'orders', organizationId, options],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await analyticsApi.getOrders(organizationId, options);
      if (result.error) throw new Error(result.error);
      return result.data as OrdersAnalytics;
    },
    enabled: !!organizationId,
  });
}

export function useCustomersAnalytics(options: UseAnalyticsOptions = {}) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['analytics', 'customers', organizationId, options],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await analyticsApi.getCustomers(organizationId, options);
      if (result.error) throw new Error(result.error);
      return result.data as CustomersAnalytics;
    },
    enabled: !!organizationId,
  });
}

export function useProductsAnalytics(options: UseAnalyticsOptions = {}) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['analytics', 'products', organizationId, options],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await analyticsApi.getProducts(organizationId, options);
      if (result.error) throw new Error(result.error);
      return result.data as ProductsAnalytics;
    },
    enabled: !!organizationId,
  });
}

export function useIngredientsAnalytics(options: UseAnalyticsOptions = {}) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['analytics', 'ingredients', organizationId, options],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await analyticsApi.getIngredients(organizationId, options);
      if (result.error) throw new Error(result.error);
      return result.data as IngredientsAnalytics;
    },
    enabled: !!organizationId,
  });
}
