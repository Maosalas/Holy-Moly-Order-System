# Cambios en la Base de Datos

## Resumen de Cambios

Se agregaron dos nuevas funcionalidades:
1. **Ingredientes adicionales en cotizaciones** - Permite agregar ingredientes específicos que no están en las recetas
2. **Insumos en recetas** - Permite agregar supplies/materiales a las recetas (ej: cajas, etiquetas, decoraciones)

## SQL para Ejecutar

### 1. Crear tabla de ingredientes adicionales en cotizaciones

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

### 2. Crear tabla de insumos en recetas

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

## Cambios en el API

### Recetas (Recipes)

#### GET /api/recipes - Response actualizado

Ahora incluye array `supplies` (opcional):

```json
{
  "id": "uuid",
  "name": "Chocolate Cake",
  "supplies": [
    {
      "id": "uuid",
      "supplyId": "uuid",
      "supplyName": "Caja decorativa",
      "quantity": 1,
      "unit": "unidad",
      "costPerUnit": 500.00,
      "totalCost": 500.00
    }
  ],
  "totalCost": 46.50  // Ahora incluye costo de supplies
}
```

#### POST /api/recipes - Request actualizado

Ahora acepta array `supplies` (opcional):

```json
{
  "name": "Chocolate Cake",
  "supplies": [
    {
      "supplyId": "uuid",
      "supplyName": "Caja decorativa",
      "quantity": 1,
      "unit": "unidad",
      "costPerUnit": 500.00,
      "totalCost": 500.00
    }
  ]
}
```

**Notas importantes:**
- `totalCost` de la receta ahora = suma de costos de elaboraciones + suma de costos de supplies
- Al actualizar una receta, los supplies antiguos se eliminan y se reemplazan con los nuevos

### Cotizaciones (Quotations)

#### GET /api/quotations - Response actualizado

Ahora incluye array `additionalIngredients` (opcional):

```json
{
  "id": "uuid",
  "clientName": "María González",
  "additionalIngredients": [
    {
      "ingredientId": "uuid",
      "ingredientName": "Chocolate especial",
      "quantity": 0.5,
      "units": "kg",
      "costPerUnit": 3000.00,
      "totalCost": 1500.00
    }
  ],
  "totalCost": 15600.00  // Ahora incluye ingredientes adicionales
}
```

#### POST /api/quotations - Request actualizado

Ahora acepta array `additionalIngredients` (opcional):

```json
{
  "clientName": "María González",
  "additionalIngredients": [
    {
      "ingredientId": "uuid",
      "ingredientName": "Chocolate especial",
      "quantity": 0.5,
      "units": "kg",
      "costPerUnit": 3000.00,
      "totalCost": 1500.00
    }
  ]
}
```

**Notas importantes:**
- `totalCost` de la cotización ahora = suma de recetas + suma de supplies + suma de ingredientes adicionales + suma de gastos adicionales
- `additionalIngredients[].totalCost` puede ser calculado por el backend como `quantity * costPerUnit`

## Cambios en TypeScript (Frontend)

### src/types/quotation.ts

Se agregó nueva interface:

```typescript
export interface QuotationIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  units: string;
  costPerUnit: number;
  totalCost: number;
}

export interface Quotation {
  // ... otros campos
  additionalIngredients?: QuotationIngredient[];
  // ... otros campos
}
```

### src/types/recipe.ts

Se agregó nueva interface y se eliminó `wholeCost`:

```typescript
export interface RecipeSupply {
  id?: string;
  supplyId: string;
  supplyName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface Recipe {
  // ... otros campos
  supplies?: RecipeSupply[];
  // wholeCost fue ELIMINADO - ya no se usa
  // ... otros campos
}
```

## Lógica de Backend a Implementar

### Para Recetas (POST /api/recipes y PUT /api/recipes/:id)

1. Al crear/actualizar una receta:
   ```
   totalCost = sum(elaborations.ingredients.cost) + sum(supplies.totalCost)
   unitCost = totalCost / units (si units > 0)
   ```

2. Si se envían supplies:
   - Eliminar supplies antiguos de la receta (si existe)
   - Insertar nuevos supplies en `recipe_supplies`
   - Cada supply debe incluir: recipe_id, supply_id, supply_name, quantity, unit, cost_per_unit, total_cost

3. Al obtener recetas (GET):
   - JOIN con `recipe_supplies` y `supplies`
   - Incluir supplies en el response si existen

### Para Cotizaciones (POST /api/quotations y PUT /api/quotations/:id)

1. Al crear/actualizar una cotización:
   ```
   totalCost = sum(recipes.totalCost) + sum(selectedSupplies.totalCost) + sum(additionalIngredients.totalCost) + sum(additionalExpenses.totalPrice)
   ```

2. Si se envían additionalIngredients:
   - Eliminar ingredientes adicionales antiguos de la cotización (si existe)
   - Insertar nuevos ingredientes en `quotation_ingredients`
   - Cada ingrediente debe incluir: quotation_id, ingredient_id, ingredient_name, quantity, units, cost_per_unit, total_cost

3. Al obtener cotizaciones (GET):
   - JOIN con `quotation_ingredients` e `ingredients`
   - Incluir additionalIngredients en el response si existen

## Resumen de Archivos Actualizados

### Backend (API)
- ✅ Crear tabla `quotation_ingredients`
- ✅ Crear tabla `recipe_supplies`
- ✅ Actualizar endpoint GET /api/recipes (incluir supplies)
- ✅ Actualizar endpoint POST /api/recipes (aceptar y guardar supplies)
- ✅ Actualizar endpoint PUT /api/recipes/:id (aceptar y guardar supplies)
- ✅ Actualizar endpoint GET /api/quotations (incluir additionalIngredients)
- ✅ Actualizar endpoint POST /api/quotations (aceptar y guardar additionalIngredients)
- ✅ Actualizar endpoint PUT /api/quotations/:id (aceptar y guardar additionalIngredients)

### Frontend
- ✅ Actualizar `src/types/quotation.ts` (agregar QuotationIngredient)
- ✅ Actualizar `src/types/recipe.ts` (agregar RecipeSupply, eliminar wholeCost)
- ⏳ Actualizar `src/components/RecipeForm.tsx` (agregar UI para supplies)
- ⏳ Actualizar `src/components/QuotationForm.tsx` (agregar UI para additionalIngredients)
- ✅ Actualizar `src/components/RecipePreviewDialog.tsx` (eliminar referencia a wholeCost)

### Documentación
- ✅ Actualizar `API_SPECIFICATIONS.md`
