-- =====================================================
-- HOLY MOLY SAAS MULTI-TENANT DATABASE ARCHITECTURE
-- =====================================================

-- 1. ENUM TYPES
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid');
CREATE TYPE public.billing_interval AS ENUM ('monthly', 'yearly');

-- 2. PROFILES TABLE (linked to auth.users)
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 4. ORGANIZATION MEMBERSHIPS TABLE
-- =====================================================
CREATE TABLE public.organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- 5. SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_orders_per_month INTEGER NOT NULL DEFAULT 50,
    max_users INTEGER NOT NULL DEFAULT 1,
    max_storage_gb INTEGER NOT NULL DEFAULT 1,
    features JSONB NOT NULL DEFAULT '{}',
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 6. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status public.subscription_status NOT NULL DEFAULT 'incomplete',
    billing_interval public.billing_interval NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. HELPER FUNCTIONS (SECURITY DEFINER)
-- =====================================================

-- Get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_organization_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(array_agg(organization_id), '{}')
    FROM public.organization_memberships
    WHERE user_id = _user_id
$$;

-- Check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_organization_member(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_memberships
        WHERE organization_id = _org_id
          AND user_id = _user_id
    )
$$;

-- Check if user is admin/owner of organization
CREATE OR REPLACE FUNCTION public.is_organization_admin(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_memberships
        WHERE organization_id = _org_id
          AND user_id = _user_id
          AND role IN ('admin', 'owner')
    )
$$;

-- Check if user is owner of organization
CREATE OR REPLACE FUNCTION public.is_organization_owner(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_memberships
        WHERE organization_id = _org_id
          AND user_id = _user_id
          AND role = 'owner'
    )
$$;

-- Get organization's current plan
CREATE OR REPLACE FUNCTION public.get_organization_plan(_org_id UUID)
RETURNS public.subscription_plans
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p.*
    FROM public.subscription_plans p
    INNER JOIN public.subscriptions s ON s.plan_id = p.id
    WHERE s.organization_id = _org_id
      AND s.status IN ('active', 'trialing')
    LIMIT 1
$$;

-- Check plan limit
CREATE OR REPLACE FUNCTION public.check_plan_limit(_org_id UUID, _limit_type TEXT, _current_value BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    plan_record public.subscription_plans;
    max_value INTEGER;
BEGIN
    SELECT * INTO plan_record FROM public.get_organization_plan(_org_id);
    
    IF plan_record IS NULL THEN
        RETURN false;
    END IF;
    
    CASE _limit_type
        WHEN 'orders' THEN max_value := plan_record.max_orders_per_month;
        WHEN 'users' THEN max_value := plan_record.max_users;
        WHEN 'storage' THEN max_value := plan_record.max_storage_gb;
        ELSE RETURN false;
    END CASE;
    
    -- -1 means unlimited
    IF max_value = -1 THEN
        RETURN true;
    END IF;
    
    RETURN _current_value < max_value;
END;
$$;

-- 9. RLS POLICIES
-- =====================================================

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same org"
    ON public.profiles FOR SELECT
    USING (
        id IN (
            SELECT om.user_id 
            FROM public.organization_memberships om
            WHERE om.organization_id = ANY(public.get_user_organization_ids(auth.uid()))
        )
    );

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- ORGANIZATIONS POLICIES
CREATE POLICY "Members can view their organizations"
    ON public.organizations FOR SELECT
    USING (id = ANY(public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can update their organizations"
    ON public.organizations FOR UPDATE
    USING (public.is_organization_admin(id, auth.uid()))
    WITH CHECK (public.is_organization_admin(id, auth.uid()));

CREATE POLICY "Owners can delete their organizations"
    ON public.organizations FOR DELETE
    USING (public.is_organization_owner(id, auth.uid()));

-- ORGANIZATION MEMBERSHIPS POLICIES
CREATE POLICY "Members can view memberships in their orgs"
    ON public.organization_memberships FOR SELECT
    USING (organization_id = ANY(public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Admins can insert memberships"
    ON public.organization_memberships FOR INSERT
    WITH CHECK (
        public.is_organization_admin(organization_id, auth.uid())
        OR (user_id = auth.uid() AND NOT EXISTS (
            SELECT 1 FROM public.organization_memberships 
            WHERE organization_id = organization_memberships.organization_id
        ))
    );

CREATE POLICY "Admins can update memberships"
    ON public.organization_memberships FOR UPDATE
    USING (
        public.is_organization_admin(organization_id, auth.uid())
        AND user_id != auth.uid()
    )
    WITH CHECK (
        public.is_organization_admin(organization_id, auth.uid())
        AND user_id != auth.uid()
    );

CREATE POLICY "Admins can delete memberships"
    ON public.organization_memberships FOR DELETE
    USING (
        (public.is_organization_admin(organization_id, auth.uid()) AND user_id != auth.uid())
        OR user_id = auth.uid()
    );

-- SUBSCRIPTION PLANS POLICIES (public read)
CREATE POLICY "Anyone can view active plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = true);

-- SUBSCRIPTIONS POLICIES
CREATE POLICY "Members can view their org subscription"
    ON public.subscriptions FOR SELECT
    USING (organization_id = ANY(public.get_user_organization_ids(auth.uid())));

CREATE POLICY "System can insert subscriptions"
    ON public.subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_organization_admin(organization_id, auth.uid()));

CREATE POLICY "Admins can update their org subscription"
    ON public.subscriptions FOR UPDATE
    USING (public.is_organization_admin(organization_id, auth.uid()))
    WITH CHECK (public.is_organization_admin(organization_id, auth.uid()));

-- AUDIT LOGS POLICIES
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        organization_id = ANY(public.get_user_organization_ids(auth.uid()))
        AND public.is_organization_admin(organization_id, auth.uid())
    );

CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = ANY(public.get_user_organization_ids(auth.uid()))
    );

-- 10. TRIGGERS
-- =====================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_memberships_updated_at
    BEFORE UPDATE ON public.organization_memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. INDEXES
-- =====================================================
CREATE INDEX idx_organization_memberships_user_id ON public.organization_memberships(user_id);
CREATE INDEX idx_organization_memberships_org_id ON public.organization_memberships(organization_id);
CREATE INDEX idx_subscriptions_org_id ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_audit_logs_org_id ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 12. INSERT DEFAULT PLANS
-- =====================================================
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, max_orders_per_month, max_users, max_storage_gb, features, display_order)
VALUES 
    ('Free', 'free', 'Plan gratuito para comenzar', 0, 0, 10, 1, 1, '{"support": "community", "analytics": false, "api_access": false}', 1),
    ('Starter', 'starter', 'Ideal para pequeños negocios', 9.99, 99.99, 50, 3, 5, '{"support": "email", "analytics": true, "api_access": false}', 2),
    ('Professional', 'professional', 'Para negocios en crecimiento', 29.99, 299.99, 200, 10, 20, '{"support": "priority", "analytics": true, "api_access": true}', 3),
    ('Enterprise', 'enterprise', 'Solución empresarial completa', 99.99, 999.99, -1, -1, 100, '{"support": "dedicated", "analytics": true, "api_access": true, "custom_branding": true}', 4);