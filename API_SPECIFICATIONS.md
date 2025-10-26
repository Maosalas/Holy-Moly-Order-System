# Bakery Management System - API Specifications & Database Schema

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
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
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

### Orders Table

```sql
CREATE TYPE order_status AS ENUM (
  'waiting_for_payment',
  'partially_paid',
  'payment_received',
  'confirmed',
  'finished'
);

CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'card', 'other');

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
  payment_method payment_method NOT NULL,
  down_payment DECIMAL(10,2) DEFAULT 0 NOT NULL,
  supplies_needed TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
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

### Expenses Table

```sql
CREATE TYPE card_type AS ENUM ('amex', 'visa', 'other');

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  supermarket_name VARCHAR(255) NOT NULL,
  purchase_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  card_type card_type NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_purchase_date ON expenses(purchase_date);
```

### Quotations Table

```sql
CREATE TYPE recipe_type AS ENUM ('queque', 'relleno', 'cubierta', 'unidad');

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
  recipe_type recipe_type NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_quotation_recipes_quotation_id ON quotation_recipes(quotation_id);
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
    "name": "Chocolate Cake",
    "image": "https://storage.example.com/recipes/cake.jpg",
    "category": "queque",
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
    "totalCost": 45.80,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

**Notes:**

- `elaborations`: Array of recipe elaborations/steps, each containing its own ingredients
- `elaborations[].cost`: **CALCULATED FIELD** - Sum of all ingredient costs for that elaboration (not stored in DB)
- `totalCost`: **CALCULATED FIELD** - Sum of all elaboration costs (stored in `recipes.total_cost`)
- `unitCost`: **CALCULATED FIELD** - `totalCost / units` (stored in `recipes.unit_cost`)
- `multipliers`: Stored in separate tables based on category:
  - `category = 'queque'` → stored in `cake_multipliers` table
  - `category = 'relleno'` → stored in `filling_multipliers` table
  - `category = 'cubierta'` → stored in `covering_multipliers` table
  - `category = 'unidad'` or `'otro'` → no multipliers stored

#### POST /api/recipes

Create a new recipe.

**Headers:** `Authorization: Bearer {token}`

**Request:**

```json
{
  "name": "Chocolate Cake",
  "image": "https://storage.example.com/recipes/cake.jpg",
  "category": "queque",
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

- `elaborations`: Required array of elaborations, each with name, order, and ingredients
- `elaborations[].ingredients`: Array of ingredients specific to that elaboration
- **DO NOT SEND** `elaborations[].cost` in request - backend calculates it automatically
- **DO NOT SEND** `totalCost` in request - backend calculates as sum of all elaboration costs
- **DO NOT SEND** `unitCost` in request - backend calculates as `totalCost / units` (if units provided)
- `multipliers`: Optional, only for categories "queque", "relleno", "cubierta"
  - Stored in specific tables: `cake_multipliers`, `filling_multipliers`, `covering_multipliers`
  - Each table has UNIQUE constraint on `(recipe_id, size)`
- For "unidad" and "otro" categories, multipliers should NOT be included
- When updating a recipe with multipliers, old multipliers are deleted and replaced with new ones

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
    "paymentMethod": "cash",
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

- `deliveryDate`: TIMESTAMP TIME ZONE
- `clientPhotos`: Array of photo objects from `order_photos` table
- `quotationId` is **required** and references an existing quotation
- `statuses`: Array of status objects from `order_statuses` table (ordered by `created_at`)
- `paymentMethod`: Must be one of: the tables

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
  "paymentMethod": "cash",
  "downPayment": 100.00,
  "statuses": ["waiting_for_payment"]
}
```

**Notes:**
- `quotationId` is **required** and references an existing quotation
- `costAmount` is automatically calculated from the selected quotation's `totalCost`
- `clientPhotos` accepts both base64-encoded images and URLs
- Photos are stored in `order_photos` table with individual records
- `statuses` is sent as array of strings, stored in `order_statuses` table with timestamps
- Server validates that `downPayment` ≤ `chargeAmount`
- The quotation's details are populated when the order is retrieved

**Response (201):** Created order object

#### PUT /api/orders/:id

Update an order.

**Headers:** `Authorization: Bearer {token}`

**Request:** Same as POST

**Response (200):** Updated order object

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
    "cardType": "visa",
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
  "cardType": "visa",
  "receiptUrl": "https://storage.example.com/receipts/receipt1.jpg"
}
```

**Response (201):** Created expense object

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
        "recipeName": "Queque de Vainilla",
        "recipeType": "queque",
        "unitCost": 5000.00,
        "quantity": 1,
        "totalCost": 5000.00
      },
      {
        "recipeId": "uuid",
        "recipeName": "Relleno de Fresa",
        "recipeType": "relleno",
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
      "recipeName": "Queque de Vainilla",
      "recipeType": "queque",
      "unitCost": 5000.00,
      "quantity": 1,
      "totalCost": 5000.00
    },
    {
      "recipeId": "uuid",
      "recipeName": "Relleno de Fresa",
      "recipeType": "relleno",
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
  "notes": "Cliente prefiere bajo azúcar"
}
```

**Response (201):** Created quotation object

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

**PaymentMethod Enum:**

- **Database (SQL):** `'cash' | 'transfer' | 'card' | 'other'`
- **Frontend (TS):** Currently uses `"Efectivo" | "Transferencia" | "Link de pago/tarjeta" | "SINPE"`
- **⚠️ ACTION REQUIRED:** Update TypeScript types to match database enum or implement mapping layer

**Recommendation:** Update `src/types/order.ts`:

```typescript
export type PaymentMethod = "cash" | "transfer" | "card" | "other";
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
- `idx_supplies_user_id`
- `idx_orders_user_id`
- `idx_orders_delivery_date`
- `idx_order_photos_order_id`
- `idx_order_statuses_order_id`
- `idx_order_supplies_order_id`
- `idx_expenses_user_id`
- `idx_expenses_purchase_date`
- `idx_quotations_user_id`
- `idx_quotation_recipes_quotation_id`
- `idx_quotation_supplies_quotation_id`
- `idx_quotation_additional_expenses_quotation_id`
- `idx_filling_multipliers_recipe_id`
- `idx_covering_multipliers_recipe_id`
- `idx_cake_multipliers_recipe_id`
- `idx_refresh_tokens_user_id`

### Unique Constraints

- `users.email` - UNIQUE
- `user_roles(user_id, role)` - UNIQUE
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
