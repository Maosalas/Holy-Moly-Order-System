# Nuevo Endpoint para Implementar en el Backend

## GET /api/organizations/logo-by-email

### Descripción
Este endpoint público retorna el logo de una organización basándose en el email del usuario. Se utiliza durante el proceso de login para mostrar el logo de la organización cuando el usuario escribe su email.

### Características
- **Público**: No requiere autenticación
- **Método**: GET
- **Path**: `/api/organizations/logo-by-email`

### Query Parameters
- `email` (string, requerido): El email completo del usuario (ej: "user@holymoly.com", "admin@example.com")

### Lógica de Negocio

1. **Recibir el email completo** del query parameter
2. **Buscar la organización** donde el usuario con ese email es miembro
3. **Retornar el logo** de la organización encontrada
4. Si no se encuentra ninguna organización con ese email, retornar `logoUrl: null`

### SQL Query Sugerida

```sql
SELECT DISTINCT o.logo_url
FROM organizations o
INNER JOIN organization_members om ON o.id = om.organization_id
INNER JOIN users u ON om.user_id = u.id
WHERE u.email = $1
LIMIT 1;
```

Donde `$1` es el parámetro del email completo.

### Response Format

#### Success (200) - Logo encontrado
```json
{
  "success": true,
  "data": {
    "logoUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
  }
}
```

#### Success (200) - No se encontró logo
```json
{
  "success": true,
  "data": {
    "logoUrl": null
  }
}
```

#### Error (400) - Validación
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Email parameter is required"
}
```

#### Error (500) - Error del servidor
```json
{
  "success": false,
  "error": "InternalServerError",
  "message": "Error retrieving organization logo"
}
```

### Validaciones

1. El parámetro `email` debe estar presente
2. El email debe tener un formato válido (validar con regex de email)
3. Sanitizar el input para prevenir SQL injection

### Consideraciones de Seguridad

- Este es un endpoint público, no expone información sensible
- Solo retorna el logo (imagen en base64), no otros datos de la organización
- Implementar rate limiting para prevenir abuso
- Sanitizar el parámetro de email para evitar inyecciones

### Ejemplo de Implementación (Pseudocódigo)

```typescript
async function getLogoByEmail(req, res) {
  const { email } = req.query;
  
  // Validación
  if (!email) {
    return res.status(400).json({
      success: false,
      error: "ValidationError",
      message: "Email parameter is required"
    });
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "ValidationError",
      message: "Invalid email format"
    });
  }
  
  try {
    // Buscar organización por email del usuario
    const result = await db.query(
      `SELECT DISTINCT o.logo_url
       FROM organizations o
       INNER JOIN organization_members om ON o.id = om.organization_id
       INNER JOIN users u ON om.user_id = u.id
       WHERE u.email = $1
       LIMIT 1`,
      [email]
    );
    
    const logoUrl = result.rows[0]?.logo_url || null;
    
    return res.status(200).json({
      success: true,
      data: { logoUrl }
    });
  } catch (error) {
    console.error('Error fetching organization logo:', error);
    return res.status(500).json({
      success: false,
      error: "InternalServerError",
      message: "Error retrieving organization logo"
    });
  }
}
```

### Testing

#### Test Case 1: Logo encontrado
```bash
curl "http://localhost:3000/api/organizations/logo-by-email?email=user@holymoly.com"
# Esperado: 200 con logoUrl en base64
```

#### Test Case 2: Logo no encontrado
```bash
curl "http://localhost:3000/api/organizations/logo-by-email?email=nonexistent@example.com"
# Esperado: 200 con logoUrl: null
```

#### Test Case 3: Sin parámetro email
```bash
curl "http://localhost:3000/api/organizations/logo-by-email"
# Esperado: 400 ValidationError
```

### Prioridad
🔴 **ALTA** - Este endpoint es necesario para la funcionalidad de login mejorada.
