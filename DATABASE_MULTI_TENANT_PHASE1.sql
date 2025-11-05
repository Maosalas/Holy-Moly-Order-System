-- ============================================
-- FASE 1: MULTI-TENANT DATABASE SCHEMA
-- Sistema de Gestión de Panadería - Holy Moly
-- ============================================

-- ============================================
-- STEP 1: CREATE ENUMS
-- ============================================

-- Organization roles for members
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'staff', 'viewer');

-- Global user roles
CREATE TYPE app_role AS ENUM ('super_admin', 'owner', 'cake_topper_provider');

-- ============================================
-- STEP 2: CREATE ORGANIZATIONS TABLE
-- ============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  subscription_status VARCHAR(50) DEFAULT 'trial' NOT NULL,
  subscription_plan VARCHAR(50) DEFAULT 'free' NOT NULL,
  subscription_stripe_customer_id VARCHAR(255),
  subscription_stripe_subscription_id VARCHAR(255),
  trial_ends_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe_customer ON organizations(subscription_stripe_customer_id);

-- ============================================
-- STEP 3: CREATE ORGANIZATION MEMBERS TABLE
-- ============================================

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role organization_role NOT NULL DEFAULT 'staff',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);

-- ============================================
-- STEP 4: CREATE USER ROLES TABLE (Global Roles)
-- ============================================

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- ============================================
-- STEP 5: CREATE SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function to check if user has a specific global role
CREATE OR REPLACE FUNCTION public.has_global_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Function to check if user has a specific organization role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role organization_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
  )
$$;

-- Function to check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION public.get_user_organizations(_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name VARCHAR(255),
  organization_slug VARCHAR(255),
  user_role organization_role
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id,
    o.name,
    o.slug,
    om.role
  FROM public.organizations o
  INNER JOIN public.organization_members om ON o.id = om.organization_id
  WHERE om.user_id = _user_id
$$;

-- ============================================
-- STEP 6: ADD organization_id TO EXISTING TABLES
-- ============================================

-- Add organization_id to ingredients table
ALTER TABLE ingredients 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_ingredients_organization_id ON ingredients(organization_id);
CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);

-- Add organization_id to recipes table  
ALTER TABLE recipes 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_recipes_organization_id ON recipes(organization_id);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);

-- Add organization_id to supplies table
ALTER TABLE supplies 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_supplies_organization_id ON supplies(organization_id);
CREATE INDEX idx_supplies_user_id ON supplies(user_id);

-- Add organization_id to orders table
ALTER TABLE orders 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_organization_id ON orders(organization_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Add organization_id to quotations table
ALTER TABLE quotations 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_quotations_organization_id ON quotations(organization_id);
CREATE INDEX idx_quotations_user_id ON quotations(user_id);

-- Add organization_id to expenses table
ALTER TABLE expenses 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);

-- ============================================
-- STEP 7: ENABLE ROW LEVEL SECURITY ON ORGANIZATIONS
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can see organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

-- Organization owners/admins can update their organization
CREATE POLICY "Owners and admins can update organization"
  ON organizations FOR UPDATE
  USING (
    public.has_org_role(auth.uid(), id, 'owner') OR
    public.has_org_role(auth.uid(), id, 'admin')
  );

-- Super admins can view all organizations
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  USING (public.has_global_role(auth.uid(), 'super_admin'));

-- Users can create organizations (signup creates first org)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 8: ENABLE ROW LEVEL SECURITY ON ORGANIZATION MEMBERS
-- ============================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of their organizations
CREATE POLICY "Users can view organization members"
  ON organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Owners and admins can manage members
CREATE POLICY "Owners and admins can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

CREATE POLICY "Owners and admins can update members"
  ON organization_members FOR UPDATE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

CREATE POLICY "Owners and admins can delete members"
  ON organization_members FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- ============================================
-- STEP 9: UPDATE RLS POLICIES FOR EXISTING TABLES
-- ============================================

-- INGREDIENTS RLS
DROP POLICY IF EXISTS "Users can view their ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can insert ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can update ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can delete ingredients" ON ingredients;

CREATE POLICY "Organization members can view ingredients"
  ON ingredients FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can insert ingredients"
  ON ingredients FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update ingredients"
  ON ingredients FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can delete ingredients"
  ON ingredients FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- RECIPES RLS
DROP POLICY IF EXISTS "Users can view their recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete recipes" ON recipes;

CREATE POLICY "Organization members can view recipes"
  ON recipes FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can insert recipes"
  ON recipes FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update recipes"
  ON recipes FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can delete recipes"
  ON recipes FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- SUPPLIES RLS
DROP POLICY IF EXISTS "Users can view their supplies" ON supplies;
DROP POLICY IF EXISTS "Users can insert supplies" ON supplies;
DROP POLICY IF EXISTS "Users can update supplies" ON supplies;
DROP POLICY IF EXISTS "Users can delete supplies" ON supplies;

CREATE POLICY "Organization members can view supplies"
  ON supplies FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can insert supplies"
  ON supplies FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update supplies"
  ON supplies FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can delete supplies"
  ON supplies FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- ORDERS RLS
DROP POLICY IF EXISTS "Users can view their orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Users can delete orders" ON orders;

CREATE POLICY "Organization members can view orders"
  ON orders FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can insert orders"
  ON orders FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update orders"
  ON orders FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can delete orders"
  ON orders FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- QUOTATIONS RLS
DROP POLICY IF EXISTS "Users can view their quotations" ON quotations;
DROP POLICY IF EXISTS "Users can insert quotations" ON quotations;
DROP POLICY IF EXISTS "Users can update quotations" ON quotations;
DROP POLICY IF EXISTS "Users can delete quotations" ON quotations;

CREATE POLICY "Organization members can view quotations"
  ON quotations FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can insert quotations"
  ON quotations FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update quotations"
  ON quotations FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can delete quotations"
  ON quotations FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- EXPENSES RLS
DROP POLICY IF EXISTS "Users can view their expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses" ON expenses;

CREATE POLICY "Organization members can view expenses"
  ON expenses FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can insert expenses"
  ON expenses FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update expenses"
  ON expenses FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can delete expenses"
  ON expenses FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- ============================================
-- STEP 10: CREATE TRIGGER TO AUTO-ADD OWNER TO ORGANIZATION
-- ============================================

-- Function to automatically add creator as owner of organization
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add the creator as owner of the organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  
  RETURN NEW;
END;
$$;

-- Trigger to execute the function after organization creation
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- ============================================
-- NOTES FOR IMPLEMENTATION:
-- ============================================

/*
1. BEFORE running this SQL, make sure you have Lovable Cloud (Supabase) enabled.

2. The organization_id columns are initially NULLABLE to allow existing data migration.
   After migrating existing data to organizations, you should make them NOT NULL:
   
   ALTER TABLE ingredients ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE recipes ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE supplies ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE orders ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE quotations ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE expenses ALTER COLUMN organization_id SET NOT NULL;

3. MIGRATION STEPS FOR EXISTING DATA:
   a. Create a default organization for existing users
   b. Update all existing records to link to that organization
   c. Add users to organization_members with appropriate roles
   d. Make organization_id NOT NULL (as shown above)

4. The user_id field tracks who created/modified each record for audit purposes.

5. RLS policies ensure:
   - Users can only see data from organizations they belong to
   - Only owners/admins can delete records
   - All members can create and update records
   - Super admins can see all organizations (for support)

6. The trigger automatically adds the creator as an owner when a new organization is created.
*/
