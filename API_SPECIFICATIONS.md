# Bakery Management System - API Specifications & Database Schema

**Last Updated:** 2025-11-06
**API Version:** 2.0

## Overview

This document describes the API endpoints and database schema for the Bakery Management System. The system has evolved from a single-tenant to a **multi-tenant architecture** with organization support, subscription plans, and enhanced security features.

### Key Features (API v2.0)

- **Multi-tenant Organizations:** Support for multiple bakeries/organizations with member management
- **Subscription Plans:** Flexible pricing tiers with feature limits
- **Enhanced Authentication:** Password reset, profile management, and impersonation support
- **Email Tracking:** Comprehensive email delivery logging for welcome emails, password resets, and invitations
- **Super Admin Panel:** System-wide administration capabilities
- **Role-Based Access Control:** Both global and organization-specific roles

---

## Database Schema

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

### User Roles Table

```sql
CREATE TYPE app_role AS ENUM ('owner', 'cake_topper_provider');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
```

### Ingredients Table

```sql
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  qty_provider DECIMAL(10,2) NOT NULL,
  units VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);
```

### Recipes Table

```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  image TEXT,
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  category VARCHAR(255),
  notes TEXT,
  url TEXT,
  units NUMERIC(10,0),
  unit_cost DECIMAL(10,2),
  used_parameters TEXT[], -- Array of parameter keys this recipe uses (e.g., ['relleno_pavlova', 'cubierta_pavlova'])
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
```

**Migration SQL to add `used_parameters` column:**
```sql
-- Add used_parameters column to existing recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS used_parameters TEXT[];
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

### Supplies Table

```sql
CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_supplies_user_id ON supplies(user_id);
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
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  order_details TEXT NOT NULL,
  delivery_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  needs_cake_topper BOOLEAN DEFAULT false,
  cost_amount DECIMAL(10,2) NOT NULL,
  charge_amount DECIMAL(10,2) NOT NULL,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL NOT NULL,
  down_payment DECIMAL(10,2) DEFAULT 0 NOT NULL,
  supplies_needed TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_orders_payment_method_id ON orders(payment_method_id);
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

### Expenses Table

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  supermarket_name VARCHAR(255) NOT NULL,
  purchase_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  card_type_id UUID REFERENCES card_types(id) ON DELETE SET NULL NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_purchase_date ON expenses(purchase_date);
CREATE INDEX idx_expenses_card_type_id ON expenses(card_type_id);
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

### Quotations Table

```sql
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  size VARCHAR(50) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quotations_user_id ON quotations(user_id);
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

### Password Reset Tokens Table

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT token_not_used CHECK (used_at IS NULL OR used_at >= created_at)
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

**Note:** Tokens typically expire after 1 hour.

### Subscription Plans Table

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  max_orders_per_month INTEGER,
  max_users INTEGER,
  max_storage_gb DECIMAL(10,2),
  features JSONB DEFAULT '{}',
  stripe_price_id VARCHAR(255),
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(active);
```

### Organizations Table

```sql
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'cancelled', 'past_due');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  subscription_status subscription_status DEFAULT 'trial' NOT NULL,
  subscription_plan VARCHAR(100) DEFAULT 'free' NOT NULL,
  subscription_stripe_customer_id VARCHAR(255),
  subscription_stripe_subscription_id VARCHAR(255),
  trial_ends_at TIMESTAMP WITHOUT TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
```

### Organization Members Table

```sql
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role organization_role DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
```

### Email Logs Table

```sql
CREATE TYPE email_type AS ENUM ('welcome', 'password_reset', 'invitation', 'notification');
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed', 'bounced');

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  email_type email_type NOT NULL,
  status email_status NOT NULL DEFAULT 'pending',
  resend_email_id VARCHAR(255),
  error_message TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_member_id UUID REFERENCES organization_members(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_email ON email_logs(email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_organization_id ON email_logs(organization_id);
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_org_member_id ON email_logs(organization_member_id);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_member_type_created ON email_logs(organization_member_id, email_type, created_at DESC);
```

### Recipe Parameters Table

```sql
CREATE TABLE recipe_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  parameter_key VARCHAR(100) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, parameter_key)
);

CREATE INDEX idx_recipe_parameters_org_id ON recipe_parameters(organization_id);
```

**Purpose:** Stores global organization-level parameters that can be referenced in recipe variations (e.g., "Relleno_Cupcake", "Relleno_Pavlova"). This allows organizations to define reusable values across multiple recipes.

**Example data:**
- `parameter_key: "Relleno_Cupcake"`, `value: 50`, `unit: "gr"`
- `parameter_key: "Relleno_Pavlova"`, `value: 150`, `unit: "gr"`

### Recipe Variations Table

```sql
CREATE TABLE recipe_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipe_variations_recipe_id ON recipe_variations(recipe_id);
```

**Purpose:** Stores variations of a recipe (e.g., "Pavlova con Chocolate", "Pavlova con Fresa"). Each variation can have different elaborations with different parameters.

**Example data:**
- `name: "Pavlova con Chocolate"`, `is_default: true`, `order_number: 1`
- `name: "Pavlova con Fresa"`, `is_default: false`, `order_number: 2`

### Updated Recipe Elaborations Table

The `recipe_elaborations` table has been extended with new fields to support variations and parameterized elaborations:

```sql
ALTER TABLE recipe_elaborations
ADD COLUMN variation_id UUID REFERENCES recipe_variations(id) ON DELETE CASCADE,
ADD COLUMN elaboration_type VARCHAR(100),
ADD COLUMN parameter_key VARCHAR(100);

CREATE INDEX idx_recipe_elaborations_variation_id ON recipe_elaborations(variation_id);
```

**New fields:**
- `variation_id`: Links the elaboration to a specific recipe variation (optional)
- `elaboration_type`: Type of elaboration (e.g., "base", "relleno", "cubierta", "decoracion")
- `parameter_key`: Reference to a global parameter from `recipe_parameters` (optional)

**Notes:**
- The `parameter_key` can be used to reference organization-wide parameters for dynamic values
- When `variation_id` is NULL, the elaboration applies to the base recipe
- When `variation_id` is set, the elaboration is specific to that variation

---

## API Endpoints

### Authentication

#### POST /api/auth/signup

Register a new user.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "role": "owner"
}
```

**Response (201):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner"
  },
  "token": "jwt-token"
}
```

#### POST /api/auth/login

Authenticate user.

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
    "name": "John Doe",
    "role": "owner"
  },
  "token": "jwt-token"
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

Get current user info.

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

#### POST /api/auth/forgot-password

Request a password reset token.

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link will be sent."
}
```

**Notes:**
- Sends an email with a password reset link
- Token expires after 1 hour
- Always returns success message for security reasons (doesn't reveal if email exists)

#### POST /api/auth/reset-password

Reset password using the token from email.

**Request:**

```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

**Response (400):** Invalid or expired token
**Response (422):** Weak password

#### PUT /api/auth/update-profile

Update user profile information.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "New Name",
  "email": "newemail@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "newemail@example.com",
    "name": "New Name",
    "role": "owner"
  }
}
```

**Notes:**
- At least one field (name or email) must be provided
- If email is changed, it must not already exist in the system

#### PUT /api/auth/change-password

Change user password.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response (401):** Current password is incorrect
**Response (422):** New password is too weak

---

### Ingredients

#### GET /api/ingredients

Get all ingredients for authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
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

Create a new ingredient.

**Headers:** `Authorization: Bearer {token}`

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
  "name": "Flour",
  "provider": "Supplier Co",
  "qtyProvider": 5.0,
  "units": "kg",
  "cost": 25.50,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

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

Get all recipes for authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
    "name": "Pavlova",
    "image": "https://storage.example.com/recipes/pavlova.jpg",
    "categories": ["unidad"],
    "notes": "Some notes",
    "url": "https://recipe-link.com",
    "units": 12,
    "unitCost": 3.82,
    "elaborations": [
      {
        "id": "uuid",
        "name": "Base de Merengue",
        "order": 1,
        "cost": 25.40,
        "variationId": null,
        "ingredients": [
          {
            "id": "uuid",
            "ingredientId": "uuid",
            "ingredientName": "Egg Whites",
            "quantity": 6.0,
            "units": "unidades",
            "cost": 10.20
          },
          {
            "id": "uuid",
            "ingredientId": "uuid",
            "ingredientName": "Sugar",
            "quantity": 0.5,
            "units": "kg",
            "cost": 15.20
          }
        ]
      }
    ],
    "variations": [
      {
        "id": "var-1",
        "name": "Pavlova con Chocolate",
        "isDefault": true,
        "orderNumber": 1,
        "elaborations": [
          {
            "id": "elab-2",
            "name": "Relleno de Chocolate",
            "order": 1,
            "cost": 20.40,
            "variationId": "var-1",
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
        ]
      },
      {
        "id": "var-2",
        "name": "Pavlova con Fresa",
        "isDefault": false,
        "orderNumber": 2,
        "elaborations": [
          {
            "id": "elab-3",
            "name": "Relleno de Fresa",
            "order": 1,
            "cost": 18.60,
            "variationId": "var-2",
            "ingredients": [
              {
                "id": "uuid",
                "ingredientId": "uuid",
                "ingredientName": "Strawberries",
                "quantity": 0.5,
                "units": "kg",
                "cost": 10.00
              },
              {
                "id": "uuid",
                "ingredientId": "uuid",
                "ingredientName": "Whipped Cream",
                "quantity": 0.3,
                "units": "L",
                "cost": 8.60
              }
            ]
          }
        ]
      }
    ],
    "totalCost": 45.80,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

**Notes:**

- `elaborations`: Array of base recipe elaborations/steps with `variationId = null`
- `elaborations[].cost`: **CALCULATED FIELD** - Sum of all ingredient costs for that elaboration (not stored in DB)
- `elaborations[].variationId`: NULL for base elaborations, UUID for variation-specific elaborations
- `variations`: **NEW** - Array of recipe variations, each with its own set of elaborations
- `variations[].isDefault`: Indicates which variation is the default one
- `variations[].orderNumber`: Display order for variations
- `totalCost`: **CALCULATED FIELD** - Sum of all base elaboration costs (stored in `recipes.total_cost`)
- `unitCost`: **CALCULATED FIELD** - `totalCost / units` (stored in `recipes.unit_cost`)
- `multipliers`: Only included for categories "queque", "relleno", "cubierta"

#### POST /api/recipes

Create a new recipe.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Pavlova",
  "image": "https://storage.example.com/recipes/pavlova.jpg",
  "categories": ["unidad"],
  "notes": "Some notes about the recipe",
  "url": "https://recipe-link.com",
  "units": 12,
  "elaborations": [
    {
      "name": "Base de Merengue",
      "order": 1,
      "ingredients": [
        {
          "ingredientId": "uuid",
          "ingredientName": "Egg Whites",
          "quantity": 6.0,
          "units": "unidades",
          "cost": 10.20
        },
        {
          "ingredientId": "uuid",
          "ingredientName": "Sugar",
          "quantity": 0.5,
          "units": "kg",
          "cost": 15.20
        }
      ]
    }
  ],
  "variations": [
    {
      "name": "Pavlova con Chocolate",
      "isDefault": true,
      "orderNumber": 1,
      "elaborations": [
        {
          "name": "Relleno de Chocolate",
          "order": 1,
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
      ]
    },
    {
      "name": "Pavlova con Fresa",
      "isDefault": false,
      "orderNumber": 2,
      "elaborations": [
        {
          "name": "Relleno de Fresa",
          "order": 1,
          "ingredients": [
            {
              "ingredientId": "uuid",
              "ingredientName": "Strawberries",
              "quantity": 0.5,
              "units": "kg",
              "cost": 10.00
            }
          ]
        }
      ]
    }
  ]
}
```

**Notes:**

- `elaborations`: Required array of base elaborations (with `variationId = null`)
- `elaborations[].ingredients`: Array of ingredients specific to that elaboration
- **DO NOT SEND** `elaborations[].cost` in request - backend calculates it automatically
- **DO NOT SEND** `elaborations[].variationId` in base elaborations - it will be NULL
- `variations`: **NEW** - Optional array of recipe variations
  - Each variation must have `name`, `orderNumber`, and at least one elaboration
  - `isDefault`: Mark one variation as the default (optional, defaults to false)
  - Variation elaborations support the same fields as base elaborations
- **DO NOT SEND** `totalCost` in request - backend calculates as sum of all base elaboration costs
- **DO NOT SEND** `unitCost` in request - backend calculates as `totalCost / units` (if units provided)
- `multipliers`: Optional, only for categories "queque", "relleno", "cubierta"
  - Stored in specific tables: `cake_multipliers`, `filling_multipliers`, `covering_multipliers`
  - Each table has UNIQUE constraint on `(recipe_id, size)`
- For "unidad" and "otro" categories, multipliers should NOT be included
- When updating a recipe with multipliers, old multipliers are deleted and replaced with new ones
- When updating a recipe with variations, old variations are deleted and replaced with new ones

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

Get all supplies for authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
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

Get all orders for authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**

- `status` (optional): Filter by status
- `startDate` (optional): Filter by delivery date (from)
- `endDate` (optional): Filter by delivery date (to)

**Response (200):**

```json
[
  {
    "id": "uuid",
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

#### GET /api/orders/:id

Get a specific order by ID.

**Headers:** `Authorization: Bearer {token}`

**Response (200):** Same structure as individual order in GET /api/orders

**Response (404):** Order not found or user doesn't have access

#### POST /api/orders

Create a new order.

**Headers:** `Authorization: Bearer {token}`

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

Update cake topper information for an order.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "needsCakeTopper": true,
  "cakeTopperProviderId": "uuid-of-provider",
  "cakeTopperDetails": "Custom text or details about the topper"
}
```

**Response (200):** Updated order object

**Notes:**
- All fields are optional
- `cakeTopperProviderId` references a user with the `cake_topper_provider` role
- If `needsCakeTopper` is set to false, `cakeTopperProviderId` and `cakeTopperDetails` are cleared

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

#### GET /api/expenses/:id

Get a specific expense by ID.

**Headers:** `Authorization: Bearer {token}`

**Response (200):** Same structure as individual expense in GET /api/expenses

**Response (404):** Expense not found or user doesn't have access

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

Get all quotations for authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
[
  {
    "id": "uuid",
    "clientName": "María González",
    "size": "mediano",
    "recipes": [
      {
        "recipeId": "uuid",
        "recipeName": "Pavlova",
        "variationId": "var-1",
        "variationName": "Pavlova con Chocolate",
        "recipeType": {
          "id": "uuid",
          "name": "unidad",
          "description": "Receta por unidad"
        },
        "unitCost": 5000.00,
        "quantity": 6,
        "totalCost": 30000.00
      },
      {
        "recipeId": "uuid",
        "recipeName": "Queque de Vainilla",
        "variationId": null,
        "variationName": null,
        "recipeType": {
          "id": "uuid",
          "name": "queque",
          "description": "Receta de queque o bizcocho"
        },
        "unitCost": 2000.00,
        "quantity": 1,
        "totalCost": 2000.00
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
    "totalCost": 13300.00,
    "notes": "Cliente prefiere bajo azúcar",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

#### GET /api/quotations/:id

Get a specific quotation by ID.

**Headers:** `Authorization: Bearer {token}`

**Response (200):** Same structure as individual quotation in GET /api/quotations

**Response (404):** Quotation not found or user doesn't have access

#### POST /api/quotations

Create a new quotation.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "clientName": "María González",
  "size": "mediano",
  "recipes": [
    {
      "recipeId": "uuid",
      "recipeName": "Pavlova",
      "variationId": "var-1",
      "variationName": "Pavlova con Chocolate",
      "recipeTypeId": "uuid",
      "unitCost": 5000.00,
      "quantity": 6,
      "totalCost": 30000.00
    },
    {
      "recipeId": "uuid",
      "recipeName": "Queque de Vainilla",
      "variationId": null,
      "variationName": null,
      "recipeTypeId": "uuid",
      "unitCost": 2000.00,
      "quantity": 1,
      "totalCost": 2000.00
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
  "totalCost": 34800.00,
  "notes": "Cliente prefiere bajo azúcar"
}
```

**Response (201):** Created quotation object with populated `recipeType` details

**Notes:**

- `recipeTypeId` in each recipe is **required** and references an existing recipe type from `recipe_types` table
- `variationId`: **NEW** - Optional UUID referencing a specific recipe variation
- `variationName`: **NEW** - Optional name of the selected variation (stored for reference)
- When `variationId` is NULL, the base recipe is used (no variation)
- When `variationId` is provided, it should reference a valid variation from `recipe_variations` table
- The recipe type details are populated when the quotation is retrieved
- `totalCost` is automatically calculated by summing all recipe costs, supply costs, and additional expenses

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

### Organizations

#### GET /api/organizations/logo-by-email

Get organization logo by user email (public endpoint, no authentication required).

**Query Parameters:**

- `email` (required): User email address

**Response (200):**

```json
{
  "success": true,
  "logoUrl": "https://storage.example.com/logos/company-logo.png"
}
```

**Response (404):** Organization not found for this email

**Notes:**
- This endpoint is public and does not require authentication
- Used for displaying organization branding on login pages

#### GET /api/organizations

Get all organizations for the authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "organizationId": "uuid",
      "organizationName": "Bakery Inc",
      "organizationSlug": "bakery-inc",
      "organizationLogoUrl": "https://storage.example.com/logos/logo.png",
      "userRole": "owner",
      "joinedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### GET /api/organizations/:id

Get organization details by ID.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Bakery Inc",
    "slug": "bakery-inc",
    "logoUrl": "https://storage.example.com/logos/logo.png",
    "subscriptionStatus": "trial",
    "subscriptionPlan": "free",
    "subscriptionStripeCustomerId": "cus_xxx",
    "subscriptionStripeSubscriptionId": "sub_xxx",
    "trialEndsAt": "2024-02-15T10:30:00Z",
    "settings": {},
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (404):** Organization not found or user doesn't have access

#### POST /api/organizations

Create a new organization.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Bakery Inc",
  "slug": "bakery-inc"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Bakery Inc",
    "slug": "bakery-inc",
    "logoUrl": null,
    "subscriptionStatus": "trial",
    "subscriptionPlan": "free",
    "subscriptionStripeCustomerId": null,
    "subscriptionStripeSubscriptionId": null,
    "trialEndsAt": "2024-02-15T10:30:00Z",
    "settings": {},
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Notes:**
- The creator automatically becomes the organization owner
- Trial period is 30 days from creation
- Slug must be unique, lowercase, alphanumeric with hyphens

#### PUT /api/organizations/:id

Update organization details.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Bakery Inc Updated",
  "logoUrl": "https://storage.example.com/logos/new-logo.png",
  "settings": {
    "timezone": "America/Costa_Rica",
    "currency": "CRC"
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Bakery Inc Updated",
    "slug": "bakery-inc",
    "logoUrl": "https://storage.example.com/logos/new-logo.png",
    "subscriptionStatus": "trial",
    "subscriptionPlan": "free",
    "subscriptionStripeCustomerId": null,
    "subscriptionStripeSubscriptionId": null,
    "trialEndsAt": "2024-02-15T10:30:00Z",
    "settings": {
      "timezone": "America/Costa_Rica",
      "currency": "CRC"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T15:45:00Z"
  }
}
```

**Notes:**
- Only organization owners and admins can update organization details
- Slug cannot be changed after creation

#### GET /api/organizations/:id/members

Get all members of an organization.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "member-uuid",
      "organizationId": "org-uuid",
      "userId": "user-uuid",
      "role": "owner",
      "joinedAt": "2024-01-15T10:30:00Z",
      "user": {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

#### POST /api/organizations/:id/members

Add a member to an organization (requires existing user).

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "userId": "user-uuid",
  "role": "member"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "member-uuid",
    "organizationId": "org-uuid",
    "userId": "user-uuid",
    "role": "member",
    "joinedAt": "2024-01-15T10:30:00Z",
    "user": {
      "id": "user-uuid",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
}
```

**Notes:**
- User must already have an account in the system
- Only organization owners and admins can add members
- Valid roles: `owner`, `admin`, `member`

#### POST /api/organizations/:id/members/by-email

Add a member to an organization by email (creates invitation if user doesn't exist).

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "email": "newuser@example.com",
  "role": "member",
  "name": "New User"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Welcome email sent to newuser@example.com",
  "data": {
    "id": "member-uuid",
    "organizationId": "org-uuid",
    "userId": "user-uuid",
    "role": "member",
    "joinedAt": "2024-01-15T10:30:00Z",
    "user": {
      "id": "user-uuid",
      "name": "New User",
      "email": "newuser@example.com"
    }
  }
}
```

**Notes:**
- If user doesn't exist, a new account is created with a temporary password
- Welcome email is sent with login instructions
- Email is logged in `email_logs` table

#### GET /api/organizations/:orgId/members/:userId

Get a specific member's details.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "member-uuid",
    "organizationId": "org-uuid",
    "userId": "user-uuid",
    "role": "member",
    "joinedAt": "2024-01-15T10:30:00Z",
    "user": {
      "id": "user-uuid",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
}
```

**Response (404):** Member not found

#### PUT /api/organizations/:orgId/members/:userId

Update a member's role.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "role": "admin"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "member-uuid",
    "organizationId": "org-uuid",
    "userId": "user-uuid",
    "role": "admin",
    "joinedAt": "2024-01-15T10:30:00Z",
    "user": {
      "id": "user-uuid",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
}
```

**Notes:**
- Only organization owners can change roles
- Valid roles: `owner`, `admin`, `member`

#### DELETE /api/organizations/:orgId/members/:userId

Remove a member from an organization.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Notes:**
- Only organization owners and admins can remove members
- Cannot remove the last owner of an organization

#### GET /api/organizations/:id/members/:memberId/email-status

Get the email delivery status for a member's welcome email.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "emailLogs": [
      {
        "id": "log-uuid",
        "email": "user@example.com",
        "emailType": "welcome",
        "status": "sent",
        "resendEmailId": "re_xxxxx",
        "errorMessage": null,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:05Z"
      }
    ]
  }
}
```

#### POST /api/organizations/:id/members/:memberId/resend-welcome

Resend welcome email to a member.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "message": "Welcome email resent successfully"
}
```

**Notes:**
- Only organization owners and admins can resend welcome emails
- Creates a new entry in `email_logs` table

---

### Recipe Parameters

Recipe parameters are global organization-level values that can be referenced in recipe variations (e.g., "Relleno_Cupcake", "Relleno_Pavlova"). They allow organizations to define reusable values across multiple recipes.

#### GET /api/organizations/:orgId/recipe-parameters

Get all recipe parameters for an organization.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "parameterKey": "Relleno_Cupcake",
      "value": 50.00,
      "unit": "gr",
      "description": "Cantidad de relleno para cupcakes",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "organizationId": "uuid",
      "parameterKey": "Relleno_Pavlova",
      "value": 150.00,
      "unit": "gr",
      "description": "Cantidad de relleno para pavlova",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Notes:**
- Returns all parameters ordered by `parameterKey` alphabetically
- User must be a member of the organization to access its parameters

#### GET /api/organizations/:orgId/recipe-parameters/:id

Get a specific recipe parameter by ID.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organizationId": "uuid",
    "parameterKey": "Relleno_Cupcake",
    "value": 50.00,
    "unit": "gr",
    "description": "Cantidad de relleno para cupcakes",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (404):** Recipe parameter not found

#### POST /api/organizations/:orgId/recipe-parameters

Create a new recipe parameter.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "parameterKey": "Relleno_Cupcake",
  "value": 50.00,
  "unit": "gr",
  "description": "Cantidad de relleno para cupcakes"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organizationId": "uuid",
    "parameterKey": "Relleno_Cupcake",
    "value": 50.00,
    "unit": "gr",
    "description": "Cantidad de relleno para cupcakes",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (409):** A parameter with the same key already exists for this organization

**Notes:**
- `parameterKey` must be unique per organization (enforced by UNIQUE constraint)
- `parameterKey`, `value`, and `unit` are required fields
- `description` is optional

#### PUT /api/organizations/:orgId/recipe-parameters/:id

Update a recipe parameter.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "parameterKey": "Relleno_Cupcake_Grande",
  "value": 75.00,
  "unit": "gr",
  "description": "Cantidad de relleno para cupcakes grandes"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organizationId": "uuid",
    "parameterKey": "Relleno_Cupcake_Grande",
    "value": 75.00,
    "unit": "gr",
    "description": "Cantidad de relleno para cupcakes grandes",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T14:20:00Z"
  }
}
```

**Response (404):** Recipe parameter not found
**Response (409):** A parameter with the new key already exists

**Notes:**
- All fields are optional in the update
- When changing `parameterKey`, the new key must not conflict with existing parameters

#### DELETE /api/organizations/:orgId/recipe-parameters/:id

Delete a recipe parameter.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "message": "Recipe parameter deleted successfully"
}
```

**Response (404):** Recipe parameter not found

**Notes:**
- Deleting a parameter that is referenced by recipe elaborations may cause issues
- Consider implementing a soft delete or validation before deletion in production

---

### Users

#### GET /api/users/:id/roles

Get all roles for a specific user.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "roles": ["owner", "cake_topper_provider"]
  }
}
```

**Notes:**
- Users can have multiple roles from `user_roles` table
- Valid roles: `super_admin`, `owner`, `cake_topper_provider`

---

### Subscription Plans

#### GET /api/subscription-plans

Get all active subscription plans.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**

- `includeInactive` (optional): Set to `true` to include inactive plans (default: `false`)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Starter",
      "slug": "starter",
      "priceMonthly": 9.99,
      "priceYearly": 99.99,
      "maxOrdersPerMonth": 50,
      "maxUsers": 3,
      "maxStorageGb": 5,
      "features": {
        "customBranding": false,
        "advancedReports": false,
        "prioritySupport": false
      },
      "stripePriceId": "price_xxxxx",
      "active": true,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Professional",
      "slug": "professional",
      "priceMonthly": 29.99,
      "priceYearly": 299.99,
      "maxOrdersPerMonth": 200,
      "maxUsers": 10,
      "maxStorageGb": 50,
      "features": {
        "customBranding": true,
        "advancedReports": true,
        "prioritySupport": true
      },
      "stripePriceId": "price_yyyyy",
      "active": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/subscription-plans/:id

Get a specific subscription plan by ID.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Professional",
    "slug": "professional",
    "priceMonthly": 29.99,
    "priceYearly": 299.99,
    "maxOrdersPerMonth": 200,
    "maxUsers": 10,
    "maxStorageGb": 50,
    "features": {
      "customBranding": true,
      "advancedReports": true,
      "prioritySupport": true
    },
    "stripePriceId": "price_yyyyy",
    "active": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Response (404):** Subscription plan not found

#### POST /api/subscription-plans

Create a new subscription plan (Super Admin only).

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Enterprise",
  "slug": "enterprise",
  "priceMonthly": 99.99,
  "priceYearly": 999.99,
  "maxOrdersPerMonth": null,
  "maxUsers": null,
  "maxStorageGb": 500,
  "features": {
    "customBranding": true,
    "advancedReports": true,
    "prioritySupport": true,
    "dedicatedSupport": true,
    "customIntegrations": true
  },
  "stripePriceId": "price_zzzzz",
  "active": true
}
```

**Response (201):** Created subscription plan object

**Notes:**
- Only users with `super_admin` role can create plans
- `slug` and `name` must be unique
- `null` values for max limits mean unlimited

#### PUT /api/subscription-plans/:id

Update a subscription plan (Super Admin only).

**Headers:** `Authorization: Bearer {token}`

**Request:** Same as POST

**Response (200):** Updated subscription plan object

**Notes:**
- Only users with `super_admin` role can update plans

#### DELETE /api/subscription-plans/:id

Delete a subscription plan (Super Admin only).

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "message": "Subscription plan deleted successfully"
}
```

**Notes:**
- Only users with `super_admin` role can delete plans
- Cannot delete a plan if organizations are currently using it

---

### Super Admin

All endpoints in this section require the `super_admin` role.

#### GET /api/super-admin/organizations

Get all organizations (Super Admin only).

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Bakery Inc",
      "slug": "bakery-inc",
      "logoUrl": "https://storage.example.com/logos/logo.png",
      "subscriptionStatus": "active",
      "subscriptionPlan": "professional",
      "subscriptionStripeCustomerId": "cus_xxx",
      "subscriptionStripeSubscriptionId": "sub_xxx",
      "trialEndsAt": null,
      "settings": {},
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T15:45:00Z"
    }
  ]
}
```

#### POST /api/super-admin/organizations

Create a new organization (Super Admin only).

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "New Bakery",
  "slug": "new-bakery",
  "ownerEmail": "owner@newbakery.com",
  "ownerName": "Owner Name"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "uuid",
      "name": "New Bakery",
      "slug": "new-bakery",
      "logoUrl": null,
      "subscriptionStatus": "trial",
      "subscriptionPlan": "free",
      "subscriptionStripeCustomerId": null,
      "subscriptionStripeSubscriptionId": null,
      "trialEndsAt": "2024-02-15T10:30:00Z",
      "settings": {},
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "owner": {
      "id": "user-uuid",
      "email": "owner@newbakery.com",
      "name": "Owner Name",
      "role": "owner"
    }
  }
}
```

**Notes:**
- Creates organization and owner account if email doesn't exist
- Sends welcome email to owner
- Owner is automatically added as organization member with `owner` role

#### PATCH /api/super-admin/organizations/:id/subscription

Update organization subscription (Super Admin only).

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "subscriptionStatus": "active",
  "subscriptionPlan": "professional",
  "subscriptionStripeCustomerId": "cus_xxx",
  "subscriptionStripeSubscriptionId": "sub_xxx",
  "trialEndsAt": null
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Bakery Inc",
    "slug": "bakery-inc",
    "logoUrl": "https://storage.example.com/logos/logo.png",
    "subscriptionStatus": "active",
    "subscriptionPlan": "professional",
    "subscriptionStripeCustomerId": "cus_xxx",
    "subscriptionStripeSubscriptionId": "sub_xxx",
    "trialEndsAt": null,
    "settings": {},
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T15:45:00Z"
  }
}
```

**Notes:**
- All fields are optional
- Valid subscription statuses: `trial`, `active`, `cancelled`, `past_due`

#### POST /api/super-admin/organizations/:id/impersonate

Generate an impersonation token to access organization as its owner (Super Admin only).

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "success": true,
  "token": "impersonation-jwt-token",
  "organization": {
    "id": "uuid",
    "name": "Bakery Inc",
    "slug": "bakery-inc"
  }
}
```

**Notes:**
- Token allows super admin to act as organization owner
- Used for support and troubleshooting
- Impersonation sessions are logged for audit trail

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

- All endpoints require valid JWT token (except signup/login/refresh/forgot-password/reset-password and public endpoints)
- Multi-tenant architecture: users can access data through their organizations via `organization_members` table
- Role-based access control using `user_roles` table for global roles and `organization_members.role` for organization-specific roles
- **Global Roles** (stored in `user_roles` table):
  - `super_admin`: Full access to all system resources, can manage all organizations and subscription plans
  - `owner`: Bakery owner, can access bakery management features
  - `cake_topper_provider`: Limited to viewing orders with `needsCakeTopper=true`
- **Organization Roles** (stored in `organization_members.role`):
  - `owner`: Full control over organization, can manage members and settings
  - `admin`: Can manage organization data and members (limited settings access)
  - `member`: Can view and edit organization data (no administrative access)
- Organization-scoped data access enforced via JOIN with `organization_members`
- Super admin endpoints require `super_admin` role validation via `requireSuperAdmin` middleware

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
- Email delivery tracking via `email_logs` table for security audit
- Password reset tokens expire after 1 hour
- Temporary passwords for invited users must be changed on first login
- Cascade deletion rules to prevent orphaned data
- Foreign key constraints for data integrity
- Sanitize error messages (no stack traces in production)
- Organization slug validation (lowercase, alphanumeric with hyphens only)
- Impersonation tokens are logged for audit compliance
- Multi-factor authentication support ready (infrastructure in place)

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

**New Interfaces Required:**

```typescript
// src/types/organization.ts
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  subscriptionStatus: 'trial' | 'active' | 'cancelled' | 'past_due';
  subscriptionPlan: string;
  subscriptionStripeCustomerId: string | null;
  subscriptionStripeSubscriptionId: string | null;
  trialEndsAt: Date | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserOrganization {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationLogoUrl: string | null;
  userRole: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// src/types/subscription-plan.ts
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number | null;
  maxOrdersPerMonth: number | null;
  maxUsers: number | null;
  maxStorageGb: number | null;
  features: Record<string, unknown>;
  stripePriceId: string | null;
  active: boolean;
  createdAt: Date;
}

// src/types/email.ts
export interface EmailLog {
  id: string;
  email: string;
  emailType: 'welcome' | 'password_reset' | 'invitation' | 'notification';
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  resendEmailId: string | null;
  errorMessage: string | null;
  organizationId: string | null;
  userId: string | null;
  organizationMemberId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// src/types/password-reset.ts
export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// src/types/user.ts - Update existing interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'owner' | 'cake_topper_provider';
  roles?: Array<'super_admin' | 'owner' | 'cake_topper_provider'>; // For users with multiple roles
  createdAt: Date;
  updatedAt: Date;
}

// src/types/recipe-parameter.ts
export interface RecipeParameter {
  id: string;
  organizationId: string;
  parameterKey: string;
  value: number;
  unit: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// src/types/recipe-variation.ts
export interface RecipeVariation {
  id: string;
  recipeId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  orderNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

// src/types/recipe.ts - Update RecipeElaboration interface
export interface RecipeElaboration {
  id: string;
  recipeId: string;
  name: string;
  orderNumber: number;
  variationId?: string | null; // New field for variations
  cost?: number; // Calculated field
  ingredients: RecipeIngredient[];
  createdAt: Date;
}
```

---

## Database Indexes

### Performance Indexes

All foreign key relationships have indexes:

- `idx_ingredients_user_id`
- `idx_recipes_user_id`
- `idx_recipe_elaborations_recipe_id`
- `idx_recipe_ingredients_elaboration_id`
- `idx_recipe_ingredients_ingredient_id`
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
- `idx_quotation_additional_expenses_quotation_id`
- `idx_filling_multipliers_recipe_id`
- `idx_covering_multipliers_recipe_id`
- `idx_cake_multipliers_recipe_id`
- `idx_refresh_tokens_user_id`
- `idx_password_reset_tokens_user_id`
- `idx_password_reset_tokens_token`
- `idx_password_reset_tokens_expires_at`
- `idx_subscription_plans_slug`
- `idx_subscription_plans_active`
- `idx_organizations_slug`
- `idx_organizations_subscription_status`
- `idx_organization_members_org_id`
- `idx_organization_members_user_id`
- `idx_email_logs_email`
- `idx_email_logs_status`
- `idx_email_logs_email_type`
- `idx_email_logs_organization_id`
- `idx_email_logs_user_id`
- `idx_email_logs_org_member_id`
- `idx_email_logs_created_at`
- `idx_email_logs_member_type_created`
- `idx_recipe_parameters_org_id`
- `idx_recipe_variations_recipe_id`
- `idx_recipe_elaborations_variation_id`

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
- `password_reset_tokens.token` - UNIQUE
- `subscription_plans.name` - UNIQUE
- `subscription_plans.slug` - UNIQUE
- `organizations.slug` - UNIQUE
- `organization_members(organization_id, user_id)` - UNIQUE
- `recipe_parameters(organization_id, parameter_key)` - UNIQUE

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
