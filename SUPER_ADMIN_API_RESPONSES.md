# Super Admin API - Responses Reference

Este documento contiene todas las respuestas de los endpoints necesarios para implementar las funcionalidades de Super Admin, incluyendo gestión de organizaciones, planes de suscripción y roles de usuario.

---

## Tabla de Contenidos

1. [Organizaciones](#organizaciones)
2. [Miembros de Organización](#miembros-de-organización)
3. [Planes de Suscripción](#planes-de-suscripción)
4. [Roles de Usuario](#roles-de-usuario)
5. [Super Admin - Todas las Organizaciones](#super-admin---todas-las-organizaciones)

---

## Organizaciones

### POST /api/organizations
Crear nueva organización (automáticamente el usuario autenticado se convierte en owner)

**Request:**
```json
{
  "name": "Nueva Panadería",
  "slug": "nueva-panaderia"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Nueva Panadería",
    "slug": "nueva-panaderia",
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

**Error Response (409 - Slug duplicado):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "Organization slug 'nueva-panaderia' already exists"
}
```

**Error Response (400 - Validación):**
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

---

### PUT /api/organizations/:id
Actualizar organización (solo owner puede actualizar)

**Request:**
```json
{
  "name": "Nueva Panadería Premium",
  "subscription_plan": "professional",
  "subscription_status": "active"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Nueva Panadería Premium",
    "slug": "nueva-panaderia",
    "logo_url": null,
    "subscription_status": "active",
    "subscription_plan": "professional",
    "subscription_stripe_customer_id": null,
    "subscription_stripe_subscription_id": null,
    "trial_ends_at": null,
    "settings": {},
    "created_at": "2025-11-04T10:30:00.000Z",
    "updated_at": "2025-11-04T11:00:00.000Z"
  }
}
```

**Error Response (403 - Sin permisos):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only organization owners can update organization details"
}
```

---

## Miembros de Organización

### POST /api/organizations/:id/members/by-email
Agregar miembro por email (solo owner y admin pueden agregar)

**Request:**
```json
{
  "email": "nuevo@ejemplo.com",
  "role": "staff"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Member added successfully",
  "member": {
    "id": "660e8400-e29b-41d4-a716-446655440005",
    "organization_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "770e8400-e29b-41d4-a716-446655440005",
    "role": "staff",
    "joined_at": "2025-11-04T15:30:00.000Z"
  }
}
```

**Error Response (404 - Usuario no encontrado):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "User not found"
}
```

**Error Response (400 - Usuario ya es miembro):**
```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "User is already a member of this organization"
}
```

**Error Response (403 - Sin permisos):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Insufficient permissions"
}
```

---

### GET /api/organizations/:id/members
Obtener todos los miembros de una organización

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
      "role": "staff",
      "joined_at": "2025-02-10T14:20:00.000Z",
      "user": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "Maria Garcia",
        "email": "maria@holymoly.com"
      }
    }
  ]
}
```

---

## Planes de Suscripción

### GET /api/subscription-plans
Obtener todos los planes de suscripción

**Query Parameters:**
- `active_only` (boolean, opcional): Solo planes activos. Default: `true`

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

**Nota:** Un valor de `-1` para `max_orders_per_month` o `max_users` indica ilimitado.

---

### POST /api/subscription-plans
Crear un nuevo plan de suscripción (solo super_admin)

**Request:**
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

**Error Response (409 - Slug o nombre duplicado):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "A subscription plan with this slug or name already exists"
}
```

**Error Response (403 - Sin permisos):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only super admins can create subscription plans"
}
```

---

### PUT /api/subscription-plans/:id
Actualizar plan de suscripción (solo super_admin)

**Request:**
```json
{
  "name": "Premium Plus",
  "price_monthly": 159.99,
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

**Error Response (404 - Plan no encontrado):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Subscription plan not found"
}
```

---

### DELETE /api/subscription-plans/:id
Eliminar o desactivar plan de suscripción (solo super_admin)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription plan deleted successfully"
}
```

**Plan Desactivado (200):**
```json
{
  "success": true,
  "message": "Subscription plan has active subscriptions and has been deactivated instead of deleted"
}
```

**Error Response (400 - No se puede eliminar):**
```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "Cannot delete or deactivate the free plan as it is required for new users"
}
```

---

## Roles de Usuario

### GET /api/users/:id/roles
Obtener roles globales de un usuario

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
    }
  ]
}
```

---

### POST /api/users/:id/roles
Asignar rol global a un usuario (solo super_admin)

**Request:**
```json
{
  "role": "super_admin",
  "organization_id": null
}
```

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

**Error Response (409 - Rol ya asignado):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "User already has this role"
}
```

---

### DELETE /api/users/:userId/roles/:roleId
Eliminar rol global de un usuario (solo super_admin)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Role removed successfully"
}
```

**Error Response (403 - No puede eliminar su propio rol):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You cannot remove your own super_admin role. Ask another super admin to do it."
}
```

---

## Super Admin - Todas las Organizaciones

### GET /api/super-admin/organizations
Obtener todas las organizaciones del sistema (solo super_admin)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Holy Moly Bakery",
      "slug": "holy-moly",
      "logo_url": "https://example.com/logos/holy-moly.png",
      "subscription_status": "active",
      "subscription_plan": "professional",
      "subscription_stripe_customer_id": "cus_123456789",
      "subscription_stripe_subscription_id": "sub_987654321",
      "trial_ends_at": null,
      "settings": {},
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-11-04T08:20:00.000Z",
      "members_count": 5,
      "orders_this_month": 45
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Sweet Dreams Bakery",
      "slug": "sweet-dreams",
      "logo_url": null,
      "subscription_status": "trial",
      "subscription_plan": "free",
      "subscription_stripe_customer_id": null,
      "subscription_stripe_subscription_id": null,
      "trial_ends_at": "2025-11-20T00:00:00.000Z",
      "settings": {},
      "created_at": "2025-10-21T14:00:00.000Z",
      "updated_at": "2025-10-21T14:00:00.000Z",
      "members_count": 1,
      "orders_this_month": 3
    }
  ]
}
```

**Error Response (403 - No es super admin):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only super admins can access all organizations"
}
```

---

## Códigos de Error Comunes

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | BadRequestError | Datos inválidos o faltantes |
| 401 | Unauthorized | Token de autenticación inválido o faltante |
| 403 | ForbiddenError | Sin permisos suficientes |
| 404 | NotFoundError | Recurso no encontrado |
| 409 | ConflictError | Conflicto (recurso duplicado) |
| 500 | InternalServerError | Error del servidor |

---

## Notas de Implementación

### Transformación de Datos
- **Frontend → Backend:** camelCase → snake_case
- **Backend → Frontend:** snake_case → camelCase

### Autenticación
Todos los endpoints requieren header de autenticación:
```
Authorization: Bearer <jwt_token>
```

### Contexto de Organización
Algunos endpoints requieren header adicional:
```
X-Organization-Id: <organization_id>
```

### Roles y Permisos

**Roles de Organización:**
- `owner`: Control completo de la organización
- `admin`: Gestión de miembros y datos
- `staff`: Crear/editar datos, no gestionar miembros
- `viewer`: Solo lectura

**Roles Globales (app_role):**
- `super_admin`: Acceso completo al sistema
- `owner`: Propietario de negocio (puede tener múltiples organizaciones)
- `cake_topper_provider`: Proveedor externo de toppers

---

## Ejemplo de Flujo: Crear Organización Completa

1. **Crear organización:**
```bash
POST /api/organizations
{
  "name": "Mi Panadería",
  "slug": "mi-panaderia"
}
```

2. **Actualizar plan de suscripción:**
```bash
PUT /api/organizations/{org_id}
{
  "subscription_plan": "professional",
  "subscription_status": "active"
}
```

3. **Agregar miembros:**
```bash
POST /api/organizations/{org_id}/members/by-email
{
  "email": "empleado1@example.com",
  "role": "staff"
}
```

4. **Verificar configuración:**
```bash
GET /api/organizations/{org_id}
GET /api/organizations/{org_id}/members
```

---

**Última actualización:** 2025-11-04
**Versión del API:** 1.0
