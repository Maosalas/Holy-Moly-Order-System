-- ============================================
-- USER ROLES SYSTEM
-- ============================================

-- Create enum for roles
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('super_admin', 'admin', 'member');

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, role, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON public.user_roles(organization_id);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
    NULL
  )
$$;

-- ============================================
-- SUBSCRIPTION PLANS TABLE AND POLICIES
-- ============================================

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  max_orders_per_month INTEGER,
  max_users INTEGER,
  max_storage_gb INTEGER,
  features JSONB DEFAULT '{}'::jsonb,
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON public.subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(active);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans

-- Anyone can view active subscription plans (for pricing page)
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans
  FOR SELECT
  USING (active = true);

-- Super admins can view all plans (including inactive)
CREATE POLICY "Super admins can view all subscription plans"
  ON public.subscription_plans
  FOR SELECT
  USING (public.has_role(public.current_user_id(), 'super_admin'));

-- Super admins can create subscription plans
CREATE POLICY "Super admins can create subscription plans"
  ON public.subscription_plans
  FOR INSERT
  WITH CHECK (public.has_role(public.current_user_id(), 'super_admin'));

-- Super admins can update subscription plans
CREATE POLICY "Super admins can update subscription plans"
  ON public.subscription_plans
  FOR UPDATE
  USING (public.has_role(public.current_user_id(), 'super_admin'));

-- Super admins can delete subscription plans (soft delete by setting active = false)
CREATE POLICY "Super admins can delete subscription plans"
  ON public.subscription_plans
  FOR DELETE
  USING (public.has_role(public.current_user_id(), 'super_admin'));

-- ============================================
-- DEFAULT SUBSCRIPTION PLANS
-- ============================================

-- Insert default subscription plans (only if they don't exist)
INSERT INTO public.subscription_plans (name, slug, price_monthly, price_yearly, max_orders_per_month, max_users, max_storage_gb, features, active)
VALUES
  (
    'Free',
    'free',
    0.00,
    0.00,
    10,
    1,
    1,
    '{"support": "community", "custom_branding": false, "api_access": false}'::jsonb,
    true
  ),
  (
    'Starter',
    'starter',
    29.99,
    299.90,
    50,
    3,
    5,
    '{"support": "email", "priority": false, "custom_branding": false, "api_access": false}'::jsonb,
    true
  ),
  (
    'Professional',
    'professional',
    79.99,
    799.90,
    200,
    10,
    20,
    '{"support": "priority", "custom_branding": true, "api_access": false, "advanced_analytics": false}'::jsonb,
    true
  ),
  (
    'Enterprise',
    'enterprise',
    199.99,
    1999.90,
    -1, -- -1 means unlimited
    -1, -- -1 means unlimited
    100,
    '{"support": "dedicated", "custom_branding": true, "api_access": true, "advanced_analytics": true, "white_label": false}'::jsonb,
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_subscription_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trigger_update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_plans_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if organization exceeds plan limits
CREATE OR REPLACE FUNCTION public.check_organization_plan_limits(
  _org_id UUID,
  _limit_type TEXT -- 'orders', 'users', 'storage'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_plan RECORD;
  v_current_usage INTEGER;
  v_max_allowed INTEGER;
  v_result JSONB;
BEGIN
  -- Get organization's current plan
  SELECT 
    sp.max_orders_per_month,
    sp.max_users,
    sp.max_storage_gb
  INTO v_current_plan
  FROM public.organizations o
  JOIN public.subscription_plans sp ON o.subscription_plan = sp.slug
  WHERE o.id = _org_id;

  -- Get current usage based on limit type
  IF _limit_type = 'orders' THEN
    SELECT COUNT(*) INTO v_current_usage
    FROM public.orders
    WHERE organization_id = _org_id
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());
    v_max_allowed := v_current_plan.max_orders_per_month;
    
  ELSIF _limit_type = 'users' THEN
    SELECT COUNT(*) INTO v_current_usage
    FROM public.organization_members
    WHERE organization_id = _org_id;
    v_max_allowed := v_current_plan.max_users;
    
  ELSIF _limit_type = 'storage' THEN
    -- Storage calculation would need to be implemented based on actual storage usage
    v_current_usage := 0; -- Placeholder
    v_max_allowed := v_current_plan.max_storage_gb;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'limit_type', _limit_type,
    'current_usage', v_current_usage,
    'max_allowed', v_max_allowed,
    'is_unlimited', (v_max_allowed = -1),
    'is_exceeded', (v_max_allowed != -1 AND v_current_usage >= v_max_allowed),
    'percentage_used', CASE 
      WHEN v_max_allowed = -1 THEN 0 
      ELSE (v_current_usage::FLOAT / v_max_allowed * 100)::INTEGER 
    END
  );

  RETURN v_result;
END;
$$;

-- Function to get organization's plan features
CREATE OR REPLACE FUNCTION public.get_organization_plan_features(_org_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.features
  FROM public.organizations o
  JOIN public.subscription_plans sp ON o.subscription_plan = sp.slug
  WHERE o.id = _org_id;
$$;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.subscription_plans IS 'Subscription plan configurations with pricing and limits';
COMMENT ON COLUMN public.subscription_plans.max_orders_per_month IS 'Maximum orders allowed per month (-1 for unlimited)';
COMMENT ON COLUMN public.subscription_plans.max_users IS 'Maximum users/members allowed (-1 for unlimited)';
COMMENT ON COLUMN public.subscription_plans.max_storage_gb IS 'Maximum storage in GB';
COMMENT ON COLUMN public.subscription_plans.features IS 'JSONB object containing plan features';
COMMENT ON FUNCTION public.check_organization_plan_limits IS 'Check if organization is within plan limits for orders, users, or storage';
COMMENT ON FUNCTION public.get_organization_plan_features IS 'Get plan features for an organization';
