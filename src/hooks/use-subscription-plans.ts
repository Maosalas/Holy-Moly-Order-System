import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { subscriptionPlansApi } from "@/lib/api";
import { SubscriptionPlanDetails } from "@/types/subscription";

export function useSubscriptionPlans(activeOnly: boolean = true) {
  const [plans, setPlans] = useState<SubscriptionPlanDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = async () => {
    setIsLoading(true);
    const result = await subscriptionPlansApi.getAll(activeOnly);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Transform snake_case to camelCase and parse numeric strings
    const transformedPlans = (result.data as any[])?.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      priceMonthly: parseFloat(plan.priceMonthly || plan.price_monthly || "0"),
      priceYearly: parseFloat(plan.priceYearly || plan.price_yearly || "0"),
      maxOrdersPerMonth: plan.maxOrdersPerMonth || plan.max_orders_per_month,
      maxUsers: plan.maxUsers || plan.max_users,
      maxStorageGb: plan.maxStorageGb || plan.max_storage_gb,
      features: plan.features || {},
      stripePriceId: plan.stripePriceId || plan.stripe_price_id,
      active: plan.active,
      createdAt: new Date(plan.createdAt || plan.created_at),
      updatedAt: plan.updatedAt || plan.updated_at ? new Date(plan.updatedAt || plan.updated_at) : undefined,
    })) || [];

    setPlans(transformedPlans);
    setIsLoading(false);
  };

  const createPlan = async (data: any) => {
    const result = await subscriptionPlansApi.create(data);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return { success: false };
    }

    toast({
      title: "Success",
      description: "Subscription plan created successfully",
    });

    await fetchPlans();
    return { success: true };
  };

  const updatePlan = async (id: string, data: any) => {
    const result = await subscriptionPlansApi.update(id, data);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return { success: false };
    }

    toast({
      title: "Success",
      description: "Subscription plan updated successfully",
    });

    await fetchPlans();
    return { success: true };
  };

  const deletePlan = async (id: string) => {
    const result = await subscriptionPlansApi.delete(id);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return { success: false };
    }

    toast({
      title: "Success",
      description: "Subscription plan deleted successfully",
    });

    await fetchPlans();
    return { success: true };
  };

  useEffect(() => {
    fetchPlans();
  }, [activeOnly]);

  return {
    plans,
    isLoading,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
  };
}
