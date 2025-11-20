# Estado Actual: RLS y Organization ID

**Fecha:** 2025-11-20
**Propósito:** Entender el sistema multi-tenant actual para identificar soluciones

---

## 🎯 Resumen Ejecutivo

Tu proyecto es **multi-tenant**: múltiples organizaciones usan la misma base de datos, y cada organización debe ver **SOLO sus propios datos**.

**Estrategia de Seguridad:** Row Level Security (RLS) de PostgreSQL + `organization_id` en todas las tablas

**Estado Actual:** ✅ Implementado pero con **problemas de complejidad**

---

## 📊 Arquitectura Actual

### 1. Sistema de Multi-Tenancy

```
┌─────────────────────────────────────────────────────┐
│                   Base de Datos                      │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  │ Org A        │  │ Org B        │  │ Org C        │
│  │ - recipes    │  │ - recipes    │  │ - recipes    │
│  │ - orders     │  │ - orders     │  │ - orders     │
│  │ - ingredients│  │ - ingredients│  │ - ingredients│
│  └──────────────┘  └──────────────┘  └──────────────┘
│                                                       │
│  Todos los datos en las MISMAS tablas                │
│  Filtrados por: organization_id                      │
└─────────────────────────────────────────────────────┘
```

### 2. Tablas con `organization_id`

**✅ 22 Tablas YA tienen organization_id:**
- Tablas principales: `orders`, `quotations`, `recipes`, `ingredients`, `supplies`, `expenses`, `organizations`, `organization_members`
- Tablas relacionadas: `order_photos`, `order_statuses`, `order_supplies`, `quotation_ingredients`, `quotation_recipes`, `quotation_supplies`, `quotation_additional_expenses`, `recipe_ingredients`, `recipe_supplies`, `recipe_elaborations`, `recipe_variations`, `variation_elaboration_links`
- Multipliers: `cake_multipliers`, `filling_multipliers`, `covering_multipliers`
- Otros: `email_logs`

**❌ 11 Tablas del sistema (NO necesitan):**
- `users`, `user_roles`, `password_resets`, etc.

---

## 🔒 Row Level Security (RLS)

### ¿Qué es RLS?

PostgreSQL aplica **filtros automáticos** a nivel de base de datos. Incluso si tu código tiene un bug y no filtra por `organization_id`, la base de datos lo hace por ti.

### ¿Cómo Funciona?

```sql
-- Cuando un usuario hace una query
SELECT * FROM recipes;

-- PostgreSQL automáticamente la convierte en:
SELECT * FROM recipes
WHERE EXISTS (
  SELECT 1 FROM organization_members
  WHERE organization_id = recipes.organization_id
    AND user_id = current_setting('app.current_user_id')::uuid
);
```

### Estado de RLS

**✅ RLS HABILITADO Y FORZADO** en todas las tablas con organization_id

**Políticas Aplicadas:**
- **SELECT**: Usuarios ven solo datos de su organización
- **INSERT**: Usuarios solo crean datos en su organización
- **UPDATE**: Usuarios solo actualizan datos de su organización
- **DELETE**: Owners/Admins solo eliminan datos de su organización
- **SUPERADMIN BYPASS**: Super admins ven TODO

---

## 🔄 Flujo de Datos: Cómo se Filtra Todo

### 1. Usuario hace Login

```typescript
// auth.controller.ts
const token = generateAccessToken({
  userId: user.id,
  email: user.email,
  role: user.role,
  organizationId: user.primaryOrganization.id  // ← Org ID en JWT
});
```

### 2. Middleware Extrae el User ID

```typescript
// setUserContext.ts (middleware)
req.user = {
  userId: decoded.userId,
  email: decoded.email,
  organizationId: decoded.organizationId  // ← Disponible en req
};
```

### 3. Repositorio Inicia Transacción con Contexto

```typescript
// recipes.repo.ts
export async function findAllByUserId(userId: string): Promise<Recipe[]> {
  return withTransaction(userId, async (client) => {
    // ← withTransaction establece app.current_user_id = userId

    const result = await client.query(
      'SELECT * FROM recipes ORDER BY created_at DESC'
      // NO hay WHERE organization_id = ...
      // ¡RLS lo hace automáticamente!
    );

    return result.rows.map(mapRecipeRow);
  });
}
```

### 4. PostgreSQL Aplica RLS

```typescript
// db/index.ts - withTransaction()
await client.query('BEGIN');

// ← ESTO es la magia: establece el contexto del usuario
await client.query(
  'SELECT set_config($1, $2, true)',
  ['app.current_user_id', userId]
);

// Ahora TODAS las queries usan RLS con este userId
const result = await callback(client);

await client.query('COMMIT');
```

### 5. RLS Filtra Automáticamente

```sql
-- Política RLS para recipes
CREATE POLICY "Members can view org recipes"
ON recipes FOR SELECT
USING (
  -- Verifica que el usuario es miembro de la organización de la receta
  is_org_member(
    current_setting('app.current_user_id')::uuid,  -- ← Usuario actual
    organization_id                                -- ← Org de la receta
  )
  OR
  -- O es super admin
  has_global_role(
    current_setting('app.current_user_id')::uuid,
    'super_admin'
  )
);
```

---

## 🎛️ Funciones de RLS

El sistema usa **funciones helper** para validar permisos:

### `is_org_member(user_id, org_id)`
Verifica si el usuario es miembro de la organización
```sql
SELECT is_org_member('user-uuid', 'org-uuid');
-- Retorna: true/false
```

### `has_org_role(user_id, org_id, role)`
Verifica si el usuario tiene un rol específico en la organización
```sql
SELECT has_org_role('user-uuid', 'org-uuid', 'owner');
-- Retorna: true/false
```

### `has_global_role(user_id, role)`
Verifica si el usuario tiene un rol global (super_admin)
```sql
SELECT has_global_role('user-uuid', 'super_admin');
-- Retorna: true/false
```

---

## 🐛 Problemas Identificados

### Problema 1: Complejidad Excesiva

**Sintoma:** Muchos archivos de debug, scripts de verificación, múltiples intentos de fix

**Causa Raíz:**
- RLS policies pueden ser muy restrictivas
- Funciones helper complejas
- Contexto de usuario no siempre se establece correctamente
- Cascade deletes con RLS causan problemas

### Problema 2: INSERT con organization_id

**El Dilema:**
```typescript
// ¿De dónde sale organization_id?
await client.query(
  `INSERT INTO recipe_ingredients (ingredient_id, quantity, organization_id)
   VALUES ($1, $2, $3)`,
  [ingredientId, quantity, ???]  // ← ¿De dónde viene?
);
```

**Soluciones actuales (ninguna ideal):**
1. Pasar `organizationId` como parámetro en TODAS las funciones
2. Obtenerlo del JWT en `req.user.organizationId`
3. Hacer un JOIN con la tabla padre para obtenerlo

### Problema 3: Queries Complejas con RLS

```typescript
// recipes.repo.ts - línea 156
const ingredientsResult = await client.query(
  `SELECT ri.*, i.name as ingredient_name
   FROM recipe_ingredients ri
   LEFT JOIN ingredients i ON i.id = ri.ingredient_id
   WHERE ri.elaboration_id = ANY($1::uuid[])`,
  [elaborationIds]
);
```

**Problema:** RLS aplica a AMBAS tablas:
- `recipe_ingredients` necesita verificar organization_id
- `ingredients` TAMBIÉN necesita verificar organization_id
- Si un ingrediente no existe en la org, el LEFT JOIN falla

### Problema 4: Super Admin Bypass Inconsistente

A veces funciona, a veces no. Depende de:
- Si `has_global_role()` está en la policy
- Si el super admin tiene membership en la org
- Si el contexto se estableció correctamente

---

## 💡 ¿Por Qué Tantos Problemas?

### 1. Doble Responsabilidad
```
Código Backend + PostgreSQL RLS = Ambos filtrando
```
Esto causa:
- Complejidad duplicada
- Bugs difíciles de debuggear
- No está claro quién es responsable de qué

### 2. Contexto de Usuario Frágil

```typescript
// Si esto falla o no se ejecuta...
await client.query('SELECT set_config($1, $2, true)',
  ['app.current_user_id', userId]
);

// ...TODAS las queries RLS fallan o filtran mal
```

### 3. Organization ID en TODAS Partes

Necesitas pasar `organization_id` en:
- Todos los INSERT
- Muchos SELECT (aunque RLS filtra)
- Todas las funciones de repositorio
- Todos los controllers

---

## 🎯 Soluciones Posibles

### Opción A: Simplificar RLS (Recomendado)

**Estrategia:** Usar RLS SOLO para seguridad, no como filtro principal

```typescript
// 1. Backend filtra explícitamente
const recipes = await client.query(
  `SELECT * FROM recipes WHERE organization_id = $1`,
  [organizationId]
);

// 2. RLS actúa como "segunda línea de defensa"
// Si el código tiene un bug, RLS previene la fuga de datos
```

**Ventajas:**
- ✅ Código más explícito y fácil de entender
- ✅ Menos bugs causados por RLS
- ✅ RLS sigue protegiendo contra inyecciones SQL

**Desventajas:**
- ❌ Más código para escribir
- ❌ Posibles bugs si olvidas el WHERE

### Opción B: Eliminar RLS Completamente

**Estrategia:** Confiar 100% en el código backend

**Ventajas:**
- ✅ Mucho más simple
- ✅ Más fácil de debuggear
- ✅ Mejor performance

**Desventajas:**
- ❌ Si hay un bug de seguridad → fuga de datos masiva
- ❌ Menos defensa en profundidad

### Opción C: RLS + Columnas Computed (Avanzado)

**Estrategia:** Usar `GENERATED ALWAYS` columns para propagar organization_id

```sql
-- En vez de pasar organization_id manualmente
ALTER TABLE recipe_ingredients
ADD COLUMN organization_id UUID
GENERATED ALWAYS AS (
  (SELECT organization_id FROM recipes WHERE id = recipe_id)
) STORED;
```

**Ventajas:**
- ✅ No necesitas pasar organization_id en INSERT
- ✅ Siempre consistente
- ✅ RLS funciona automáticamente

**Desventajas:**
- ❌ Más complejo de configurar
- ❌ Performance overhead
- ❌ Dificulta migrations

### Opción D: Single-Tenant Databases

**Estrategia:** Una base de datos por organización

**Ventajas:**
- ✅ Aislamiento total garantizado
- ✅ No necesitas RLS ni organization_id
- ✅ Más fácil de escalar

**Desventajas:**
- ❌ Infraestructura mucho más compleja
- ❌ Costos más altos
- ❌ Migraciones multiplicadas por N

---

## 🚀 Recomendación

### Paso 1: Auditoría Rápida
```bash
# ¿Cuántos bugs relacionados con RLS tienes?
grep -r "RLS" maintenance/docs/*.md | wc -l
```

### Paso 2: Decisión

**Si bugs RLS < 5 → Opción A (Simplificar)**
- Mantén RLS como seguridad
- Agrega filtros explícitos en queries

**Si bugs RLS > 5 → Opción B (Eliminar RLS)**
- Quita todas las policies
- Agrega WHERE organization_id en TODOS los SELECT
- Agrega organization_id en TODOS los INSERT
- Confía en code reviews y tests

### Paso 3: Implementación

**Para Opción A:**
```typescript
// 1. Agrega helper en repos
function getOrgIdFromRequest(req: Request): string {
  return req.user?.organizationId ||
    throw new Error('Organization ID required');
}

// 2. Úsalo en todas las queries
const recipes = await client.query(
  'SELECT * FROM recipes WHERE organization_id = $1',
  [organizationId]
);

// 3. Simplifica RLS policies a solo "verificar"
CREATE POLICY "safety_net" ON recipes
USING (organization_id = ANY(
  SELECT organization_id FROM organization_members
  WHERE user_id = current_setting('app.current_user_id')::uuid
));
```

**Para Opción B:**
```sql
-- 1. Desactivar RLS en todas las tablas
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
-- ...repetir para todas las tablas

-- 2. Agregar filtros en código
-- 3. Tests exhaustivos
-- 4. Code review estricto
```

---

## 📋 Checklist para Tomar Decisión

- [ ] Contar cuántos bugs/incidentes relacionados con RLS han tenido
- [ ] Evaluar si el equipo entiende bien RLS
- [ ] Considerar el tiempo que toma debuggear problemas de RLS
- [ ] Evaluar qué tan crítica es la seguridad (¿datos médicos, financieros?)
- [ ] Considerar el tamaño del equipo y experiencia con PostgreSQL
- [ ] Evaluar si tienen buenos tests de integración
- [ ] Decidir entre: Simplicidad vs Defensa en Profundidad

---

## 📞 Próximos Pasos

1. **Responde estas preguntas:**
   - ¿Cuánto tiempo gastan debuggeando problemas de RLS por semana?
   - ¿Qué tan sensibles son los datos (escala 1-10)?
   - ¿Prefieren código simple o máxima seguridad?

2. **Elige una opción (A o B recomendadas)**

3. **Te ayudo a implementarla paso a paso**

---

**Pregunta:** ¿Qué opción te parece más adecuada para tu caso?
