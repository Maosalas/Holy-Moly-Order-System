export type SubscriptionPlan = "free" | "starter" | "professional" | "enterprise";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled" | "incomplete";

export interface SubscriptionPlanDetails {
  id: string;
  name: string;
  slug: string; // Changed from SubscriptionPlan to allow any string
  priceMonthly: number;
  priceYearly: number;
  maxOrdersPerMonth: number;
  maxUsers: number;
  maxStorageGb: number;
  features: {
    support?: string;
    priority?: boolean;
    custom_branding?: boolean;
    api_access?: boolean;
    advanced_analytics?: boolean;
    white_label?: boolean;
    [key: string]: any;
  };
  stripePriceId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateSubscriptionPlanData {
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  maxOrdersPerMonth: number;
  maxUsers: number;
  maxStorageGb: number;
  features?: Record<string, any>;
  stripePriceId?: string;
  active?: boolean;
}

export interface UpdateSubscriptionPlanData {
  name?: string;
  priceMonthly?: number;
  priceYearly?: number;
  maxOrdersPerMonth?: number;
  maxUsers?: number;
  maxStorageGb?: number;
  features?: Record<string, any>;
  stripePriceId?: string;
  active?: boolean;
}

export interface OrganizationSubscriptionUpdate {
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  trialEndsAt?: Date | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface SuperAdminOrganizationCreateData {
  name: string;
  slug: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  trialDays?: number;
  ownerEmail?: string;
  members?: Array<{
    email: string;
    role: "owner" | "admin" | "staff" | "viewer";
  }>;
}

export interface ImpersonationToken {
  impersonationToken: string;
  organizationId: string;
  organizationName: string;
  expiresAt: Date;
  impersonatingAs: string;
}
