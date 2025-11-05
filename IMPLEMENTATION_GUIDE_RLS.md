# Guía de Implementación Multi-Tenant con RLS

Esta guía detalla todos los cambios necesarios para implementar el sistema multi-tenant en Holy Moly con Row Level Security (RLS).

## 📋 Tabla de Contenidos

1. [Cambios en Base de Datos](#1-cambios-en-base-de-datos)
2. [Migración de Datos Existentes](#2-migración-de-datos-existentes)
3. [Cambios en el Backend API](#3-cambios-en-el-backend-api)
4. [Nuevos Endpoints API](#4-nuevos-endpoints-api)
5. [Validación y Testing](#5-validación-y-testing)

---

## 1. Cambios en Base de Datos

### Script SQL Completo

Ejecuta el siguiente script SQL en tu base de datos PostgreSQL:

```sql
-- =====================================================
-- PHASE 1: Multi-Tenant Database with Custom Auth RLS
-- =====================================================

-- Step 1: Create enums
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'staff', 'viewer');
CREATE TYPE app_role AS ENUM ('super_admin', 'owner', 'cake_topper_provider');

-- Step 2: Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_plan VARCHAR(50) DEFAULT 'free',
  subscription_stripe_customer_id VARCHAR(255),
  subscription_stripe_subscription_id VARCHAR(255),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Step 3: Create organization_members table
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role organization_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);

-- Step 4: Update user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to get current user ID from session variable
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
$$;

-- Function to check if user has a global role
CREATE OR REPLACE FUNCTION has_global_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has org role
CREATE OR REPLACE FUNCTION has_org_role(_user_id UUID, _org_id UUID, _role organization_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
  )
$$;

-- Function to check if user is org member
CREATE OR REPLACE FUNCTION is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name VARCHAR,
  organization_slug VARCHAR,
  user_role organization_role,
  joined_at TIMESTAMP WITH TIME ZONE
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
    om.role,
    om.joined_at
  FROM organizations o
  INNER JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = _user_id
  ORDER BY om.joined_at DESC
$$;

-- =====================================================
-- MIGRATE EXISTING TABLES
-- =====================================================

-- Add organization_id and user_id to ingredients
ALTER TABLE ingredients
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_ingredients_organization_id ON ingredients(organization_id);
CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);

-- Add organization_id and user_id to recipes
ALTER TABLE recipes
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_recipes_organization_id ON recipes(organization_id);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);

-- Add organization_id and user_id to supplies
ALTER TABLE supplies
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_supplies_organization_id ON supplies(organization_id);
CREATE INDEX idx_supplies_user_id ON supplies(user_id);

-- Add organization_id and user_id to orders
ALTER TABLE orders
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_organization_id ON orders(organization_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Add organization_id and user_id to quotations
ALTER TABLE quotations
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_quotations_organization_id ON quotations(organization_id);
CREATE INDEX idx_quotations_user_id ON quotations(user_id);

-- Add organization_id and user_id to expenses
ALTER TABLE expenses
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organizations: Members can view their organizations
CREATE POLICY "Members can view their organizations"
ON organizations FOR SELECT
USING (
  is_org_member(current_app_user_id(), id)
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- Organizations: Anyone authenticated can create (will become owner via trigger)
CREATE POLICY "Authenticated users can create organizations"
ON organizations FOR INSERT
WITH CHECK (current_app_user_id() IS NOT NULL);

-- Organizations: Owners can update
CREATE POLICY "Owners can update their organizations"
ON organizations FOR UPDATE
USING (
  has_org_role(current_app_user_id(), id, 'owner')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- Organizations: Owners can delete
CREATE POLICY "Owners can delete their organizations"
ON organizations FOR DELETE
USING (
  has_org_role(current_app_user_id(), id, 'owner')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- Enable RLS on organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Members: Can view members of their organizations
CREATE POLICY "Members can view org members"
ON organization_members FOR SELECT
USING (
  is_org_member(current_app_user_id(), organization_id)
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- Members: Owners and admins can add members
CREATE POLICY "Owners and admins can add members"
ON organization_members FOR INSERT
WITH CHECK (
  has_org_role(current_app_user_id(), organization_id, 'owner')
  OR has_org_role(current_app_user_id(), organization_id, 'admin')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- Members: Owners and admins can update roles
CREATE POLICY "Owners and admins can update roles"
ON organization_members FOR UPDATE
USING (
  has_org_role(current_app_user_id(), organization_id, 'owner')
  OR has_org_role(current_app_user_id(), organization_id, 'admin')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- Members: Owners and admins can remove members
CREATE POLICY "Owners and admins can remove members"
ON organization_members FOR DELETE
USING (
  has_org_role(current_app_user_id(), organization_id, 'owner')
  OR has_org_role(current_app_user_id(), organization_id, 'admin')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- =====================================================
-- RLS POLICIES FOR DATA TABLES
-- =====================================================

-- INGREDIENTS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org ingredients"
ON ingredients FOR SELECT
USING (
  is_org_member(current_app_user_id(), organization_id)
  OR has_global_role(current_app_user_id(), 'super_admin')
);

CREATE POLICY "Members can create ingredients"
ON ingredients FOR INSERT
WITH CHECK (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Members can update ingredients"
ON ingredients FOR UPDATE
USING (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Owners and admins can delete ingredients"
ON ingredients FOR DELETE
USING (
  has_org_role(current_app_user_id(), organization_id, 'owner')
  OR has_org_role(current_app_user_id(), organization_id, 'admin')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- RECIPES
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org recipes"
ON recipes FOR SELECT
USING (
  is_org_member(current_app_user_id(), organization_id)
  OR has_global_role(current_app_user_id(), 'super_admin')
);

CREATE POLICY "Members can create recipes"
ON recipes FOR INSERT
WITH CHECK (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Members can update recipes"
ON recipes FOR UPDATE
USING (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Owners and admins can delete recipes"
ON recipes FOR DELETE
USING (
  has_org_role(current_app_user_id(), organization_id, 'owner')
  OR has_org_role(current_app_user_id(), organization_id, 'admin')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- SUPPLIES
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org supplies"
ON supplies FOR SELECT
USING (
  is_org_member(current_app_user_id(), organization_id)
  OR has_global_role(current_app_user_id(), 'super_admin')
);

CREATE POLICY "Members can create supplies"
ON supplies FOR INSERT
WITH CHECK (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Members can update supplies"
ON supplies FOR UPDATE
USING (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Owners and admins can delete supplies"
ON supplies FOR DELETE
USING (
  has_org_role(current_app_user_id(), organization_id, 'owner')
  OR has_org_role(current_app_user_id(), organization_id, 'admin')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org orders"
ON orders FOR SELECT
USING (
  is_org_member(current_app_user_id(), organization_id)
  OR has_global_role(current_app_user_id(), 'super_admin')
  OR has_global_role(current_app_user_id(), 'cake_topper_provider')
);

CREATE POLICY "Members can create orders"
ON orders FOR INSERT
WITH CHECK (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Members and topper providers can update orders"
ON orders FOR UPDATE
USING (
  is_org_member(current_app_user_id(), organization_id)
  OR has_global_role(current_app_user_id(), 'cake_topper_provider')
);

CREATE POLICY "Owners and admins can delete orders"
ON orders FOR DELETE
USING (
  has_org_role(current_app_user_id(), organization_id, 'owner')
  OR has_org_role(current_app_user_id(), organization_id, 'admin')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- QUOTATIONS
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org quotations"
ON quotations FOR SELECT
USING (
  is_org_member(current_app_user_id(), organization_id)
  OR has_global_role(current_app_user_id(), 'super_admin')
);

CREATE POLICY "Members can create quotations"
ON quotations FOR INSERT
WITH CHECK (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Members can update quotations"
ON quotations FOR UPDATE
USING (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Owners and admins can delete quotations"
ON quotations FOR DELETE
USING (
  has_org_role(current_app_user_id(), organization_id, 'owner')
  OR has_org_role(current_app_user_id(), organization_id, 'admin')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- EXPENSES
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org expenses"
ON expenses FOR SELECT
USING (
  is_org_member(current_app_user_id(), organization_id)
  OR has_global_role(current_app_user_id(), 'super_admin')
);

CREATE POLICY "Members can create expenses"
ON expenses FOR INSERT
WITH CHECK (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Members can update expenses"
ON expenses FOR UPDATE
USING (
  is_org_member(current_app_user_id(), organization_id)
);

CREATE POLICY "Owners and admins can delete expenses"
ON expenses FOR DELETE
USING (
  has_org_role(current_app_user_id(), organization_id, 'owner')
  OR has_org_role(current_app_user_id(), organization_id, 'admin')
  OR has_global_role(current_app_user_id(), 'super_admin')
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to auto-add creator as owner when creating an organization
CREATE OR REPLACE FUNCTION handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (NEW.id, current_app_user_id(), 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_organization();

-- Trigger to update updated_at on organizations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 2. Migración de Datos Existentes

Después de ejecutar el script SQL anterior, ejecuta estos comandos para migrar tus datos existentes:

```sql
-- Paso 1: Crear organización por defecto
INSERT INTO organizations (name, slug, subscription_status, subscription_plan)
VALUES ('Holy Moly Bakery', 'holy-moly', 'active', 'professional')
RETURNING id;

-- GUARDA EL ID QUE RETORNA ESTE COMANDO
-- Reemplaza 'ORGANIZATION_ID_AQUI' en los siguientes comandos con ese ID

-- Paso 2: Asignar todos los usuarios existentes como 'owner' de la organización
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 'ORGANIZATION_ID_AQUI', id, 'owner'
FROM users;

-- Paso 3: Migrar datos existentes a la organización por defecto
-- (Usa el primer usuario como creador por defecto)
UPDATE ingredients 
SET organization_id = 'ORGANIZATION_ID_AQUI', 
    user_id = (SELECT id FROM users LIMIT 1)
WHERE organization_id IS NULL;

UPDATE recipes 
SET organization_id = 'ORGANIZATION_ID_AQUI', 
    user_id = (SELECT id FROM users LIMIT 1)
WHERE organization_id IS NULL;

UPDATE supplies 
SET organization_id = 'ORGANIZATION_ID_AQUI', 
    user_id = (SELECT id FROM users LIMIT 1)
WHERE organization_id IS NULL;

UPDATE orders 
SET organization_id = 'ORGANIZATION_ID_AQUI', 
    user_id = (SELECT id FROM users LIMIT 1)
WHERE organization_id IS NULL;

UPDATE quotations 
SET organization_id = 'ORGANIZATION_ID_AQUI', 
    user_id = (SELECT id FROM users LIMIT 1)
WHERE organization_id IS NULL;

UPDATE expenses 
SET organization_id = 'ORGANIZATION_ID_AQUI', 
    user_id = (SELECT id FROM users LIMIT 1)
WHERE organization_id IS NULL;

-- Paso 4: Hacer organization_id NOT NULL (después de verificar que todos tienen valor)
ALTER TABLE ingredients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE supplies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE quotations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN organization_id SET NOT NULL;
```

---

## 3. Cambios en el Backend API

### 3.1 Middleware para PostgreSQL Session

Crea un nuevo archivo `middleware/setPostgresUser.js`:

```javascript
const setPostgresUser = async (req, res, next) => {
  if (req.user && req.user.id) {
    try {
      // Establece la variable de sesión para RLS
      await req.db.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    } catch (error) {
      console.error('Error setting PostgreSQL user:', error);
    }
  }
  next();
};

module.exports = setPostgresUser;
```

### 3.2 Modificación de Endpoints Existentes

**IMPORTANTE:** Cada endpoint protegido debe:
1. Usar un cliente de conexión dedicado
2. Iniciar transacción (`BEGIN`)
3. Establecer `app.current_user_id`
4. Ejecutar las consultas
5. Hacer `COMMIT` o `ROLLBACK`

#### Ejemplo: GET /api/ingredients

```javascript
// ANTES
router.get('/ingredients', authenticateToken, async (req, res) => {
  const result = await db.query('SELECT * FROM ingredients');
  res.json(result.rows);
});

// DESPUÉS
router.get('/ingredients', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query('SELECT * FROM ingredients ORDER BY created_at DESC');
    
    await client.query('COMMIT');
    res.json(result.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

#### Ejemplo: POST /api/ingredients

```javascript
router.post('/ingredients', authenticateToken, async (req, res) => {
  const { name, provider, qtyProvider, units, cost, organizationId } = req.body;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      `INSERT INTO ingredients 
       (name, provider, qty_provider, units, cost, organization_id, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [name, provider, qtyProvider, units, cost, organizationId, req.user.id]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating ingredient:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

#### Ejemplo: PUT /api/ingredients/:id

```javascript
router.put('/ingredients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, provider, qtyProvider, units, cost } = req.body;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      `UPDATE ingredients 
       SET name = $1, provider = $2, qty_provider = $3, units = $4, cost = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, provider, qtyProvider, units, cost, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ingredient not found or no permission' });
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating ingredient:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

#### Ejemplo: DELETE /api/ingredients/:id

```javascript
router.delete('/ingredients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      'DELETE FROM ingredients WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ingredient not found or no permission to delete' });
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

### 3.3 Endpoints que Necesitan Actualización

Aplica el mismo patrón a todos estos endpoints:

- **Ingredients:** GET, POST, PUT, DELETE `/api/ingredients`
- **Recipes:** GET, POST, PUT, DELETE `/api/recipes`
- **Supplies:** GET, POST, PUT, DELETE `/api/supplies`
- **Orders:** GET, POST, PUT, DELETE `/api/orders`
- **Quotations:** GET, POST, PUT, DELETE `/api/quotations`
- **Expenses:** GET, POST, PUT, DELETE `/api/expenses`

---

## 4. Nuevos Endpoints API

### 4.1 Organizaciones

#### GET /api/organizations
```javascript
router.get('/organizations', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      'SELECT * FROM get_user_organizations($1)',
      [req.user.id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

#### POST /api/organizations
```javascript
router.post('/organizations', authenticateToken, async (req, res) => {
  const { name, slug } = req.body;
  
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      `INSERT INTO organizations (name, slug) 
       VALUES ($1, $2) 
       RETURNING *`,
      [name, slug]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating organization:', error);
    
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Organization slug already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  } finally {
    client.release();
  }
});
```

#### GET /api/organizations/:id
```javascript
router.get('/organizations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

#### PUT /api/organizations/:id
```javascript
router.put('/organizations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, logoUrl, settings } = req.body;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      `UPDATE organizations 
       SET name = COALESCE($1, name),
           logo_url = COALESCE($2, logo_url),
           settings = COALESCE($3, settings),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, logoUrl, settings ? JSON.stringify(settings) : null, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Organization not found or no permission' });
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating organization:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

### 4.2 Miembros de Organización

#### GET /api/organizations/:id/members
```javascript
router.get('/organizations/:id/members', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      `SELECT om.*, u.name, u.email 
       FROM organization_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = $1
       ORDER BY om.joined_at DESC`,
      [id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fetching organization members:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

#### POST /api/organizations/:id/members
```javascript
router.post('/organizations/:id/members', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.body;
  
  if (!userId || !role) {
    return res.status(400).json({ error: 'userId and role are required' });
  }
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      `INSERT INTO organization_members (organization_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, userId, role]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding organization member:', error);
    
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'User is already a member of this organization' });
    } else {
      res.status(500).json({ error: error.message });
    }
  } finally {
    client.release();
  }
});
```

#### PUT /api/organizations/:orgId/members/:userId
```javascript
router.put('/organizations/:orgId/members/:userId', authenticateToken, async (req, res) => {
  const { orgId, userId } = req.params;
  const { role } = req.body;
  
  if (!role) {
    return res.status(400).json({ error: 'role is required' });
  }
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      `UPDATE organization_members
       SET role = $1
       WHERE organization_id = $2 AND user_id = $3
       RETURNING *`,
      [role, orgId, userId]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Member not found or no permission' });
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating member role:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

#### DELETE /api/organizations/:orgId/members/:userId
```javascript
router.delete('/organizations/:orgId/members/:userId', authenticateToken, async (req, res) => {
  const { orgId, userId } = req.params;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      `DELETE FROM organization_members
       WHERE organization_id = $1 AND user_id = $2
       RETURNING *`,
      [orgId, userId]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Member not found or no permission to remove' });
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing member:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

### 4.3 User Roles (Global)

#### GET /api/users/:id/roles
```javascript
router.get('/users/:id/roles', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  // Only allow users to view their own roles or super_admin
  if (req.user.id !== id && !req.user.roles?.includes('super_admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
    
    const result = await client.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows.map(r => r.role));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

---

## 5. Validación y Testing

### 5.1 Verificar la Instalación de la Base de Datos

```sql
-- Verificar que las tablas se crearon
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('organizations', 'organization_members', 'user_roles');

-- Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'organization_members', 'ingredients', 'recipes', 'supplies', 'orders', 'quotations', 'expenses');

-- Verificar funciones de seguridad
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('current_app_user_id', 'has_global_role', 'has_org_role', 'is_org_member', 'get_user_organizations');

-- Verificar datos migrados
SELECT 
  (SELECT COUNT(*) FROM organizations) as organizations_count,
  (SELECT COUNT(*) FROM organization_members) as members_count,
  (SELECT COUNT(*) FROM ingredients WHERE organization_id IS NOT NULL) as ingredients_migrated,
  (SELECT COUNT(*) FROM recipes WHERE organization_id IS NOT NULL) as recipes_migrated,
  (SELECT COUNT(*) FROM supplies WHERE organization_id IS NOT NULL) as supplies_migrated,
  (SELECT COUNT(*) FROM orders WHERE organization_id IS NOT NULL) as orders_migrated,
  (SELECT COUNT(*) FROM quotations WHERE organization_id IS NOT NULL) as quotations_migrated,
  (SELECT COUNT(*) FROM expenses WHERE organization_id IS NOT NULL) as expenses_migrated;
```

### 5.2 Probar los Nuevos Endpoints

```bash
# Obtener organizaciones del usuario
curl -X GET http://localhost:3000/api/organizations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Crear nueva organización
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Nueva Organización", "slug": "nueva-org"}'

# Obtener miembros de una organización
curl -X GET http://localhost:3000/api/organizations/ORG_ID/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Listar ingredientes (debe respetar RLS)
curl -X GET http://localhost:3000/api/ingredients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5.3 Verificar RLS

```sql
-- Establecer usuario actual manualmente para probar
SET LOCAL app.current_user_id = 'USER_ID_AQUI';

-- Intentar obtener ingredientes (solo debe ver los de sus organizaciones)
SELECT * FROM ingredients;

-- Resetear la sesión
RESET app.current_user_id;
```

---

## 📝 Checklist de Implementación

- [ ] **Base de Datos**
  - [ ] Ejecutar script SQL de creación de tablas y funciones
  - [ ] Crear organización por defecto
  - [ ] Migrar usuarios a organization_members
  - [ ] Migrar datos existentes a la organización por defecto
  - [ ] Hacer organization_id NOT NULL
  - [ ] Verificar que RLS está habilitado en todas las tablas

- [ ] **Backend API**
  - [ ] Actualizar todos los endpoints GET para usar transacciones + SET LOCAL
  - [ ] Actualizar todos los endpoints POST para usar transacciones + SET LOCAL
  - [ ] Actualizar todos los endpoints PUT para usar transacciones + SET LOCAL
  - [ ] Actualizar todos los endpoints DELETE para usar transacciones + SET LOCAL
  - [ ] Crear nuevos endpoints de organizaciones (GET, POST, PUT)
  - [ ] Crear nuevos endpoints de miembros (GET, POST, PUT, DELETE)
  - [ ] Crear endpoint de roles globales (GET)

- [ ] **Testing**
  - [ ] Probar que RLS funciona correctamente
  - [ ] Probar creación de organizaciones
  - [ ] Probar gestión de miembros
  - [ ] Probar que usuarios solo ven datos de sus organizaciones
  - [ ] Probar que super_admin puede ver todo

---

## ⚠️ Notas Importantes

1. **Cada consulta DB requiere transacción:** No olvides usar `BEGIN`, `SET LOCAL`, y `COMMIT/ROLLBACK` en cada endpoint.

2. **Connection Pool:** Usa `db.pool.connect()` para obtener un cliente dedicado y siempre haz `client.release()` en el `finally`.

3. **Manejo de errores:** Siempre haz `ROLLBACK` en el bloque `catch` antes de retornar el error.

4. **Performance:** Las transacciones extra pueden impactar el rendimiento. Monitorea y optimiza si es necesario.

5. **Frontend:** Los tipos TypeScript ya están actualizados. En fases posteriores necesitarás:
   - Actualizar AuthContext para cargar organizaciones del usuario
   - Agregar selector de organización en el UI
   - Reemplazar `"temp-org-id"` con el organization_id real del contexto

---

## 🎯 Próximos Pasos (Fases 2-5)

Después de completar esta implementación:

- **Fase 2:** Actualizar AuthContext en el frontend para manejar organizaciones
- **Fase 3:** Crear componentes UI para gestión de organizaciones
- **Fase 4:** Implementar invitaciones de miembros por email
- **Fase 5:** Integrar Stripe para suscripciones

---

¿Preguntas? Revisa la sección de validación y testing para asegurarte de que todo funcione correctamente.
