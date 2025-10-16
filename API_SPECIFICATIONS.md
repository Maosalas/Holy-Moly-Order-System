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
  image VARCHAR(500),
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
```

### Recipe Ingredients Table (Junction Table)
```sql
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  units VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  UNIQUE(recipe_id, ingredient_id)
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);
```

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
  'waiting-for-payment',
  'partially-paid',
  'payment-received',
  'confirmed',
  'finished'
);

CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'card', 'other');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  order_details TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  needs_cake_topper BOOLEAN DEFAULT false,
  cost_amount DECIMAL(10,2) NOT NULL,
  charge_amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  down_payment DECIMAL(10,2) DEFAULT 0,
  supplies_needed TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
```

### Order Photos Table
```sql
CREATE TABLE order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  photo_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
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

### Order Supplies Table (Junction Table)
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
  receipt_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
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
    "ingredients": [
      {
        "id": "uuid",
        "ingredientId": "uuid",
        "ingredientName": "Flour",
        "quantity": 2.0,
        "units": "kg",
        "cost": 10.20
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
  "unitCost": 3.82,
  "ingredients": [
    {
      "ingredientId": "uuid",
      "ingredientName": "Flour",
      "quantity": 2.0,
      "units": "kg",
      "cost": 10.20
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
  ],
  "totalCost": 45.80
}
```

**Notes:**
- `multipliers` is optional and only required for categories: "queque", "relleno", "cubierta"
- For "unidad" and "otro" categories, multipliers should not be included

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
    "clientName": "Jane Smith",
    "phoneNumber": "+1234567890",
    "orderDetails": "3-tier chocolate cake with flowers",
    "deliveryDate": "2024-02-14",
    "clientPhotos": [
      "https://storage.example.com/orders/photo1.jpg"
    ],
    "needsCakeTopper": true,
    "costAmount": 150.00,
    "chargeAmount": 300.00,
    "paymentMethod": "transfer",
    "downPayment": 100.00,
    "selectedSupplies": [
      {
        "supplyId": "uuid",
        "supplyName": "Cake Box",
        "quantity": 1,
        "unit": "piece",
        "costPerUnit": 5.00,
        "totalCost": 5.00
      }
    ],
    "suppliesNeeded": "Fresh roses, gold foil",
    "statuses": ["waiting-for-payment", "confirmed"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /api/orders
Create a new order.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "clientName": "Jane Smith",
  "phoneNumber": "+1234567890",
  "orderDetails": "3-tier chocolate cake",
  "deliveryDate": "2024-02-14",
  "clientPhotos": ["photo-url-1", "photo-url-2"],
  "needsCakeTopper": true,
  "costAmount": 150.00,
  "chargeAmount": 300.00,
  "paymentMethod": "transfer",
  "downPayment": 100.00,
  "selectedSupplies": [
    {
      "supplyId": "uuid",
      "supplyName": "Cake Box",
      "quantity": 1,
      "unit": "piece",
      "costPerUnit": 5.00,
      "totalCost": 5.00
    }
  ],
  "suppliesNeeded": "Fresh roses",
  "statuses": ["waiting-for-payment"]
}
```

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
    "totalCost": 9800.00,
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
  "totalCost": 9800.00,
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
- Use JWT tokens with 24-hour expiration
- Hash passwords with bcrypt (cost factor: 12)
- Implement refresh token mechanism
- Rate limit login attempts (5 per 15 minutes)

### Authorization
- All endpoints (except auth) require valid JWT token
- Users can only access their own data
- Role-based access for cake_topper_provider (limited to viewing orders with needsCakeTopper=true)

### Input Validation
- Validate all inputs server-side
- Sanitize SQL queries (use parameterized queries)
- Validate file uploads (type, size limits: 5MB for images)
- Implement CORS with whitelist

### Data Protection
- Use HTTPS only
- Implement rate limiting (100 requests per 15 minutes per IP)
- Log all authentication attempts
- Sanitize error messages (no stack traces in production)

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
- `429`: Too many requests
- `500`: Internal server error
