# API Responses - Organizations & Members

## Endpoints de Organizaciones

### GET /api/organizations

**Descripción:** Obtiene todas las organizaciones del usuario autenticado.

**Headers requeridos:**
```
Authorization: Bearer <jwt_token>
```

**Response exitoso (200):**
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

**Response sin organizaciones (200):**
```json
{
  "success": true,
  "data": []
}
```

**Response error de autenticación (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

---

### POST /api/organizations

**Descripción:** Crea una nueva organización. El usuario autenticado se convierte automáticamente en 'owner'.

**Headers requeridos:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "New Bakery Business",
  "slug": "new-bakery"
}
```

**Response exitoso (201):**
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

**Response error de validación (400):**
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

**Response slug duplicado (409):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "Organization slug 'new-bakery' already exists"
}
```

**Response error de autenticación (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

---

### GET /api/organizations/:id

**Descripción:** Obtiene los detalles de una organización específica. Solo miembros de la organización pueden acceder.

**Headers requeridos:**
```
Authorization: Bearer <jwt_token>
```

**Response exitoso (200):**
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

**Response no encontrado (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Organization not found or you don't have access"
}
```

**Response sin acceso (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You are not a member of this organization"
}
```

**Response error de autenticación (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

---

### PUT /api/organizations/:id

**Descripción:** Actualiza una organización. Solo 'owner' puede actualizar.

**Headers requeridos:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request body (todos los campos son opcionales):**
```json
{
  "name": "Holy Moly Bakery & Cafe",
  "logo_url": "https://example.com/logos/new-logo.png",
  "settings": {
    "currency": "USD",
    "timezone": "America/New_York",
    "notifications_enabled": true,
    "auto_backup": true
  }
}
```

**Response exitoso (200):**
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

**Response sin permisos (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only organization owners can update organization details"
}
```

**Response no encontrado (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Organization not found"
}
```

**Response error de validación (400):**
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

## Endpoints de Miembros de Organización

### GET /api/organizations/:id/members

**Descripción:** Obtiene todos los miembros de una organización. Solo miembros de la organización pueden acceder.

**Headers requeridos:**
```
Authorization: Bearer <jwt_token>
```

**Response exitoso (200):**
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

**Response sin miembros (200):**
```json
{
  "success": true,
  "data": []
}
```

**Response sin acceso (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You are not a member of this organization"
}
```

**Response no encontrado (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Organization not found"
}
```

---

### POST /api/organizations/:id/members

**Descripción:** Agrega un nuevo miembro a la organización. Solo 'owner' y 'admin' pueden agregar miembros.

**Headers requeridos:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request body:**
```json
{
  "user_id": "770e8400-e29b-41d4-a716-446655440004",
  "role": "staff"
}
```

**Roles válidos:** `"owner"`, `"admin"`, `"staff"`, `"viewer"`

**Response exitoso (201):**
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

**Response miembro ya existe (409):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "User is already a member of this organization"
}
```

**Response usuario no encontrado (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "User not found"
}
```

**Response sin permisos (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only owners and admins can add members"
}
```

**Response error de validación (400):**
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

### PUT /api/organizations/:orgId/members/:userId

**Descripción:** Actualiza el rol de un miembro. Solo 'owner' y 'admin' pueden actualizar roles.

**Headers requeridos:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request body:**
```json
{
  "role": "admin"
}
```

**Response exitoso (200):**
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

**Response miembro no encontrado (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Member not found in this organization"
}
```

**Response sin permisos (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only owners and admins can update member roles"
}
```

**Response no puede modificar último owner (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Cannot change role of the last owner. Assign another owner first."
}
```

**Response error de validación (400):**
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

### DELETE /api/organizations/:orgId/members/:userId

**Descripción:** Elimina un miembro de la organización. Solo 'owner' y 'admin' pueden eliminar miembros.

**Headers requeridos:**
```
Authorization: Bearer <jwt_token>
```

**Response exitoso (200):**
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

**Response miembro no encontrado (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Member not found in this organization"
}
```

**Response sin permisos (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Only owners and admins can remove members"
}
```

**Response no puede eliminar último owner (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "Cannot remove the last owner. Assign another owner first or delete the organization."
}
```

**Response no puede auto-eliminarse (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You cannot remove yourself from the organization. Ask another owner or admin to remove you."
}
```

---

## Endpoints de Roles de Usuario (Globales)

### GET /api/users/:id/roles

**Descripción:** Obtiene los roles globales de un usuario (super_admin, owner, cake_topper_provider). Solo usuarios con rol 'super_admin' o el mismo usuario pueden acceder.

**Headers requeridos:**
```
Authorization: Bearer <jwt_token>
```

**Response exitoso (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "user_id": "770e8400-e29b-41d4-a716-446655440001",
      "role": "super_admin",
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "user_id": "770e8400-e29b-41d4-a716-446655440001",
      "role": "owner",
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Response sin roles (200):**
```json
{
  "success": true,
  "data": []
}
```

**Response sin permisos (403):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You can only view your own roles unless you are a super admin"
}
```

**Response usuario no encontrado (404):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "User not found"
}
```

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Error de validación o datos inválidos |
| 401 | Unauthorized - Falta o es inválido el token de autenticación |
| 403 | Forbidden - No tiene permisos para realizar la acción |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: slug duplicado, miembro ya existe) |
| 500 | Internal Server Error - Error del servidor |

---

## Notas de Implementación

### Estructura de Response Estándar

Todos los endpoints siguen esta estructura:

**Éxito:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Human readable message",
  "details": { ... } // Opcional, para errores de validación
}
```

### Roles de Organización

- **owner**: Control total de la organización
- **admin**: Puede gestionar miembros y datos
- **staff**: Puede crear/editar datos, no puede gestionar miembros
- **viewer**: Solo lectura

### Roles Globales (app_role)

- **super_admin**: Acceso completo al sistema
- **owner**: Propietario de negocio (puede tener múltiples organizaciones)
- **cake_topper_provider**: Proveedor externo de toppers
