# Bakery Management System - Multi-Tenant SaaS API Specifications & Database Schema

## Database Schema

---

## FASE 1: MULTI-TENANT DATABASE SCHEMA

### Organizations Table

```sql
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
```

### Organization Members Table

```sql
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'staff', 'viewer');

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role organization_role NOT NULL DEFAULT 'staff',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
```

### Subscription Plans Configuration

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  max_orders_per_month INTEGER,
  max_users INTEGER,
  max_storage_gb INTEGER,
  features JSONB DEFAULT '{}',
  stripe_price_id VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Default subscription plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_orders_per_month, max_users, max_storage_gb, features) VALUES
  ('Free', 'free', 0, 0, 10, 1, 1, '{"support": "community"}'),
  ('Starter', 'starter', 29.99, 299.90, 50, 3, 5, '{"support": "email", "priority": false}'),
  ('Professional', 'professional', 79.99, 799.90, 200, 10, 20, '{"support": "priority", "custom_branding": true}'),
  ('Enterprise', 'enterprise', 199.99, 1999.90, -1, -1, 100, '{"support": "dedicated", "custom_branding": true, "api_access": true}');
```

---

## FASE 2: ROLE AND SECURITY SYSTEM

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User Roles Table (Global Roles)

```sql
CREATE TYPE app_role AS ENUM ('super_admin', 'owner', 'cake_topper_provider');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
```

### Security Definer Functions

```sql
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
```

### Row Level Security Policies

```sql
-- Organizations RLS
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

-- Organization Members RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of their organizations
CREATE POLICY "Users can view organization members"
  ON organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Owners and admins can manage members
CREATE POLICY "Owners and admins can manage members"
  ON organization_members FOR ALL
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );
```

### Ingredients Table (Multi-Tenant)

```sql
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  qty_provider DECIMAL(10,2) NOT NULL,
  units VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ingredients_organization_id ON ingredients(organization_id);
CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);

-- RLS for Ingredients
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

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
```

### Recipes Table (Multi-Tenant)

```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  image TEXT,
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  categories TEXT[] DEFAULT '{}',  -- Array of categories: 'queque', 'relleno', 'cubierta', 'unidad', 'otro'
  notes TEXT,
  url TEXT,
  units NUMERIC(10,0),
  unit_cost DECIMAL(10,2),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_recipes_organization_id ON recipes(organization_id);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);

-- RLS for Recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

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
```

### Recipe Elaborations Table

```sql
CREATE TABLE recipe_elaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipe_elaborations_recipe_id ON recipe_elaborations(recipe_id);
```

### Recipe Ingredients Table (Junction Table)

```sql
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  units VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  elaboration_id UUID REFERENCES recipe_elaborations(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID  -- LEGACY: nullable field for migration compatibility, will be removed
);

CREATE INDEX idx_recipe_ingredients_elaboration_id ON recipe_ingredients(elaboration_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);
```

**Note:** The `recipe_id` field is a legacy column maintained for backwards compatibility during migration. New implementations should only use `elaboration_id`.

### Supplies Table (Multi-Tenant)

```sql
CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_supplies_organization_id ON supplies(organization_id);
CREATE INDEX idx_supplies_user_id ON supplies(user_id);

-- RLS for Supplies
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;

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
```

### Payment Methods Table

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

-- Default payment methods
INSERT INTO payment_methods (name, description) VALUES
  ('Efectivo', 'Pago en efectivo'),
  ('Transferencia', 'Transferencia bancaria'),
  ('Link de pago/tarjeta', 'Pago con tarjeta de crédito/débito'),
  ('SINPE', 'Pago mediante SINPE Móvil'),
  ('Otro', 'Otro método de pago');
```

### Orders Table

```sql
CREATE TYPE order_status AS ENUM (
  'waiting_for_payment',
  'partially_paid',
  'payment_received',
  'confirmed',
  'finished'
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  order_details TEXT NOT NULL,
  delivery_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  needs_cake_topper BOOLEAN DEFAULT false,
  topper_details TEXT,
  topper_photos JSONB DEFAULT '[]'::jsonb,
  cost_amount DECIMAL(10,2) NOT NULL,
  charge_amount DECIMAL(10,2) NOT NULL,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL NOT NULL,
  down_payment DECIMAL(10,2) DEFAULT 0 NOT NULL,
  supplies_needed TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_orders_organization_id ON orders(organization_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_orders_payment_method_id ON orders(payment_method_id);

-- Add comments for documentation
COMMENT ON COLUMN orders.topper_details IS 'Details and specifications for the cake topper (nullable)';
COMMENT ON COLUMN orders.topper_photos IS 'Array of photo URLs for topper references stored as JSONB (nullable)';

-- RLS for Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

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
```

**Note:** The `quotation_id` field has been removed from the current database implementation.

### Order Photos Table

```sql
CREATE TABLE order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_order_photos_order_id ON order_photos(order_id);
```

### Order Statuses Table

```sql
CREATE TABLE order_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  status order_status NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_statuses_order_id ON order_statuses(order_id);
```

### Order Supplies Table

```sql
CREATE TABLE order_supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  supply_id UUID REFERENCES supplies(id) ON DELETE SET NULL,
  supply_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_order_supplies_order_id ON order_supplies(order_id);
```

### Card Types Table

```sql
CREATE TABLE card_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

-- Default card types
INSERT INTO card_types (name, description) VALUES
  ('AMEX', 'American Express'),
  ('Visa', 'Tarjeta Visa'),
  ('Mastercard', 'Tarjeta Mastercard'),
  ('Otro', 'Otro tipo de tarjeta');
```

### Expenses Table (Multi-Tenant)

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  supermarket_name VARCHAR(255) NOT NULL,
  purchase_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  card_type_id UUID REFERENCES card_types(id) ON DELETE SET NULL NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_purchase_date ON expenses(purchase_date);
CREATE INDEX idx_expenses_card_type_id ON expenses(card_type_id);

-- RLS for Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

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
```

### Recipe Types Table

```sql
CREATE TABLE recipe_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

-- Default recipe types
INSERT INTO recipe_types (name, description) VALUES
  ('queque', 'Receta de queque o bizcocho'),
  ('relleno', 'Receta de relleno'),
  ('cubierta', 'Receta de cubierta o frosting'),
  ('unidad', 'Receta por unidad');
```

### Quotations Table (Multi-Tenant)

```sql
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  size VARCHAR(50) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quotations_organization_id ON quotations(organization_id);
CREATE INDEX idx_quotations_user_id ON quotations(user_id);

-- RLS for Quotations
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

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
```

### Quotation Recipes Table (Junction Table)

```sql
CREATE TABLE quotation_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  recipe_name VARCHAR(255) NOT NULL,
  recipe_type_id UUID REFERENCES recipe_types(id) ON DELETE SET NULL NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_quotation_recipes_quotation_id ON quotation_recipes(quotation_id);
CREATE INDEX idx_quotation_recipes_recipe_type_id ON quotation_recipes(recipe_type_id);
```

### Quotation Supplies Table (Junction Table)

```sql
CREATE TABLE quotation_supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  supply_id UUID REFERENCES supplies(id) ON DELETE SET NULL,
  supply_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_quotation_supplies_quotation_id ON quotation_supplies(quotation_id);
```

### Quotation Additional Expenses Table

```sql
CREATE TABLE quotation_additional_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  expense_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_quotation_additional_expenses_quotation_id ON quotation_additional_expenses(quotation_id);
```

### Quotation Ingredients Table (Junction Table)

```sql
CREATE TABLE quotation_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  units VARCHAR(50) NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_quotation_ingredients_quotation_id ON quotation_ingredients(quotation_id);
CREATE INDEX idx_quotation_ingredients_ingredient_id ON quotation_ingredients(ingredient_id);
```

### Recipe Supplies Table (Junction Table)

```sql
CREATE TABLE recipe_supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  supply_id UUID REFERENCES supplies(id) ON DELETE CASCADE NOT NULL,
  supply_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_recipe_supplies_recipe_id ON recipe_supplies(recipe_id);
CREATE INDEX idx_recipe_supplies_supply_id ON recipe_supplies(supply_id);
```

### Filling Multipliers Table

```sql
CREATE TABLE filling_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  size VARCHAR(50) NOT NULL,
  multiplier DECIMAL(10,2) NOT NULL,
  UNIQUE(recipe_id, size)
);

CREATE INDEX idx_filling_multipliers_recipe_id ON filling_multipliers(recipe_id);

-- Example data:
-- | recipe_id (Relleno Chocolate) | size     | multiplier |
-- | uuid-1                        | pequeño  | 1.0        |
-- | uuid-1                        | mediano  | 2.0        |
-- | uuid-1                        | grande   | 3.0        |
-- | uuid-1                        | mini     | 0.5        |
```

### Covering Multipliers Table

```sql
CREATE TABLE covering_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  size VARCHAR(50) NOT NULL,
  multiplier DECIMAL(10,2) NOT NULL,
  UNIQUE(recipe_id, size)
);

CREATE INDEX idx_covering_multipliers_recipe_id ON covering_multipliers(recipe_id);

-- Example data:
-- | recipe_id (Cubierta Buttercream) | size     | multiplier |
-- | uuid-2                           | pequeño  | 1.0        |
-- | uuid-2                           | mediano  | 1.5        |
-- | uuid-2                           | grande   | 2.0        |
-- | uuid-2                           | mini     | 0.75       |
```

### Cake Multipliers Table

```sql
CREATE TABLE cake_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  size VARCHAR(50) NOT NULL,
  multiplier DECIMAL(10,2) NOT NULL,
  UNIQUE(recipe_id, size)
);

CREATE INDEX idx_cake_multipliers_recipe_id ON cake_multipliers(recipe_id);

-- Example data:
-- | recipe_id (Queque Vainilla) | size     | multiplier |
-- | uuid-3                      | pequeño  | 1.0        |
-- | uuid-3                      | mediano  | 1.5        |
-- | uuid-3                      | grande   | 2.5        |
-- | uuid-3                      | mini     | 0.5        |
```

### Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

---

## FASE 3: BACKEND APIs FOR MULTI-TENANT SYSTEM

---

## API Endpoints

### Standard API Response Structure

All API endpoints follow this consistent response structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Human readable message",
  "details": { ... } // Optional, for validation errors
}
```

**HTTP Status Codes:**

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error or invalid data |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate resource (e.g., slug, member) |
| 500 | Internal Server Error - Server error |

**Organization Roles:**
- **owner**: Full control of the organization
- **admin**: Can manage members and data
- **staff**: Can create/edit data, cannot manage members
- **viewer**: Read-only access

**Global Roles (app_role):**
- **super_admin**: Complete system access
- **owner**: Business owner (can have multiple organizations)
- **cake_topper_provider**: External topper provider

---

### Organizations API

#### GET /api/organizations

Get all organizations for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "organization_id": "550e8400-e29b-41d4-a716-446655440001",
      "organization_name": "Holy Moly Bakery",
      "organization_slug": "holy-moly",
      "user_role": "owner",
      "joined_at": "2025-01-15T10:30:00.000Z"
    },
    {
      "organization_id": "550e8400-e29b-41d4-a716-446655440002",
      "organization_name": "Sweet Dreams Bakery",
      "organization_slug": "sweet-dreams",
      "user_role": "admin",
      "joined_at": "2025-02-20T14:45:00.000Z"
    }
  ]
}
```

**Empty Response (200):**
```json
{
  "success": true,
  "data": []
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

---

#### POST /api/organizations

Create a new organization. The authenticated user automatically becomes the 'owner'.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Bakery Business",
  "slug": "new-bakery"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "New Bakery Business",
    "slug": "new-bakery",
    "logo_url": null,
    "subscription_status": "trial",
    "subscription_plan": "free",
    "subscription_stripe_customer_id": null,
    "subscription_stripe_subscription_id": null,
    "trial_ends_at": "2025-12-04T00:00:00.000Z",
    "settings": {},
    "created_at": "2025-11-04T10:30:00.000Z",
    "updated_at": "2025-11-04T10:30:00.000Z"
  }
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "name": "Name is required and must be between 1-255 characters",
    "slug": "Slug is required, must be lowercase, alphanumeric with hyphens, and unique"
  }
}
```

**Duplicate Slug (409):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "Organization slug 'new-bakery' already exists"
}
```

**Unauthorized (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

---

#### GET /api/organizations/:id

Get details of a specific organization. Only members can access.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Holy Moly Bakery",
    "slug": "holy-moly",
    "logo_url": "https://example.com/logos/holy-moly.png",
    "subscription_status": "active",
    "subscription_plan": "professional",
    "subscription_stripe_customer_id": "cus_123456789",
    "subscription_stripe_subscription_id": "sub_987654321",
    "trial_ends_at": null,
    "settings": {
      "currency": "USD",
      "timezone": "America/Chicago",
      "notifications_enabled": true
    },
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-11-04T08:20:00.000Z"
  }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Organization not found or you don't have access"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You are not a member of this organization"
}
```

**Unauthorized (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

---

#### PUT /api/organizations/:id

Update organization details. Only 'owner' can update.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "name": "Holy Moly Bakery & Cafe",
  "logo_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "settings": {
    "currency": "USD",
    "timezone": "America/New_York",
    "notifications_enabled": true,
    "auto_backup": true
  }
}
```

**Note:** The `logo_url` field should contain a base64 encoded image with data URI scheme (e.g., "data:image/png;base64,iVBORw0KG...").

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Holy Moly Bakery & Cafe",
    "slug": "holy-moly",
    "logo_url": "https://example.com/logos/new-logo.png",
    "subscription_status": "active",
    "subscription_plan": "professional",
    "subscription_stripe_customer_id": "cus_123456789",
    "subscription_stripe_subscription_id": "sub_987654321",
    "trial_ends_at": null,
    "settings": {
      "currency": "USD",
      "timezone": "America/New_York",
      "notifications_enabled": true,
      "auto_backup": true
    },
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-11-04T10:35:00.000Z"
  }
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only organization owners can update organization details"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Organization not found"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "name": "Name must be between 1-255 characters"
  }
}
```

---

#### GET /api/organizations/logo-by-email

Get organization logo by user email. Public endpoint, no authentication required. Used during login to display the organization's logo when user types their email.

**Query Parameters:**
- `email` (string, required): Complete user email (e.g., "user@example.com")

**Example Request:**
```
GET /api/organizations/logo-by-email?email=user@holymoly.com
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "logoUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
  }
}
```

**No Logo Found (200):**
```json
{
  "success": true,
  "data": {
    "logoUrl": null
  }
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Email parameter is required"
}
```

---

### Organization Members API

#### GET /api/organizations/:id/members

Get all members of an organization. Only members can access.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "organization_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "770e8400-e29b-41d4-a716-446655440001",
      "role": "owner",
      "joined_at": "2025-01-15T10:30:00.000Z",
      "user": {
        "id": "770e8400-e29b-41d4-a716-446655440001",
        "name": "John Smith",
        "email": "john@holymoly.com"
      }
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "organization_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "770e8400-e29b-41d4-a716-446655440002",
      "role": "admin",
      "joined_at": "2025-02-10T14:20:00.000Z",
      "user": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "Maria Garcia",
        "email": "maria@holymoly.com"
      }
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440003",
      "organization_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "770e8400-e29b-41d4-a716-446655440003",
      "role": "staff",
      "joined_at": "2025-03-05T09:15:00.000Z",
      "user": {
        "id": "770e8400-e29b-41d4-a716-446655440003",
        "name": "Carlos Rodriguez",
        "email": "carlos@holymoly.com"
      }
    }
  ]
}
```

**Empty Response (200):**
```json
{
  "success": true,
  "data": []
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You are not a member of this organization"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Organization not found"
}
```

---

#### GET /api/organizations/:orgId/members/:userId

Get detailed information about a specific member of an organization. Only members of the organization can access.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "organization_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "770e8400-e29b-41d4-a716-446655440002",
    "role": "admin",
    "joined_at": "2025-02-10T14:20:00.000Z",
    "user": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Maria Garcia",
      "email": "maria@holymoly.com"
    }
  }
}
```

**Member Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Member not found in this organization"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You are not a member of this organization"
}
```

**Organization Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Organization not found"
}
```

---

#### POST /api/organizations/:id/members

Add a new member to the organization. Only 'owner' and 'admin' can add members.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "770e8400-e29b-41d4-a716-446655440004",
  "role": "staff"
}
```

**Valid Roles:** `"owner"`, `"admin"`, `"staff"`, `"viewer"`

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440004",
    "organization_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "770e8400-e29b-41d4-a716-446655440004",
    "role": "staff",
    "joined_at": "2025-11-04T10:40:00.000Z",
    "user": {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "name": "Ana Martinez",
      "email": "ana@example.com"
    }
  }
}
```

**Member Already Exists (409):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "User is already a member of this organization"
}
```

**User Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "User not found"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only owners and admins can add members"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "user_id": "Valid user UUID is required",
    "role": "Role must be one of: owner, admin, staff, viewer"
  }
}
```

---

#### PUT /api/organizations/:orgId/members/:userId

Update a member's role. Only 'owner' and 'admin' can update roles.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "admin"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "organization_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "770e8400-e29b-41d4-a716-446655440002",
    "role": "admin",
    "joined_at": "2025-02-10T14:20:00.000Z",
    "user": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Maria Garcia",
      "email": "maria@holymoly.com"
    }
  }
}
```

**Member Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Member not found in this organization"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only owners and admins can update member roles"
}
```

**Cannot Modify Last Owner (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Cannot change role of the last owner. Assign another owner first."
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid role",
  "details": {
    "role": "Role must be one of: owner, admin, staff, viewer"
  }
}
```

---

#### DELETE /api/organizations/:orgId/members/:userId

Remove a member from the organization. Only 'owner' and 'admin' can remove members.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Member removed successfully",
  "data": {
    "organization_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "770e8400-e29b-41d4-a716-446655440003"
  }
}
```

**Member Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Member not found in this organization"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only owners and admins can remove members"
}
```

**Cannot Remove Last Owner (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Cannot remove the last owner. Assign another owner first or delete the organization."
}
```

**Cannot Self-Remove (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You cannot remove yourself from the organization. Ask another owner or admin to remove you."
}
```

---

#### POST /api/organizations/:id/members/by-email

Add a new member to the organization by email address. Only 'owner' and 'admin' can add members. This endpoint creates a new user account if the email doesn't exist, adds them to the organization, generates a temporary password, and sends a welcome email with login credentials.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "John Doe",
  "role": "staff"
}
```

**Valid Roles:** `"owner"`, `"staff"`, `"viewer"`

**Note:** The `"admin"` role is not allowed when adding members to prevent privilege escalation. Only super_admin users can have the admin role at the global level.

**Success Response - New User Created (201):**
```json
{
  "success": true,
  "message": "Member added successfully and welcome email sent",
  "data": {
    "member": {
      "id": "660e8400-e29b-41d4-a716-446655440005",
      "organization_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "770e8400-e29b-41d4-a716-446655440005",
      "role": "staff",
      "joined_at": "2025-11-04T15:30:00.000Z",
      "user": {
        "id": "770e8400-e29b-41d4-a716-446655440005",
        "name": "John Doe",
        "email": "newuser@example.com"
      }
    },
    "emailSent": true,
    "isNewUser": true
  }
}
```

**Success Response - Existing User Added (200):**
```json
{
  "success": true,
  "message": "Member added successfully",
  "data": {
    "member": {
      "id": "660e8400-e29b-41d4-a716-446655440005",
      "organization_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "770e8400-e29b-41d4-a716-446655440005",
      "role": "staff",
      "joined_at": "2025-11-04T15:30:00.000Z",
      "user": {
        "id": "770e8400-e29b-41d4-a716-446655440005",
        "name": "John Doe",
        "email": "newuser@example.com"
      }
    },
    "emailSent": false,
    "isNewUser": false
  }
}
```

**Member Already Exists (400):**
```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "User is already a member of this organization"
}
```

**Forbidden - Insufficient Permissions (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Insufficient permissions. Only owners and admins can add members."
}
```

**Description:** Only users with 'owner' or 'admin' roles can add members.

**Forbidden - Invalid Role (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Cannot assign 'admin' role. Only 'owner', 'staff', and 'viewer' roles are allowed."
}
```

**Description:** The 'admin' role cannot be assigned to prevent privilege escalation to super_admin.

**Email Send Failed (500):**
```json
{
  "success": true,
  "message": "Member added successfully but failed to send welcome email",
  "data": {
    "member": {
      "id": "660e8400-e29b-41d4-a716-446655440005",
      "organization_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "770e8400-e29b-41d4-a716-446655440005",
      "role": "staff",
      "joined_at": "2025-11-04T15:30:00.000Z",
      "user": {
        "id": "770e8400-e29b-41d4-a716-446655440005",
        "name": "John Doe",
        "email": "newuser@example.com"
      }
    },
    "emailSent": false,
    "isNewUser": true,
    "emailError": "Failed to send email"
  }
}
```

**Description:** The member was successfully added, but the welcome email failed to send. The user can still log in using the password reset feature.

**Validation Error (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "email": "Valid email address is required",
    "name": "Name is required and must be between 1-255 characters",
    "role": "Role must be one of: owner, staff, viewer"
  }
}
```

**Missing Fields (400):**
```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "Missing required fields: email, name, and role are required"
}
```

**Description:** The request must include `email`, `name`, and `role` fields.

**Internal Server Error (500):**
```json
{
  "success": false,
  "error": "InternalServerError",
  "message": "Error processing member addition"
}
```

**Description:** An unexpected error occurred while processing the request.

---

### Email Notifications

When a new user is added to an organization via the `/api/organizations/:id/members/by-email` endpoint:

#### Welcome Email for New Users

If the user doesn't exist in the system, a new account is created and a welcome email is sent with the following information:

**Email Subject:** `Welcome to [Organization Name]`

**Email Content:**
- Organization name and welcome message
- User's email address (login username)
- Temporary password (randomly generated, secure)
- Login URL
- Instructions to change password on first login
- Support contact information

**Technical Details:**
- Email service: Resend (resend.com)
- Email template: HTML formatted with organization branding
- Password: 12-character randomly generated string (letters, numbers, special characters)
- Password hashing: bcrypt with salt rounds = 10
- Email delivery: Asynchronous (doesn't block the API response)

**Environment Variables Required:**
- `RESEND_API_KEY`: API key from Resend.com for sending emails

**Error Handling:**
- If email sending fails, the user is still created and added to the organization
- The API response includes `emailSent: false` and an `emailError` field
- The user can use the password reset feature to gain access

---

### User Roles API

#### GET /api/users/:id/roles

Get global roles for a user (super_admin, owner, cake_topper_provider). Only 'super_admin' users or the user themselves can access.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "user_id": "770e8400-e29b-41d4-a716-446655440001",
      "role": "super_admin",
      "organization_id": null,
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "user_id": "770e8400-e29b-41d4-a716-446655440001",
      "role": "owner",
      "organization_id": null,
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**No Roles (200):**
```json
{
  "success": true,
  "data": []
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You can only view your own roles unless you are a super admin"
}
```

**User Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "User not found"
}
```

---

#### POST /api/users/:id/roles

Assign a global role to a user. Only 'super_admin' can assign roles.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "super_admin",
  "organization_id": null
}
```

**Valid Global Roles:** `"super_admin"`, `"owner"`, `"cake_topper_provider"`

**Note:** The `organization_id` field is optional and should be null for global roles. It's included for future extensibility.

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "user_id": "770e8400-e29b-41d4-a716-446655440002",
    "role": "super_admin",
    "organization_id": null,
    "created_at": "2025-11-04T10:45:00.000Z"
  }
}
```

**Role Already Assigned (409):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "User already has this role"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only super admins can assign global roles"
}
```

**User Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "User not found"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "role": "Role must be one of: super_admin, owner, cake_topper_provider"
  }
}
```

---

#### DELETE /api/users/:userId/roles/:roleId

Remove a global role from a user. Only 'super_admin' can remove roles.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Role removed successfully"
}
```

**Role Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Role assignment not found"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only super admins can remove global roles"
}
```

**Cannot Remove Own Super Admin Role (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You cannot remove your own super_admin role. Ask another super admin to do it."
}
```

---

### Subscription Plans API

#### GET /api/subscription-plans

Get all subscription plans. By default returns only active plans. Super admins can see all plans including inactive ones.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `active_only` (boolean, optional): Filter to show only active plans. Default: `true`. Super admins can set to `false` to see all plans.

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "name": "Free",
      "slug": "free",
      "price_monthly": 0,
      "price_yearly": 0,
      "max_orders_per_month": 10,
      "max_users": 1,
      "max_storage_gb": 1,
      "features": {
        "support": "community"
      },
      "stripe_price_id": null,
      "active": true,
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440002",
      "name": "Starter",
      "slug": "starter",
      "price_monthly": 29.99,
      "price_yearly": 299.90,
      "max_orders_per_month": 50,
      "max_users": 3,
      "max_storage_gb": 5,
      "features": {
        "support": "email",
        "priority": false
      },
      "stripe_price_id": "price_1234567890",
      "active": true,
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440003",
      "name": "Professional",
      "slug": "professional",
      "price_monthly": 79.99,
      "price_yearly": 799.90,
      "max_orders_per_month": 200,
      "max_users": 10,
      "max_storage_gb": 20,
      "features": {
        "support": "priority",
        "custom_branding": true
      },
      "stripe_price_id": "price_0987654321",
      "active": true,
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "name": "Enterprise",
      "slug": "enterprise",
      "price_monthly": 199.99,
      "price_yearly": 1999.90,
      "max_orders_per_month": -1,
      "max_users": -1,
      "max_storage_gb": 100,
      "features": {
        "support": "dedicated",
        "custom_branding": true,
        "api_access": true
      },
      "stripe_price_id": "price_1122334455",
      "active": true,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Empty Response (200):**
```json
{
  "success": true,
  "data": []
}
```

**Note:** A value of `-1` for `max_orders_per_month` or `max_users` indicates unlimited.

---

#### GET /api/subscription-plans/:id

Get details of a specific subscription plan.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440003",
    "name": "Professional",
    "slug": "professional",
    "price_monthly": 79.99,
    "price_yearly": 799.90,
    "max_orders_per_month": 200,
    "max_users": 10,
    "max_storage_gb": 20,
    "features": {
      "support": "priority",
      "custom_branding": true
    },
    "stripe_price_id": "price_0987654321",
    "active": true,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Subscription plan not found"
}
```

---

#### POST /api/subscription-plans

Create a new subscription plan. Only 'super_admin' can create plans.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Premium",
  "slug": "premium",
  "price_monthly": 149.99,
  "price_yearly": 1499.90,
  "max_orders_per_month": 500,
  "max_users": 25,
  "max_storage_gb": 50,
  "features": {
    "support": "priority",
    "custom_branding": true,
    "api_access": true,
    "advanced_analytics": true
  },
  "stripe_price_id": "price_premium_123",
  "active": true
}
```

**Field Descriptions:**
- `name` (string, required): Display name of the plan (max 100 chars)
- `slug` (string, required): URL-friendly identifier (lowercase, alphanumeric with hyphens, max 100 chars)
- `price_monthly` (decimal, required): Monthly price in dollars
- `price_yearly` (decimal, optional): Yearly price in dollars
- `max_orders_per_month` (integer, optional): Maximum orders per month (-1 for unlimited)
- `max_users` (integer, optional): Maximum users allowed (-1 for unlimited)
- `max_storage_gb` (integer, optional): Maximum storage in GB
- `features` (object, optional): JSON object with plan features
- `stripe_price_id` (string, optional): Stripe price ID for billing integration
- `active` (boolean, optional): Whether the plan is active. Default: `true`

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440005",
    "name": "Premium",
    "slug": "premium",
    "price_monthly": 149.99,
    "price_yearly": 1499.90,
    "max_orders_per_month": 500,
    "max_users": 25,
    "max_storage_gb": 50,
    "features": {
      "support": "priority",
      "custom_branding": true,
      "api_access": true,
      "advanced_analytics": true
    },
    "stripe_price_id": "price_premium_123",
    "active": true,
    "created_at": "2025-11-04T11:00:00.000Z"
  }
}
```

**Duplicate Slug or Name (409):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "A subscription plan with this slug or name already exists"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only super admins can create subscription plans"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "name": "Name is required and must be between 1-100 characters",
    "slug": "Slug is required, must be lowercase, alphanumeric with hyphens, and between 1-100 characters",
    "price_monthly": "Monthly price is required and must be a positive number"
  }
}
```

---

#### PUT /api/subscription-plans/:id

Update an existing subscription plan. Only 'super_admin' can update plans.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "name": "Premium Plus",
  "price_monthly": 159.99,
  "price_yearly": 1599.90,
  "max_orders_per_month": 600,
  "max_users": 30,
  "max_storage_gb": 75,
  "features": {
    "support": "dedicated",
    "custom_branding": true,
    "api_access": true,
    "advanced_analytics": true,
    "white_label": true
  },
  "stripe_price_id": "price_premium_456",
  "active": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440005",
    "name": "Premium Plus",
    "slug": "premium",
    "price_monthly": 159.99,
    "price_yearly": 1599.90,
    "max_orders_per_month": 600,
    "max_users": 30,
    "max_storage_gb": 75,
    "features": {
      "support": "dedicated",
      "custom_branding": true,
      "api_access": true,
      "advanced_analytics": true,
      "white_label": true
    },
    "stripe_price_id": "price_premium_456",
    "active": true,
    "created_at": "2025-11-04T11:00:00.000Z"
  }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Subscription plan not found"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only super admins can update subscription plans"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "price_monthly": "Monthly price must be a positive number"
  }
}
```

**Cannot Modify Slug (400):**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Cannot modify plan slug after creation"
}
```

---

#### DELETE /api/subscription-plans/:id

Delete (or deactivate) a subscription plan. Only 'super_admin' can delete plans. Plans with active subscriptions cannot be hard deleted and will be deactivated instead.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription plan deleted successfully"
}
```

**Plan Deactivated Instead (200):**
```json
{
  "success": true,
  "message": "Subscription plan has active subscriptions and has been deactivated instead of deleted"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Subscription plan not found"
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only super admins can delete subscription plans"
}
```

**Cannot Delete (400):**
```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "Cannot delete or deactivate the free plan as it is required for new users"
}
```

---

### Modified Authentication Endpoints (Multi-Tenant)

### Authentication

#### POST /api/auth/signup

Register a new user and create their first organization.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "organization_name": "My Bakery",
  "organization_slug": "my-bakery"
}
```

**Response (201):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token",
  "organization": {
    "id": "uuid",
    "name": "My Bakery",
    "slug": "my-bakery",
    "subscription_status": "trial",
    "subscription_plan": "free",
    "trial_ends_at": "2024-02-01T00:00:00Z"
  }
}
```

#### POST /api/auth/login

Authenticate user and return their organizations.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token",
  "organizations": [
    {
      "id": "uuid",
      "name": "My Bakery",
      "slug": "my-bakery",
      "role": "owner"
    }
  ]
}
```

#### POST /api/auth/logout

Invalidate user session.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me

Get current user info with their organizations.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "owner"
}
```

#### POST /api/auth/refresh

Refresh access token using refresh token.

**Request:**

```json
{
  "refreshToken": "refresh-token-string"
}
```

**Response (200):**

```json
{
  "token": "new-jwt-token",
  "refreshToken": "new-refresh-token"
}
```

**Response (401):** Invalid or expired refresh token

---

### Ingredients

#### GET /api/ingredients

Get all ingredients for authenticated user's current organization.

**Headers:** 
- `Authorization: Bearer {token}`
- `X-Organization-Id: {organizationId}` (required)

**Response (200):**

```json
[
  {
    "id": "uuid",
    "organizationId": "uuid",
    "userId": "uuid",
    "name": "Flour",
    "provider": "Supplier Co",
    "qtyProvider": 5.0,
    "units": "kg",
    "cost": 25.50,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /api/ingredients

Create a new ingredient in the current organization.

**Headers:** 
- `Authorization: Bearer {token}`
- `X-Organization-Id: {organizationId}` (required)

**Request:**

```json
{
  "name": "Flour",
  "provider": "Supplier Co",
  "qtyProvider": 5.0,
  "units": "kg",
  "cost": 25.50
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "userId": "uuid",
  "name": "Flour",
  "provider": "Supplier Co",
  "qtyProvider": 5.0,
  "units": "kg",
  "cost": 25.50,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Note:** The `organizationId` is automatically set from the `X-Organization-Id` header. The `userId` is set from the authenticated user.

#### PUT /api/ingredients/:id

Update an ingredient.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Flour",
  "provider": "New Supplier",
  "qtyProvider": 10.0,
  "units": "kg",
  "cost": 45.00
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "name": "Flour",
  "provider": "New Supplier",
  "qtyProvider": 10.0,
  "units": "kg",
  "cost": 45.00,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

#### DELETE /api/ingredients/:id

Delete an ingredient.

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No content

---

### Recipes

#### GET /api/recipes

Get all recipes for authenticated user's current organization.

**Headers:** 
- `Authorization: Bearer {token}`
- `X-Organization-Id: {organizationId}` (required)

**Response (200):**

```json
[
  {
    "id": "uuid",
    "organizationId": "uuid",
    "userId": "uuid",
    "name": "Chocolate Cake",
    "image": "https://storage.example.com/recipes/cake.jpg",
    "categories": ["queque", "unidad"],
    "notes": "Some notes",
    "url": "https://recipe-link.com",
    "units": 12,
    "unitCost": 3.82,
    "elaborations": [
      {
        "id": "uuid",
        "name": "Masa de Chocolate",
        "order": 1,
        "cost": 25.40,
        "ingredients": [
          {
            "id": "uuid",
            "ingredientId": "uuid",
            "ingredientName": "Flour",
            "quantity": 2.0,
            "units": "kg",
            "cost": 10.20
          },
          {
            "id": "uuid",
            "ingredientId": "uuid",
            "ingredientName": "Cocoa Powder",
            "quantity": 0.5,
            "units": "kg",
            "cost": 15.20
          }
        ]
      },
      {
        "id": "uuid",
        "name": "Ganache",
        "order": 2,
        "cost": 20.40,
        "ingredients": [
          {
            "id": "uuid",
            "ingredientId": "uuid",
            "ingredientName": "Dark Chocolate",
            "quantity": 0.3,
            "units": "kg",
            "cost": 12.00
          },
          {
            "id": "uuid",
            "ingredientId": "uuid",
            "ingredientName": "Heavy Cream",
            "quantity": 0.2,
            "units": "L",
            "cost": 8.40
          }
        ]
      }
    ],
    "supplies": [
      {
        "id": "uuid",
        "supplyId": "uuid",
        "supplyName": "Caja decorativa",
        "quantity": 1,
        "unit": "unidad",
        "costPerUnit": 500.00,
        "totalCost": 500.00
      },
      {
        "id": "uuid",
        "supplyId": "uuid",
        "supplyName": "Etiqueta personalizada",
        "quantity": 2,
        "unit": "unidad",
        "costPerUnit": 100.00,
        "totalCost": 200.00
      }
    ],
    "multipliers": [
      {
        "id": "uuid",
        "size": "pequeño",
        "multiplier": 1.0
      },
      {
        "id": "uuid",
        "size": "mediano",
        "multiplier": 1.5
      },
      {
        "id": "uuid",
        "size": "grande",
        "multiplier": 2.5
      }
    ],
    "totalCost": 46.50,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

**Notes:**

- `categories`: Array of categories that apply to this recipe (e.g., `["queque", "unidad"]`)
  - Possible values: `"queque"`, `"relleno"`, `"cubierta"`, `"unidad"`, `"otro"`
  - A recipe can have multiple categories (e.g., a cheesecake can be sold whole or by portions)
- `elaborations`: Array of recipe elaborations/steps, each containing its own ingredients
- `elaborations[].cost`: **CALCULATED FIELD** - Sum of all ingredient costs for that elaboration (not stored in DB)
- `supplies`: Optional array of supplies/materials used for this recipe (e.g., packaging, decorations)
- `supplies[].totalCost`: **CALCULATED FIELD** - `quantity * costPerUnit`
- `totalCost`: **CALCULATED FIELD** - Sum of all elaboration costs + sum of all supply costs (stored in `recipes.total_cost`)
- `unitCost`: **CALCULATED FIELD** - `totalCost / units` (stored in `recipes.unit_cost`)
- `multipliers`: Stored in separate tables based on categories:
  - If `categories` includes `'queque'` → stored in `cake_multipliers` table
  - If `categories` includes `'relleno'` → stored in `filling_multipliers` table
  - If `categories` includes `'cubierta'` → stored in `covering_multipliers` table
  - If only `'unidad'` or `'otro'` → no multipliers stored

#### POST /api/recipes

Create a new recipe.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Chocolate Cake",
  "image": "https://storage.example.com/recipes/cake.jpg",
  "categories": ["queque", "unidad"],
  "notes": "Some notes about the recipe",
  "url": "https://recipe-link.com",
  "units": 12,
  "elaborations": [
    {
      "name": "Masa de Chocolate",
      "order": 1,
      "ingredients": [
        {
          "ingredientId": "uuid",
          "ingredientName": "Flour",
          "quantity": 2.0,
          "units": "kg",
          "cost": 10.20
        },
        {
          "ingredientId": "uuid",
          "ingredientName": "Cocoa Powder",
          "quantity": 0.5,
          "units": "kg",
          "cost": 15.20
        }
      ]
    },
    {
      "name": "Ganache",
      "order": 2,
      "ingredients": [
        {
          "ingredientId": "uuid",
          "ingredientName": "Dark Chocolate",
          "quantity": 0.3,
          "units": "kg",
          "cost": 12.00
        },
        {
          "ingredientId": "uuid",
          "ingredientName": "Heavy Cream",
          "quantity": 0.2,
          "units": "L",
          "cost": 8.40
        }
      ]
    }
  ],
  "supplies": [
    {
      "supplyId": "uuid",
      "supplyName": "Caja decorativa",
      "quantity": 1,
      "unit": "unidad",
      "costPerUnit": 500.00,
      "totalCost": 500.00
    },
    {
      "supplyId": "uuid",
      "supplyName": "Etiqueta personalizada",
      "quantity": 2,
      "unit": "unidad",
      "costPerUnit": 100.00,
      "totalCost": 200.00
    }
  ],
  "multipliers": [
    {
      "size": "pequeño",
      "multiplier": 1.0
    },
    {
      "size": "mediano",
      "multiplier": 1.5
    },
    {
      "size": "grande",
      "multiplier": 2.5
    }
  ]
}
```

**Notes:**

- `categories`: Required array with at least one category value
  - Possible values: `"queque"`, `"relleno"`, `"cubierta"`, `"unidad"`, `"otro"`
  - Multiple categories can be specified (e.g., `["queque", "unidad"]` for products sold whole or by portions)
- `elaborations`: Required array of elaborations, each with name, order, and ingredients
- `elaborations[].ingredients`: Array of ingredients specific to that elaboration
- **DO NOT SEND** `elaborations[].cost` in request - backend calculates it automatically
- `supplies`: Optional array of supplies/materials used for this recipe
- `supplies[].totalCost`: Optional, backend can calculate it as `quantity * costPerUnit`
- **DO NOT SEND** `totalCost` in request - backend calculates as sum of all elaboration costs + supply costs
- **DO NOT SEND** `unitCost` in request - backend calculates as `totalCost / units` (if units provided)
- `multipliers`: Optional, only when `categories` includes "queque", "relleno", or "cubierta"
  - Stored in specific tables: `cake_multipliers`, `filling_multipliers`, `covering_multipliers`
  - Each table has UNIQUE constraint on `(recipe_id, size)`
- For recipes with only "unidad" or "otro" categories, multipliers should NOT be included
- When updating a recipe with multipliers, old multipliers are deleted and replaced with new ones
- When updating a recipe with supplies, old supplies are deleted and replaced with new ones

**Response (201):** Same as GET response

#### PUT /api/recipes/:id

Update a recipe.

**Headers:** `Authorization: Bearer {token}`

**Request:** Same as POST

**Response (200):** Updated recipe object

#### DELETE /api/recipes/:id

Delete a recipe.

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No content

#### POST /api/recipes/migrate-to-elaborations

Migrate all recipes from old structure (with direct ingredients) to new structure (with elaborations).

**Headers:** `Authorization: Bearer {token}`

**Description:**
This endpoint migrates all recipes that have `recipe_ingredients` linked directly to `recipe_id` (old structure) to the new structure where `recipe_ingredients` are linked to `elaboration_id` through `recipe_elaborations`.

For each recipe that needs migration:

1. Checks if the recipe already has elaborations in `recipe_elaborations` table
2. If NO elaborations exist:
   - Creates a new elaboration named "Elaboración principal" with `order_number = 1`
   - Updates all `recipe_ingredients` for that recipe to link to the new elaboration via `elaboration_id`
3. If elaborations already exist:
   - Uses the first elaboration (lowest `order_number`)
   - Updates all orphaned `recipe_ingredients` to link to this elaboration

**Response (200):**

```json
{
  "success": true,
  "migratedRecipes": 15,
  "message": "15 recetas migradas exitosamente a la estructura de elaboraciones"
}
```

**Response (200) - No migrations needed:**

```json
{
  "success": true,
  "migratedRecipes": 0,
  "message": "No hay recetas que necesiten migración"
}
```

**Notes:**

- This is a one-time migration endpoint
- Safe to run multiple times (idempotent)
- Does not affect recipes that already have elaborations
- Frontend components automatically handle both old and new structures for backwards compatibility

---

### Supplies

#### GET /api/supplies

Get all supplies for authenticated user's current organization.

**Headers:** 
- `Authorization: Bearer {token}`
- `X-Organization-Id: {organizationId}` (required)

**Response (200):**

```json
[
  {
    "id": "uuid",
    "organizationId": "uuid",
    "userId": "uuid",
    "name": "Cake Box",
    "supplierName": "Packaging Co",
    "quantity": 100,
    "unit": "pieces",
    "cost": 150.00,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /api/supplies

Create a new supply.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Cake Box",
  "supplierName": "Packaging Co",
  "quantity": 100,
  "unit": "pieces",
  "cost": 150.00
}
```

**Response (201):** Created supply object

#### PUT /api/supplies/:id

Update a supply.

**Headers:** `Authorization: Bearer {token}`

**Request:** Same as POST

**Response (200):** Updated supply object

#### DELETE /api/supplies/:id

Delete a supply.

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No content

---

### Orders

#### GET /api/orders

Get all orders for authenticated user's current organization.

**Headers:** 
- `Authorization: Bearer {token}`
- `X-Organization-Id: {organizationId}` (required)

**Query Parameters:**

- `status` (optional): Filter by status
- `startDate` (optional): Filter by delivery date (from)
- `endDate` (optional): Filter by delivery date (to)

**Response (200):**

```json
[
  {
    "id": "uuid",
    "organizationId": "uuid",
    "userId": "uuid",
    "quotationId": "uuid-quotation",
    "quotation": {
      "id": "uuid-quotation",
      "clientName": "Jane Smith",
      "size": "3 pisos",
      "servings": 50,
      "totalCost": 150.00,
      "createdAt": "2024-01-10T09:00:00Z"
    },
    "clientName": "Jane Smith",
    "phoneNumber": "+1234567890",
    "orderDetails": "3-tier chocolate cake with flowers",
    "deliveryDate": "2024-02-14T15:00:00Z",
    "clientPhotos": [
      {
        "id": "uuid",
        "photoUrl": "https://storage.example.com/orders/photo1.jpg",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "uuid",
        "photoUrl": "https://storage.example.com/orders/photo2.jpg",
        "createdAt": "2024-01-15T10:31:00Z"
      }
    ],
    "needsCakeTopper": true,
    "topperDetails": "Custom topper with name 'Jane' in gold color with glitter finish",
    "topperPhotos": [
      "https://storage.example.com/orders/topper1.jpg",
      "https://storage.example.com/orders/topper2.jpg"
    ],
    "costAmount": 150.00,
    "chargeAmount": 300.00,
    "paymentMethod": {
      "id": "uuid",
      "name": "Efectivo",
      "description": "Pago en efectivo"
    },
    "downPayment": 100.00,
    "statuses": [
      {
        "id": "uuid",
        "status": "waiting-for-payment",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "uuid",
        "status": "confirmed",
        "createdAt": "2024-01-15T14:20:00Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T14:20:00Z"
  }
]
```

**Notes:**

- `deliveryDate`: TIMESTAMP WITHOUT TIME ZONE
- `clientPhotos`: Array of photo objects from `order_photos` table
- `quotationId` is **required** and references an existing quotation
- `statuses`: Array of status objects from `order_statuses` table (ordered by `created_at`)
- `paymentMethod`: Object with payment method details from `payment_methods` table

#### POST /api/orders

Create a new order in the current organization.

**Headers:** 
- `Authorization: Bearer {token}`
- `X-Organization-Id: {organizationId}` (required)

**Request:**

```json
{
  "quotationId": "uuid",
  "clientName": "Jane Smith",
  "phoneNumber": "+1234567890",
  "orderDetails": "3-tier chocolate cake",
  "deliveryDate": "2024-02-14T15:00:00",
  "clientPhotos": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "https://storage.example.com/photo2.jpg"
  ],
  "needsCakeTopper": true,
  "topperDetails": "Custom topper with name 'Jane' in gold color",
  "topperPhotos": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "https://storage.example.com/topper2.jpg"
  ],
  "costAmount": 150.00,
  "chargeAmount": 300.00,
  "paymentMethodId": "uuid",
  "downPayment": 100.00,
  "statuses": ["waiting_for_payment"]
}
```

**Notes:**

- `quotationId` is **required** and references an existing quotation
- `paymentMethodId` is **required** and references an existing payment method from `payment_methods` table
- `costAmount` is automatically calculated from the selected quotation's `totalCost`
- `clientPhotos` accepts both base64-encoded images and URLs
- Photos are stored in `order_photos` table with individual records
- `needsCakeTopper`: Boolean indicating if the order requires a cake topper
- `topperDetails`: Optional text field with topper specifications (only when `needsCakeTopper` is true)
- `topperPhotos`: Optional array of topper reference photos, accepts both base64-encoded images and URLs
- `statuses` is sent as array of strings, stored in `order_statuses` table with timestamps
- Server validates that `downPayment` ≤ `chargeAmount`
- The quotation's details and payment method details are populated when the order is retrieved

**Response (201):** Created order object

#### PUT /api/orders/:id

Update an order.

**Headers:** `Authorization: Bearer {token}`

**Request:** Same as POST

**Response (200):** Updated order object

#### PATCH /api/orders/:id/topper

Update only the topper information for an existing order.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "topperDetails": "Updated topper details with new specifications",
  "topperPhotos": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "https://storage.example.com/topper-new.jpg"
  ]
}
```

**Notes:**

- Both fields are optional in the request
- `topperPhotos` accepts both base64-encoded images and URLs
- This endpoint is useful for updating topper information after the order has been created
- Can be used by both order creators and cake topper providers

**Response (200):**

```json
{
  "id": "uuid",
  "topperDetails": "Updated topper details with new specifications",
  "topperPhotos": [
    "https://storage.example.com/orders/topper1.jpg",
    "https://storage.example.com/orders/topper2.jpg"
  ],
  "updatedAt": "2024-01-16T10:30:00Z"
}
```

#### PATCH /api/orders/:id/status

Add a new status to an order.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "status": "confirmed"
}
```

**Response (200):** Updated order object

#### DELETE /api/orders/:id

Delete an order.

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No content

---

### Expenses

#### GET /api/expenses

Get all expenses for authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**

- `startDate` (optional): Filter by purchase date (from)
- `endDate` (optional): Filter by purchase date (to)

**Response (200):**

```json
[
  {
    "id": "uuid",
    "supermarketName": "Whole Foods",
    "purchaseDate": "2024-01-15",
    "amount": 125.50,
    "cardType": {
      "id": "uuid",
      "name": "Visa",
      "description": "Tarjeta Visa"
    },
    "receiptUrl": "https://storage.example.com/receipts/receipt1.jpg",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /api/expenses

Create a new expense.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "supermarketName": "Whole Foods",
  "purchaseDate": "2024-01-15",
  "amount": 125.50,
  "cardTypeId": "uuid",
  "receiptUrl": "https://storage.example.com/receipts/receipt1.jpg"
}
```

**Response (201):** Created expense object with populated `cardType` details

**Notes:**

- `cardTypeId` is **required** and references an existing card type from `card_types` table
- The card type details are populated when the expense is retrieved

#### PUT /api/expenses/:id

Update an expense.

**Headers:** `Authorization: Bearer {token}`

**Request:** Same as POST

**Response (200):** Updated expense object

#### DELETE /api/expenses/:id

Delete an expense.

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No content

---

### Quotations

#### GET /api/quotations

Get all quotations for authenticated user's current organization.

**Headers:** 
- `Authorization: Bearer {token}`
- `X-Organization-Id: {organizationId}` (required)

**Response (200):**

```json
[
  {
    "id": "uuid",
    "organizationId": "uuid",
    "userId": "uuid",
    "clientName": "María González",
    "size": "mediano",
    "recipes": [
      {
        "recipeId": "uuid",
        "recipeName": "Queque de Vainilla",
        "recipeType": {
          "id": "uuid",
          "name": "queque",
          "description": "Receta de queque o bizcocho"
        },
        "unitCost": 5000.00,
        "quantity": 1,
        "totalCost": 5000.00
      },
      {
        "recipeId": "uuid",
        "recipeName": "Relleno de Fresa",
        "recipeType": {
          "id": "uuid",
          "name": "relleno",
          "description": "Receta de relleno"
        },
        "unitCost": 2000.00,
        "quantity": 2,
        "totalCost": 4000.00
      }
    ],
    "selectedSupplies": [
      {
        "supplyId": "uuid",
        "supplyName": "Caja para pastel mediano",
        "quantity": 1,
        "unit": "unidad",
        "costPerUnit": 500.00,
        "totalCost": 500.00
      },
      {
        "supplyId": "uuid",
        "supplyName": "Velas decorativas",
        "quantity": 2,
        "unit": "paquete",
        "costPerUnit": 150.00,
        "totalCost": 300.00
      }
    ],
    "additionalIngredients": [
      {
        "ingredientId": "uuid",
        "ingredientName": "Chocolate especial",
        "quantity": 0.5,
        "units": "kg",
        "costPerUnit": 3000.00,
        "totalCost": 1500.00
      },
      {
        "ingredientId": "uuid",
        "ingredientName": "Fresas frescas",
        "quantity": 1,
        "units": "kg",
        "costPerUnit": 800.00,
        "totalCost": 800.00
      }
    ],
    "additionalExpenses": [
      {
        "expenseName": "Entrega a domicilio",
        "unitPrice": 2000.00,
        "quantity": 1,
        "totalPrice": 2000.00
      },
      {
        "expenseName": "Montaje especial",
        "unitPrice": 1500.00,
        "quantity": 1,
        "totalPrice": 1500.00
      }
    ],
    "totalCost": 15600.00,
    "notes": "Cliente prefiere bajo azúcar",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /api/quotations

Create a new quotation in the current organization.

**Headers:** 
- `Authorization: Bearer {token}`
- `X-Organization-Id: {organizationId}` (required)

**Request:**

```json
{
  "clientName": "María González",
  "size": "mediano",
  "recipes": [
    {
      "recipeId": "uuid",
      "recipeName": "Queque de Vainilla",
      "recipeTypeId": "uuid",
      "unitCost": 5000.00,
      "quantity": 1,
      "totalCost": 5000.00
    },
    {
      "recipeId": "uuid",
      "recipeName": "Relleno de Fresa",
      "recipeTypeId": "uuid",
      "unitCost": 2000.00,
      "quantity": 2,
      "totalCost": 4000.00
    }
  ],
  "selectedSupplies": [
    {
      "supplyId": "uuid",
      "supplyName": "Caja para pastel mediano",
      "quantity": 1,
      "unit": "unidad",
      "costPerUnit": 500.00,
      "totalCost": 500.00
    },
    {
      "supplyId": "uuid",
      "supplyName": "Velas decorativas",
      "quantity": 2,
      "unit": "paquete",
      "costPerUnit": 150.00,
      "totalCost": 300.00
    }
  ],
  "additionalIngredients": [
    {
      "ingredientId": "uuid",
      "ingredientName": "Chocolate especial",
      "quantity": 0.5,
      "units": "kg",
      "costPerUnit": 3000.00,
      "totalCost": 1500.00
    },
    {
      "ingredientId": "uuid",
      "ingredientName": "Fresas frescas",
      "quantity": 1,
      "units": "kg",
      "costPerUnit": 800.00,
      "totalCost": 800.00
    }
  ],
  "additionalExpenses": [
    {
      "expenseName": "Entrega a domicilio",
      "unitPrice": 2000.00,
      "quantity": 1,
      "totalPrice": 2000.00
    },
    {
      "expenseName": "Montaje especial",
      "unitPrice": 1500.00,
      "quantity": 1,
      "totalPrice": 1500.00
    }
  ],
  "totalCost": 15600.00,
  "notes": "Cliente prefiere bajo azúcar"
}
```

**Response (201):** Created quotation object with populated `recipeType` details

**Notes:**

- `recipeTypeId` in each recipe is **required** and references an existing recipe type from `recipe_types` table
- The recipe type details are populated when the quotation is retrieved
- `additionalIngredients`: Optional array of ingredients that are not part of any recipe but needed for the quotation
- `additionalIngredients[].totalCost`: Optional, backend can calculate it as `quantity * costPerUnit`
- `totalCost` is automatically calculated by summing all recipe costs, supply costs, additional ingredient costs, and additional expenses

#### PUT /api/quotations/:id

Update a quotation.

**Headers:** `Authorization: Bearer {token}`

**Request:** Same as POST

**Response (200):** Updated quotation object

#### DELETE /api/quotations/:id

Delete a quotation.

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No content

#### GET /api/quotations/filling-multipliers/:recipeId

Get size multipliers for a specific filling recipe (relleno).

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Relleno Chocolate",
    "size": "pequeño",
    "multiplier": 1.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Relleno Chocolate",
    "size": "mediano",
    "multiplier": 2.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Relleno Chocolate",
    "size": "grande",
    "multiplier": 3.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Relleno Chocolate",
    "size": "mini",
    "multiplier": 0.5
  }
]
```

**Response (404):** If no multipliers found for recipe

#### POST /api/quotations/filling-multipliers

Create or update filling multipliers for a recipe.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "recipeId": "uuid",
  "multipliers": [
    {
      "size": "pequeño",
      "multiplier": 1.0
    },
    {
      "size": "mediano",
      "multiplier": 2.0
    },
    {
      "size": "grande",
      "multiplier": 3.0
    },
    {
      "size": "mini",
      "multiplier": 0.5
    }
  ]
}
```

**Response (200):**

```json
[
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "pequeño",
    "multiplier": 1.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "mediano",
    "multiplier": 2.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "grande",
    "multiplier": 3.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "mini",
    "multiplier": 0.5
  }
]
```

#### GET /api/quotations/covering-multipliers/:recipeId

Get size multipliers for a specific covering recipe (cubierta).

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Cubierta Buttercream",
    "size": "pequeño",
    "multiplier": 1.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Cubierta Buttercream",
    "size": "mediano",
    "multiplier": 1.5
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Cubierta Buttercream",
    "size": "grande",
    "multiplier": 2.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Cubierta Buttercream",
    "size": "mini",
    "multiplier": 0.75
  }
]
```

**Response (404):** If no multipliers found for recipe

#### POST /api/quotations/covering-multipliers

Create or update covering multipliers for a recipe.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "recipeId": "uuid",
  "multipliers": [
    {
      "size": "pequeño",
      "multiplier": 1.0
    },
    {
      "size": "mediano",
      "multiplier": 1.5
    },
    {
      "size": "grande",
      "multiplier": 2.0
    },
    {
      "size": "mini",
      "multiplier": 0.75
    }
  ]
}
```

**Response (200):**

```json
[
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "pequeño",
    "multiplier": 1.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "mediano",
    "multiplier": 1.5
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "grande",
    "multiplier": 2.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "mini",
    "multiplier": 0.75
  }
]
```

#### GET /api/quotations/cake-multipliers/:recipeId

Get size multipliers for a specific cake recipe (queque).

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Queque Vainilla",
    "size": "pequeño",
    "multiplier": 1.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Queque Vainilla",
    "size": "mediano",
    "multiplier": 1.5
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Queque Vainilla",
    "size": "grande",
    "multiplier": 2.5
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "recipeName": "Queque Vainilla",
    "size": "mini",
    "multiplier": 0.5
  }
]
```

**Response (404):** If no multipliers found for recipe

#### POST /api/quotations/cake-multipliers

Create or update cake multipliers for a recipe.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "recipeId": "uuid",
  "multipliers": [
    {
      "size": "pequeño",
      "multiplier": 1.0
    },
    {
      "size": "mediano",
      "multiplier": 1.5
    },
    {
      "size": "grande",
      "multiplier": 2.5
    },
    {
      "size": "mini",
      "multiplier": 0.5
    }
  ]
}
```

**Response (200):**

```json
[
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "pequeño",
    "multiplier": 1.0
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "mediano",
    "multiplier": 1.5
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "grande",
    "multiplier": 2.5
  },
  {
    "id": "uuid",
    "recipeId": "uuid",
    "size": "mini",
    "multiplier": 0.5
  }
]
```

---

### Payment Methods

#### GET /api/payment-methods

Get all available payment methods.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
    "name": "Efectivo",
    "description": "Pago en efectivo",
    "active": true,
    "createdAt": "2025-01-15T10:00:00Z"
  },
  {
    "id": "uuid",
    "name": "Transferencia",
    "description": "Transferencia bancaria",
    "active": true,
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

#### GET /api/payment-methods/:id

Get a specific payment method by ID.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "id": "uuid",
  "name": "Efectivo",
  "description": "Pago en efectivo",
  "active": true,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### POST /api/payment-methods

Create a new payment method.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "PayPal",
  "description": "Pago mediante PayPal",
  "active": true
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "name": "PayPal",
  "description": "Pago mediante PayPal",
  "active": true,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### PUT /api/payment-methods/:id

Update an existing payment method.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "PayPal Internacional",
  "description": "Pago mediante PayPal con conversión de moneda",
  "active": false
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "name": "PayPal Internacional",
  "description": "Pago mediante PayPal con conversión de moneda",
  "active": false,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### DELETE /api/payment-methods/:id

Delete a payment method.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "message": "Payment method deleted successfully"
}
```

**Note:** If the payment method is referenced by existing orders, the deletion will fail with a 409 error.

---

### Card Types

#### GET /api/card-types

Get all available card types.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
    "name": "AMEX",
    "description": "American Express",
    "active": true,
    "createdAt": "2025-01-15T10:00:00Z"
  },
  {
    "id": "uuid",
    "name": "Visa",
    "description": "Tarjeta Visa",
    "active": true,
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

#### GET /api/card-types/:id

Get a specific card type by ID.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "id": "uuid",
  "name": "AMEX",
  "description": "American Express",
  "active": true,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### POST /api/card-types

Create a new card type.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Discover",
  "description": "Tarjeta Discover",
  "active": true
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "name": "Discover",
  "description": "Tarjeta Discover",
  "active": true,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### PUT /api/card-types/:id

Update an existing card type.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Discover Card",
  "description": "Tarjeta Discover Internacional",
  "active": false
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "name": "Discover Card",
  "description": "Tarjeta Discover Internacional",
  "active": false,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### DELETE /api/card-types/:id

Delete a card type.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "message": "Card type deleted successfully"
}
```

**Note:** If the card type is referenced by existing expenses, the deletion will fail with a 409 error.

---

### Recipe Types

#### GET /api/recipe-types

Get all available recipe types.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
    "name": "queque",
    "description": "Receta de queque o bizcocho",
    "active": true,
    "createdAt": "2025-01-15T10:00:00Z"
  },
  {
    "id": "uuid",
    "name": "relleno",
    "description": "Receta de relleno",
    "active": true,
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

#### GET /api/recipe-types/:id

Get a specific recipe type by ID.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "id": "uuid",
  "name": "queque",
  "description": "Receta de queque o bizcocho",
  "active": true,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### POST /api/recipe-types

Create a new recipe type.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "decoracion",
  "description": "Receta para decoraciones especiales",
  "active": true
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "name": "decoracion",
  "description": "Receta para decoraciones especiales",
  "active": true,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### PUT /api/recipe-types/:id

Update an existing recipe type.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "decoracion-especial",
  "description": "Receta para decoraciones y toppings especiales",
  "active": false
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "name": "decoracion-especial",
  "description": "Receta para decoraciones y toppings especiales",
  "active": false,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### DELETE /api/recipe-types/:id

Delete a recipe type.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "message": "Recipe type deleted successfully"
}
```

**Note:** If the recipe type is referenced by existing quotation recipes, the deletion will fail with a 409 error.

---

### File Upload

#### POST /api/upload

Upload a file (images for recipes, order photos, receipts).

**Headers:**

- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Request:**

```
FormData with:
- file: File
- folder: "recipes" | "orders" | "receipts"
```

**Response (200):**

```json
{
  "url": "https://storage.example.com/orders/photo1.jpg",
  "filename": "photo1.jpg"
}
```

---

## Security Requirements

### Authentication

- JWT-based authentication for access tokens
- Refresh token system using `refresh_tokens` table
- Password hashing using bcrypt (cost factor: 12)
- Access token expiration: 24 hours
- Refresh token expiration: 30 days
- Revoked tokens tracked in `refresh_tokens.revoked_at`
- Rate limit login attempts (5 per 15 minutes)

### Authorization

- All endpoints require valid JWT token (except signup/login/refresh)
- Users can only access their own data (enforced via `user_id` filtering)
- Role-based access control using `user_roles` table
- `cake_topper_provider` role: limited to viewing orders with `needsCakeTopper=true`

### Data Validation

- Input validation on all endpoints
- SQL injection prevention through parameterized queries
- XSS protection on all text inputs
- File upload validation (type, size limits: 5MB for images)
- Implement CORS with whitelist

### Additional Security

- HTTPS only in production
- Rate limiting (100 requests per 15 minutes per IP)
- Request logging for audit trail
- Cascade deletion rules to prevent orphaned data
- Foreign key constraints for data integrity
- Sanitize error messages (no stack traces in production)

---

## TypeScript Type Compatibility

### Important Type Differences

**ENUM to Table Migration:**

All ENUMs have been converted to reference tables for better flexibility and maintainability:

1. **Payment Methods:**
   - **Old:** `payment_method ENUM ('cash', 'transfer', 'card', 'other')`
   - **New:** `payment_method_id UUID REFERENCES payment_methods(id)`
   - **API Response:** Returns full payment method object with `{ id, name, description, active, createdAt }`
   - **API Request:** Requires `paymentMethodId` (UUID)

2. **Card Types:**
   - **Old:** `card_type ENUM ('amex', 'visa', 'other')`
   - **New:** `card_type_id UUID REFERENCES card_types(id)`
   - **API Response:** Returns full card type object with `{ id, name, description, active, createdAt }`
   - **API Request:** Requires `cardTypeId` (UUID)

3. **Recipe Types:**
   - **Old:** `recipe_type ENUM ('queque', 'relleno', 'cubierta', 'unidad')`
   - **New:** `recipe_type_id UUID REFERENCES recipe_types(id)`
   - **API Response:** Returns full recipe type object with `{ id, name, description, active, createdAt }`
   - **API Request:** Requires `recipeTypeId` (UUID)

**Frontend Type Updates Required:**

Update TypeScript interfaces to match the new structure:

```typescript
// src/types/order.ts
export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface Order {
  // ... other fields
  paymentMethod: PaymentMethod;
  // ... other fields
}

// src/types/expense.ts
export interface CardType {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface Expense {
  // ... other fields
  cardType: CardType;
  // ... other fields
}

// src/types/quotation.ts
export interface RecipeType {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface QuotationRecipe {
  // ... other fields
  recipeType: RecipeType;
  // ... other fields
}
```

**RecipeElaboration Interface:**

- Add `cost?: number` field to match API responses (calculated field, not stored in DB)

---

## Database Indexes

### Performance Indexes

All foreign key relationships have indexes:

- `idx_ingredients_user_id`
- `idx_recipes_user_id`
- `idx_recipe_elaborations_recipe_id`
- `idx_recipe_ingredients_elaboration_id`
- `idx_recipe_ingredients_ingredient_id`
- `idx_recipe_supplies_recipe_id`
- `idx_recipe_supplies_supply_id`
- `idx_supplies_user_id`
- `idx_orders_user_id`
- `idx_orders_delivery_date`
- `idx_orders_payment_method_id`
- `idx_order_photos_order_id`
- `idx_order_statuses_order_id`
- `idx_order_supplies_order_id`
- `idx_expenses_user_id`
- `idx_expenses_purchase_date`
- `idx_expenses_card_type_id`
- `idx_quotations_user_id`
- `idx_quotation_recipes_quotation_id`
- `idx_quotation_recipes_recipe_type_id`
- `idx_quotation_supplies_quotation_id`
- `idx_quotation_ingredients_quotation_id`
- `idx_quotation_ingredients_ingredient_id`
- `idx_quotation_additional_expenses_quotation_id`
- `idx_filling_multipliers_recipe_id`
- `idx_covering_multipliers_recipe_id`
- `idx_cake_multipliers_recipe_id`
- `idx_refresh_tokens_user_id`

### Unique Constraints

- `users.email` - UNIQUE
- `user_roles(user_id, role)` - UNIQUE
- `payment_methods.name` - UNIQUE
- `card_types.name` - UNIQUE
- `recipe_types.name` - UNIQUE
- `filling_multipliers(recipe_id, size)` - UNIQUE
- `covering_multipliers(recipe_id, size)` - UNIQUE
- `cake_multipliers(recipe_id, size)` - UNIQUE
- `refresh_tokens.token` - PRIMARY KEY (unique)

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
```

### Common Error Codes

- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `422`: Validation error
- `409`: Duplicate entry (UNIQUE constraint violation)
- `429`: Too many requests
- `500`: Internal server error
