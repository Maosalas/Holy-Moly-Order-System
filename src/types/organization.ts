export type OrganizationRole = "owner" | "admin" | "staff" | "viewer";

export type SubscriptionPlan = "free" | "starter" | "professional" | "enterprise";

export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled" | "incomplete";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStripeCustomerId?: string;
  subscriptionStripeSubscriptionId?: string;
  trialEndsAt?: Date;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  joinedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface OrganizationWithRole extends Organization {
  userRole: OrganizationRole;
}

export type OrganizationFormData = Pick<Organization, 'name' | 'slug' | 'logoUrl'>;
