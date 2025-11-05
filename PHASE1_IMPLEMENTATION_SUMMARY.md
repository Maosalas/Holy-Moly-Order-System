# Fase 1: Multi-Tenant Database - Resumen de Implementación

## ✅ Cambios Completados

### 1. Tipos TypeScript Actualizados

#### Nuevo archivo: `src/types/organization.ts`
- `OrganizationRole`: 'owner' | 'admin' | 'staff' | 'viewer'
- `SubscriptionPlan`: 'free' | 'starter' | 'professional' | 'enterprise'
- `SubscriptionStatus`: 'trial' | 'active' | 'past_due' | 'canceled' | 'incomplete'
- Interface `Organization`
- Interface `OrganizationMember`
- Interface `OrganizationWithRole`
- Type `OrganizationFormData`

#### Actualizado: `src/types/auth.ts`
- `UserRole` ahora incluye: 'super_admin' | 'owner' | 'cake_topper_provider'
- Interface `User` actualizada:
  - `roles: UserRole[]` (array de roles globales)
  - `currentOrganizationId?: string`
- Interface `AuthState` actualizada:
  - `currentOrganizationId?: string`
  - `currentOrganizationRole?: OrganizationRole`

#### Actualizados con `organizationId` y `userId`:
- `src/types/recipe.ts` - Interface `Recipe`
- `src/types/order.ts` - Interface `Order`
- `src/types/ingredient.ts` - Interface `Ingredient`
- `src/types/supply.ts` - Interface `Supply`
- `src/types/expense.ts` - Interface `Expense`
- `src/types/quotation.ts` - Interface `Quotation`

### 2. SQL para Base de Datos

Archivo creado: `DATABASE_MULTI_TENANT_PHASE1.sql`

#### Incluye:
1. **Enums**:
   - `organization_role`: owner, admin, staff, viewer
   - `app_role`: super_admin, owner, cake_topper_provider

2. **Nuevas Tablas**:
   - `organizations`: Datos de la organización
   - `organization_members`: Relación usuarios-organizaciones
   - `user_roles`: Roles globales de usuarios

3. **Funciones de Seguridad (Security Definer)**:
   - `has_global_role(_user_id, _role)`: Verifica rol global
   - `has_org_role(_user_id, _org_id, _role)`: Verifica rol en organización
   - `is_org_member(_user_id, _org_id)`: Verifica membresía
   - `get_user_organizations(_user_id)`: Obtiene organizaciones del usuario

4. **Migraciones de Tablas Existentes**:
   - Agregar columnas `organization_id` y `user_id` a:
     - `ingredients`
     - `recipes`
     - `supplies`
     - `orders`
     - `quotations`
     - `expenses`
   - Crear índices para `organization_id` y `user_id`

5. **Políticas RLS (Row Level Security)**:
   - Organizations: Ver, actualizar, crear
   - Organization Members: Ver, insertar, actualizar, eliminar
   - Todas las tablas existentes actualizadas para usar `organization_id`

6. **Trigger Automático**:
   - `on_organization_created`: Agrega automáticamente al creador como owner

### 3. Documentación API Actualizada

Archivo: `API_SPECIFICATIONS.md`

#### Endpoints Actualizados:
- `GET /api/ingredients`: Ahora requiere header `X-Organization-Id`
- `POST /api/ingredients`: Ahora requiere header `X-Organization-Id`
- `GET /api/recipes`: Ahora requiere header `X-Organization-Id`
- `GET /api/supplies`: Ahora requiere header `X-Organization-Id`
- `GET /api/orders`: Ahora requiere header `X-Organization-Id`
- `POST /api/orders`: Ahora requiere header `X-Organization-Id`
- `GET /api/quotations`: Ahora requiere header `X-Organization-Id`
- `POST /api/quotations`: Ahora requiere header `X-Organization-Id`

#### Respuestas Actualizadas:
Todas las respuestas ahora incluyen:
- `organizationId`: UUID de la organización
- `userId`: UUID del usuario que creó el registro (opcional)

## 📋 Cambios Necesarios en la Base de Datos

### Ejecutar el archivo SQL:
```bash
DATABASE_MULTI_TENANT_PHASE1.sql
```

### Pasos de Migración:

1. **Ejecutar el SQL** en el editor SQL de Supabase (Cloud > Database)

2. **Migrar datos existentes** (IMPORTANTE):
   ```sql
   -- Crear organización por defecto para datos existentes
   INSERT INTO organizations (name, slug, subscription_status, subscription_plan)
   VALUES ('Holy Moly Bakery', 'holy-moly-bakery', 'active', 'free')
   RETURNING id;
   -- Guardar el ID retornado
   
   -- Asignar esta organización a todos los registros existentes
   -- Reemplazar 'ORGANIZATION_ID_AQUI' con el ID de la organización creada
   UPDATE ingredients SET organization_id = 'ORGANIZATION_ID_AQUI';
   UPDATE recipes SET organization_id = 'ORGANIZATION_ID_AQUI';
   UPDATE supplies SET organization_id = 'ORGANIZATION_ID_AQUI';
   UPDATE orders SET organization_id = 'ORGANIZATION_ID_AQUI';
   UPDATE quotations SET organization_id = 'ORGANIZATION_ID_AQUI';
   UPDATE expenses SET organization_id = 'ORGANIZATION_ID_AQUI';
   ```

3. **Agregar usuarios existentes a la organización**:
   ```sql
   -- Para cada usuario existente, agregarlo como miembro de la organización
   -- Reemplazar 'ORGANIZATION_ID_AQUI' y 'USER_ID_AQUI'
   INSERT INTO organization_members (organization_id, user_id, role)
   VALUES ('ORGANIZATION_ID_AQUI', 'USER_ID_AQUI', 'owner');
   ```

4. **Hacer organization_id obligatorio** (después de migrar datos):
   ```sql
   ALTER TABLE ingredients ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE recipes ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE supplies ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE orders ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE quotations ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE expenses ALTER COLUMN organization_id SET NOT NULL;
   ```

## ⚠️ Errores de Build Conocidos

Los siguientes errores aparecerán hasta que se implemente la Fase 2 (actualización del frontend):

1. **Errores de `user.role` vs `user.roles`**:
   - `AppLayout.tsx`
   - `Dashboard.tsx`
   - `Orders.tsx`

2. **Errores de `organizationId` faltante**:
   - `IngredientForm.tsx`
   - `OrderForm.tsx`
   - `RecipeForm.tsx`
   - `SupplyForm.tsx`

Estos se resolverán en la Fase 4 cuando actualicemos el `AuthContext` y los componentes para usar el nuevo sistema multi-tenant.

## 📊 Estructura de Datos Multi-Tenant

```
organizations
├── id
├── name
├── slug
├── subscription_status
├── subscription_plan
└── settings

organization_members
├── id
├── organization_id → organizations
├── user_id → auth.users
└── role (owner|admin|staff|viewer)

user_roles (roles globales)
├── id
├── user_id → auth.users
└── role (super_admin|owner|cake_topper_provider)

Todas las tablas de datos:
├── id
├── organization_id → organizations
├── user_id → auth.users (quien creó)
└── [otros campos...]
```

## 🔐 Modelo de Seguridad

### Roles Globales (tabla `user_roles`):
- `super_admin`: Acceso a todas las organizaciones (soporte)
- `owner`: Propietario de panadería (legacy, ahora se usa organization role)
- `cake_topper_provider`: Proveedor de toppers (legacy)

### Roles por Organización (tabla `organization_members`):
- `owner`: Propietario, acceso total
- `admin`: Administrador, casi acceso total
- `staff`: Personal, puede crear/editar
- `viewer`: Solo lectura

### Políticas RLS:
- Los usuarios solo ven datos de sus organizaciones
- Solo owners/admins pueden eliminar
- Todos los miembros pueden crear/editar
- Super admins ven todo (para soporte)

## 🎯 Próximos Pasos (Fase 2+)

1. **Fase 2**: Actualizar AuthContext y componentes
2. **Fase 3**: Crear APIs de organizaciones
3. **Fase 4**: Actualizar todos los hooks para enviar `X-Organization-Id`
4. **Fase 5**: Crear UI de gestión de organizaciones
5. **Fase 6**: Crear selector de organización
6. **Fase 7**: Sistema de onboarding
7. **Fase 8**: Super Admin panel
8. **Fase 9**: Integración con Stripe

## 📝 Notas Importantes

1. **Header `X-Organization-Id`**: Todos los endpoints ahora requieren este header para identificar la organización activa.

2. **Backward Compatibility**: El sistema es compatible hacia atrás - los datos existentes solo necesitan ser migrados a una organización.

3. **Audit Trail**: El campo `user_id` permite rastrear quién creó cada registro.

4. **Automatic Assignment**: El trigger `on_organization_created` automáticamente agrega al creador como owner.

5. **Security First**: Las funciones `SECURITY DEFINER` evitan problemas de recursión en RLS.
