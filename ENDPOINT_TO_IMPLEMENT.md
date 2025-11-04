# Nuevo Endpoint para Implementar en el Backend

## GET /api/organizations/logo-by-domain

### Descripción
Este endpoint público retorna el logo de una organización basándose en el dominio del email. Se utiliza durante el proceso de login para mostrar el logo de la organización cuando el usuario escribe su email.

### Características
- **Público**: No requiere autenticación
- **Método**: GET
- **Path**: `/api/organizations/logo-by-domain`

### Query Parameters
- `domain` (string, requerido): El dominio del email (ej: "holymoly.com", "example.com")

### Lógica de Negocio

1. **Extraer el dominio** del query parameter
2. **Buscar organizaciones** donde algún miembro tenga un email con ese dominio
3. **Retornar el logo** de la organización encontrada
4. Si no se encuentra ninguna organización con ese dominio, retornar `logoUrl: null`

### SQL Query Sugerida

```sql
SELECT DISTINCT o.logo_url
FROM organizations o
INNER JOIN organization_members om ON o.id = om.organization_id
INNER JOIN users u ON om.user_id = u.id
WHERE u.email LIKE '%@' || $1
LIMIT 1;
```

Donde `$1` es el parámetro del dominio.

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
  "message": "Domain parameter is required"
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

1. El parámetro `domain` debe estar presente
2. El dominio debe tener un formato válido (contener al menos un punto)
3. Sanitizar el input para prevenir SQL injection

### Consideraciones de Seguridad

- Este es un endpoint público, no expone información sensible
- Solo retorna el logo (imagen en base64), no otros datos de la organización
- Implementar rate limiting para prevenir abuso
- Sanitizar el parámetro de dominio para evitar inyecciones

### Ejemplo de Implementación (Pseudocódigo)

```typescript
async function getLogoByDomain(req, res) {
  const { domain } = req.query;
  
  // Validación
  if (!domain) {
    return res.status(400).json({
      success: false,
      error: "ValidationError",
      message: "Domain parameter is required"
    });
  }
  
  // Validar formato de dominio
  if (!domain.includes('.')) {
    return res.status(400).json({
      success: false,
      error: "ValidationError",
      message: "Invalid domain format"
    });
  }
  
  try {
    // Buscar organización por dominio de email
    const result = await db.query(
      `SELECT DISTINCT o.logo_url
       FROM organizations o
       INNER JOIN organization_members om ON o.id = om.organization_id
       INNER JOIN users u ON om.user_id = u.id
       WHERE u.email LIKE '%@' || $1
       LIMIT 1`,
      [domain]
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
curl "http://localhost:3000/api/organizations/logo-by-domain?domain=holymoly.com"
# Esperado: 200 con logoUrl en base64
```

#### Test Case 2: Logo no encontrado
```bash
curl "http://localhost:3000/api/organizations/logo-by-domain?domain=nonexistent.com"
# Esperado: 200 con logoUrl: null
```

#### Test Case 3: Sin parámetro domain
```bash
curl "http://localhost:3000/api/organizations/logo-by-domain"
# Esperado: 400 ValidationError
```

### Prioridad
🔴 **ALTA** - Este endpoint es necesario para la funcionalidad de login mejorada.
