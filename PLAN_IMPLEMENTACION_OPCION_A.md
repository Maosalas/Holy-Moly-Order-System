# Plan de Implementación - Opción A: Simplificar RLS

## Objetivo
Simplificar la arquitectura actual manteniendo RLS como "safety net" mientras el backend hace el filtrado explícito por `organization_id`.

---

## FASE 1: Preparación y Helpers Centralizados

### 1.1 Crear Helper para Organization ID

**Archivo**: `src/lib/organizationHelper.ts`

```typescript
import { Request } from 'express';

/**
 * Extrae el organization_id del request (del usuario autenticado)
 */
export function getOrganizationId(req: Request): string {
  const organizationId = req.user?.organizationId;
  
  if (!organizationId) {
    throw new Error('organization_id no encontrado en el contexto del usuario');
  }
  
  return organizationId;
}

/**
 * Verifica si el usuario es super admin
 */
export function isSuperAdmin(req: Request): boolean {
  return req.user?.roles?.includes('super_admin') || false;
}

/**
 * Obtiene organization_id solo si no es super admin
 * Super admins pueden ver todo sin filtrar
 */
export function getOrgIdForQuery(req: Request): string | null {
  if (isSuperAdmin(req)) {
    return null; // No filtrar para super admins
  }
  return getOrganizationId(req);
}
```

### 1.2 Crear Utility para Queries Dinámicas

**Archivo**: `src/lib/queryBuilder.ts`

```typescript
interface QueryOptions {
  baseQuery: string;
  organizationId?: string | null;
  additionalFilters?: string[];
  params?: any[];
}

/**
 * Construye query con filtro de organization_id opcional
 */
export function buildQuery(options: QueryOptions): { query: string; params: any[] } {
  const { baseQuery, organizationId, additionalFilters = [], params = [] } = options;
  
  const filters: string[] = [];
  const queryParams: any[] = [...params];
  
  // Agregar filtro de organization si existe
  if (organizationId) {
    filters.push(`organization_id = $${queryParams.length + 1}`);
    queryParams.push(organizationId);
  }
  
  // Agregar filtros adicionales
  filters.push(...additionalFilters);
  
  // Construir query final
  let finalQuery = baseQuery;
  if (filters.length > 0) {
    const hasWhere = baseQuery.toLowerCase().includes('where');
    finalQuery += hasWhere ? ' AND ' : ' WHERE ';
    finalQuery += filters.join(' AND ');
  }
  
  return { query: finalQuery, params: queryParams };
}
```

---

## FASE 2: Actualizar Backend - Repositories

### 2.1 Actualizar Recipes Repository

**Archivo**: `src/repositories/recipes.repo.ts`

```typescript
import { getOrgIdForQuery } from '@/lib/organizationHelper';
import { buildQuery } from '@/lib/queryBuilder';

export async function findAll(req: Request): Promise<Recipe[]> {
  const organizationId = getOrgIdForQuery(req);
  
  return withTransaction(req.user.id, async (client) => {
    const { query, params } = buildQuery({
      baseQuery: 'SELECT * FROM recipes',
      organizationId,
      additionalFilters: [],
      params: []
    });
    
    const result = await client.query(query + ' ORDER BY created_at DESC', params);
    return result.rows.map(mapRecipeRow);
  });
}

export async function findById(req: Request, id: string): Promise<Recipe | null> {
  const organizationId = getOrgIdForQuery(req);
  
  return withTransaction(req.user.id, async (client) => {
    const { query, params } = buildQuery({
      baseQuery: 'SELECT * FROM recipes',
      organizationId,
      additionalFilters: ['id = $' + (organizationId ? '2' : '1')],
      params: organizationId ? [id] : []
    });
    
    if (organizationId) {
      params.splice(0, 0, id); // Insertar id al inicio
    } else {
      params.push(id);
    }
    
    const result = await client.query(query, params);
    return result.rows[0] ? mapRecipeRow(result.rows[0]) : null;
  });
}

export async function create(req: Request, data: CreateRecipeData): Promise<Recipe> {
  const organizationId = getOrganizationId(req); // Siempre requerido para INSERT
  
  return withTransaction(req.user.id, async (client) => {
    const result = await client.query(
      `INSERT INTO recipes (name, description, organization_id, created_by, ...) 
       VALUES ($1, $2, $3, $4, ...) 
       RETURNING *`,
      [data.name, data.description, organizationId, req.user.id, ...]
    );
    return mapRecipeRow(result.rows[0]);
  });
}

export async function update(req: Request, id: string, data: UpdateRecipeData): Promise<Recipe> {
  const organizationId = getOrgIdForQuery(req);
  
  return withTransaction(req.user.id, async (client) => {
    const { query, params } = buildQuery({
      baseQuery: `UPDATE recipes SET name = $1, description = $2, updated_at = NOW()`,
      organizationId,
      additionalFilters: ['id = $' + (organizationId ? '4' : '3')],
      params: [data.name, data.description]
    });
    
    if (organizationId) {
      params.push(id);
    } else {
      params.push(id);
    }
    
    const result = await client.query(query + ' RETURNING *', params);
    if (result.rows.length === 0) {
      throw new Error('Recipe no encontrada o sin permisos');
    }
    return mapRecipeRow(result.rows[0]);
  });
}

export async function remove(req: Request, id: string): Promise<void> {
  const organizationId = getOrgIdForQuery(req);
  
  return withTransaction(req.user.id, async (client) => {
    const { query, params } = buildQuery({
      baseQuery: 'DELETE FROM recipes',
      organizationId,
      additionalFilters: ['id = $' + (organizationId ? '2' : '1')],
      params: organizationId ? [id] : []
    });
    
    if (organizationId) {
      params.splice(0, 0, id);
    } else {
      params.push(id);
    }
    
    const result = await client.query(query, params);
    if (result.rowCount === 0) {
      throw new Error('Recipe no encontrada o sin permisos');
    }
  });
}
```

### 2.2 Aplicar el Mismo Patrón a Otros Repositories

**Archivos a actualizar**:
- `src/repositories/orders.repo.ts`
- `src/repositories/ingredients.repo.ts`
- `src/repositories/supplies.repo.ts`
- `src/repositories/expenses.repo.ts`
- `src/repositories/quotations.repo.ts`

**Patrón consistente**:
1. Usar `getOrgIdForQuery(req)` para SELECT/UPDATE/DELETE
2. Usar `getOrganizationId(req)` para INSERT (siempre requerido)
3. Usar `buildQuery()` para construir queries dinámicas
4. Agregar filtro explícito `WHERE organization_id = $X`

---

## FASE 3: Simplificar RLS Policies

### 3.1 Backup de Policies Actuales

**SQL para hacer backup**:

```sql
-- Exportar policies actuales antes de cambiarlos
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3.2 Nuevas Policies Simplificadas

**Archivo SQL**: `supabase/migrations/XXXX_simplify_rls_policies.sql`

```sql
-- ============================================
-- SIMPLIFICAR RLS POLICIES - OPCIÓN A
-- ============================================
-- RLS actúa como "safety net", no como filtro principal
-- El filtrado explícito se hace en el backend

-- ============================================
-- 1. RECIPES TABLE
-- ============================================

-- Eliminar policies antiguas
DROP POLICY IF EXISTS "Members can view org recipes" ON recipes;
DROP POLICY IF EXISTS "Members can insert org recipes" ON recipes;
DROP POLICY IF EXISTS "Members can update org recipes" ON recipes;
DROP POLICY IF EXISTS "Members can delete org recipes" ON recipes;
DROP POLICY IF EXISTS "Super admin can view all recipes" ON recipes;

-- Crear policies simplificadas
CREATE POLICY "Users can view own org recipes or super admin all"
ON recipes FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
  OR public.has_global_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can insert in own org"
ON recipes FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own org recipes or super admin all"
ON recipes FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
  OR public.has_global_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
  OR public.has_global_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can delete own org recipes or super admin all"
ON recipes FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
  OR public.has_global_role(auth.uid(), 'super_admin')
);

-- ============================================
-- 2. ORDERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Members can view org orders" ON orders;
DROP POLICY IF EXISTS "Members can insert org orders" ON orders;
DROP POLICY IF EXISTS "Members can update org orders" ON orders;
DROP POLICY IF EXISTS "Members can delete org orders" ON orders;

CREATE POLICY "Users can view own org orders or super admin all"
ON orders FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
  OR public.has_global_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can insert in own org"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own org orders or super admin all"
ON orders FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
  OR public.has_global_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can delete own org orders or super admin all"
ON orders FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
  OR public.has_global_role(auth.uid(), 'super_admin')
);

-- ============================================
-- REPETIR PARA TODAS LAS TABLAS CON organization_id
-- ============================================
-- ingredients, supplies, expenses, quotations, etc.
-- Seguir el mismo patrón arriba
```

### 3.3 Eliminar Helper Functions Complejas (Opcional)

Si ya no necesitas las funciones `is_org_member`, `has_org_role`, etc., puedes eliminarlas:

```sql
DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_org_role(uuid, uuid, text);
-- Mantener solo has_global_role si la usas
```

---

## FASE 4: Actualizar Frontend (Hooks)

### 4.1 Patrón Consistente en Hooks

Los hooks del frontend **NO NECESITAN CAMBIOS MAYORES** porque el filtrado ahora se hace en el backend.

Sin embargo, asegúrate de que todos los hooks manejen errores correctamente:

**Ejemplo**: `src/hooks/use-recipes.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const recipeKeys = {
  all: ['recipes'] as const,
  detail: (id: string) => ['recipes', id] as const,
};

export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.all,
    queryFn: async () => {
      const result = await recipesApi.getAll();
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener recetas";
        throw new Error(errorMsg);
      }
      return (result as any).data || [];
    },
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (recipe: any) => {
      const result = await recipesApi.create(recipe);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al crear receta";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      toast({
        title: "Receta creada",
        description: "La receta se ha creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// UPDATE y DELETE siguen el mismo patrón
```

### 4.2 Actualizar Hooks Existentes

**Archivos a verificar/actualizar**:
- ✅ `src/hooks/use-recipes.ts` (ya actualizado)
- ✅ `src/hooks/use-orders.ts` (ya actualizado)
- ✅ `src/hooks/use-ingredients.ts` (ya tiene el patrón correcto)
- ✅ `src/hooks/use-supplies.ts` (ya tiene el patrón correcto)
- ✅ `src/hooks/use-expenses.ts` (ya actualizado)
- ✅ `src/hooks/use-quotations.ts` (ya actualizado)
- ✅ `src/hooks/use-recipe-parameters.ts` (ya actualizado en el último cambio)

**Acción**: Verificar que todos usen el mismo patrón de manejo de errores mostrado arriba.

---

## FASE 5: Testing y Validación

### 5.1 Tests de Backend

**Archivo**: `tests/repositories/recipes.test.ts`

```typescript
import { Request } from 'express';
import { findAll, create } from '@/repositories/recipes.repo';

describe('Recipes Repository with Explicit Filtering', () => {
  
  test('Regular user only sees own org recipes', async () => {
    const mockReq = {
      user: {
        id: 'user-123',
        organizationId: 'org-abc',
        roles: []
      }
    } as Request;
    
    const recipes = await findAll(mockReq);
    
    // Verificar que todas las recetas pertenecen a org-abc
    recipes.forEach(recipe => {
      expect(recipe.organizationId).toBe('org-abc');
    });
  });
  
  test('Super admin sees all recipes', async () => {
    const mockReq = {
      user: {
        id: 'admin-123',
        organizationId: 'org-xyz',
        roles: ['super_admin']
      }
    } as Request;
    
    const recipes = await findAll(mockReq);
    
    // Super admin debería ver recetas de múltiples orgs
    const orgIds = new Set(recipes.map(r => r.organizationId));
    expect(orgIds.size).toBeGreaterThan(1);
  });
  
  test('Cannot create recipe without organization_id', async () => {
    const mockReq = {
      user: {
        id: 'user-123',
        // organizationId falta
        roles: []
      }
    } as any;
    
    await expect(create(mockReq, { name: 'Test' }))
      .rejects
      .toThrow('organization_id no encontrado');
  });
});
```

### 5.2 Tests de RLS (Safety Net)

**SQL para validar**:

```sql
-- Test 1: Usuario normal NO puede ver recetas de otra org
SET LOCAL app.current_user_id = 'user-from-org-A';
SELECT * FROM recipes WHERE organization_id = 'org-B';
-- Debería retornar 0 filas (bloqueado por RLS)

-- Test 2: Super admin SÍ puede ver todas las recetas
SET LOCAL app.current_user_id = 'super-admin-user-id';
SELECT * FROM recipes WHERE organization_id = 'org-B';
-- Debería retornar filas (permitido por RLS)

-- Test 3: Usuario no puede insertar en otra org
SET LOCAL app.current_user_id = 'user-from-org-A';
INSERT INTO recipes (name, organization_id) VALUES ('Test', 'org-B');
-- Debería fallar (bloqueado por RLS)
```

### 5.3 Checklist de Validación Manual

- [ ] Usuario normal ve solo sus datos de su org
- [ ] Super admin ve datos de todas las orgs
- [ ] No se puede crear registro sin `organization_id`
- [ ] No se puede modificar `organization_id` de un registro existente
- [ ] RLS bloquea accesos incorrectos (safety net funciona)
- [ ] Queries con JOINs funcionan correctamente
- [ ] Cascade deletes funcionan sin errores

---

## FASE 6: Migración y Rollout

### 6.1 Plan de Migración

**Opción A - Migración Gradual (Recomendada)**:

```
Semana 1: Implementar FASE 1 y 2 (helpers + 2-3 repositories)
Semana 2: Completar FASE 2 (todos los repositories)
Semana 3: Implementar FASE 3 (simplificar RLS)
Semana 4: Testing intensivo
Semana 5: Rollout a producción
```

**Opción B - Big Bang**:
```
Implementar todo de una vez en ambiente de staging
Testing completo
Deploy a producción en una ventana de mantenimiento
```

### 6.2 Rollback Plan

Si algo falla después de la migración:

```sql
-- Revertir RLS policies a versión anterior
-- (ejecutar backup SQL de FASE 3.1)

-- Revertir cambios de código
git revert <commit-hash>
```

### 6.3 Monitoreo Post-Migración

**Métricas a monitorear**:
- Errores 500 (deben disminuir)
- Tiempo de respuesta de queries (debe mejorar)
- Errores de RLS (deben ser casi 0)
- Logs de "organization_id no encontrado" (deben ser 0)

---

## FASE 7: Limpieza Post-Migración

### 7.1 Código Obsoleto a Eliminar

- `withTransaction` ya no necesita establecer `app.current_user_id` (opcional)
- Helper functions de RLS complejas (`is_org_member`, `has_org_role`)
- Código de manejo de contexto de usuario en RLS

### 7.2 Documentación

Actualizar documentación interna:
- Cómo funcionan los filtros por org ahora
- Cómo crear nuevos repositories siguiendo el patrón
- Diferencia entre usuario normal y super admin

---

## Resumen de Beneficios

✅ **Menos complejidad**: Filtrado explícito en backend, fácil de debugear  
✅ **Más seguro**: RLS como safety net  
✅ **Mejor performance**: Queries más simples  
✅ **Menos bugs**: No más problemas de contexto de usuario  
✅ **Más mantenible**: Código predecible y consistente  

---

## Próximos Pasos

1. Revisar este plan con el equipo
2. Decidir estrategia de migración (gradual vs big bang)
3. Crear branch `feat/simplify-rls`
4. Empezar con FASE 1
5. Testing continuo en cada fase
