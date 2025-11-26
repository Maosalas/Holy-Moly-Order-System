# Guía de Gestión de Features de Suscripción

## 🎯 Dos Formas de Gestionar Features

---

## 1️⃣ MODIFICACIÓN ESTÁTICA (en código)

### Ubicación
`src/hooks/use-subscription-features.ts` (líneas 33-71)

### Cómo AGREGAR un feature

```typescript
const featureAccess: Record<string, string[]> = {
  // Features existentes...
  api_access: ['professional', 'enterprise'],

  // ✨ AGREGAR AQUÍ
  video_calls: ['professional', 'enterprise'],
  unlimited_storage: ['enterprise'],
  custom_reports: ['starter', 'professional', 'enterprise'],
};
```

### Cómo MODIFICAR acceso a un feature

```typescript
// ANTES: Solo Professional y Enterprise
api_access: ['professional', 'enterprise'],

// DESPUÉS: También para Starter
api_access: ['starter', 'professional', 'enterprise'],
```

### Cómo ELIMINAR un feature

```typescript
// Opción 1: Comentar
// custom_branding: ['enterprise'],

// Opción 2: Eliminar la línea completamente
```

### Usar el feature en tu código

```tsx
import { useSubscriptionFeatures } from "@/hooks/use-subscription-features";

function VideoSettings() {
  const { hasFeatureAccess } = useSubscriptionFeatures();

  // Verificar si tiene acceso
  if (!hasFeatureAccess('video_calls')) {
    return <UpgradeMessage />;
  }

  return <VideoCallSettings />;
}

// O usando el componente FeatureGuard
import { FeatureGuard } from "@/components/FeatureGuard";

function VideoSettings() {
  return (
    <FeatureGuard feature="video_calls">
      <VideoCallSettings />
    </FeatureGuard>
  );
}
```

---

## 2️⃣ PANEL DE ADMINISTRACIÓN (dinámico vía UI)

### 🎛️ Componente Completo de Gestión

**RECOMENDADO:** Usa el componente `CompleteSubscriptionManager` que integra todo:

```tsx
// src/pages/SuperAdmin.tsx
import CompleteSubscriptionManager from "@/components/CompleteSubscriptionManager";

export default function SuperAdmin() {
  return (
    <div>
      <Tabs>
        <TabsList>
          <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>
          {/* ... otros tabs */}
        </TabsList>

        <TabsContent value="subscriptions">
          <CompleteSubscriptionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**El componente `CompleteSubscriptionManager` incluye:**
- ✅ Tab 1: **Planes** - Gestión completa de planes (crear, editar, eliminar)
- ✅ Tab 2: **Features Disponibles** - CRUD de features del sistema
- ✅ Tab 3: **Asignar Features** - Selección de plan para configurar sus features
- ✅ Vista de edición de features por plan

### Componentes Individuales (uso avanzado)

Si prefieres usar los componentes por separado:

```tsx
// src/pages/SuperAdmin.tsx
import SubscriptionPlansManager from "@/components/SubscriptionPlansManager";
import SubscriptionFeaturesManager from "@/components/SubscriptionFeaturesManager";
import PlanFeaturesEditor from "@/components/PlanFeaturesEditor";

export default function SuperAdmin() {
  return (
    <div>
      <Tabs>
        <TabsList>
          <TabsTrigger value="plans">Planes</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          {/* ... otros tabs */}
        </TabsList>

        <TabsContent value="plans">
          <SubscriptionPlansManager />
        </TabsContent>

        <TabsContent value="features">
          <SubscriptionFeaturesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Usando el Panel de Admin

#### CREAR un nuevo feature

1. Click en **"Nuevo Feature"**
2. Completar el formulario:
   - **Key**: `video_calls` (solo letras minúsculas, números y `_`)
   - **Nombre**: `Video Calls`
   - **Descripción**: `Acceso a videollamadas en la plataforma`
   - **Tipo**: `boolean`
   - **Valor por Defecto**: `false`
   - **Orden**: `10`
3. Click en **"Guardar"**

#### EDITAR un feature

1. Click en el icono de **lápiz** ✏️ en la fila del feature
2. Modificar los campos (excepto el Key que no se puede cambiar)
3. Click en **"Guardar"**

#### ELIMINAR un feature

1. Click en el icono de **basura** 🗑️ en la fila del feature
2. Confirmar la eliminación

---

## 📝 Asignar Features a Planes

Después de crear features, necesitas asignarlos a los planes:

### Opción A: Usando el Panel de Admin (RECOMENDADO) ✨

**Paso 1:** Ve al tab "Asignar Features" en `CompleteSubscriptionManager`

**Paso 2:** Selecciona el plan que quieres configurar

**Paso 3:** En el editor de features:
- Cada feature disponible aparece con su control apropiado (switch, input, etc.)
- Modifica los valores según necesites
- Click en "Guardar" individual o "Guardar Todos" para múltiples cambios
- Los features sin valor asignado usan el valor por defecto

**Características del Editor:**
- ✅ Edición en vivo con indicador de cambios sin guardar
- ✅ Botón de guardar individual por feature
- ✅ Botón de guardar todos los cambios de una vez
- ✅ Botón para eliminar feature del plan
- ✅ Soporte para todos los tipos de valores (boolean, number, string, json)

### Opción B: Usando el Hook (estático)

Edita `src/hooks/use-subscription-features.ts`:

```typescript
const featureAccess: Record<string, string[]> = {
  video_calls: ['professional', 'enterprise'], // Tu nuevo feature
};
```

### Opción C: Usando la API (dinámico)

**Endpoint:** `PATCH /api/subscription-plans/:planId/features/:featureKey`

```typescript
// Ejemplo: Asignar video_calls al plan Professional
const response = await fetch('/api/subscription-plans/plan-pro-id/features/video_calls', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    value: true  // Habilitar este feature
  }),
});
```

---

## 🎨 Componentes de Protección

### FeatureGuard

Protege contenido que requiere un feature específico:

```tsx
import { FeatureGuard } from "@/components/FeatureGuard";

// Ejemplo 1: Feature único
<FeatureGuard feature="video_calls">
  <VideoCallComponent />
</FeatureGuard>

// Ejemplo 2: Múltiples features (todos requeridos)
<FeatureGuard features={["api_access", "custom_branding"]}>
  <AdvancedSettings />
</FeatureGuard>

// Ejemplo 3: Al menos uno de los features
<FeatureGuard features={["priority_support", "dedicated_support"]} requireAny>
  <SupportChat />
</FeatureGuard>

// Ejemplo 4: Con botón de upgrade
<FeatureGuard
  feature="advanced_analytics"
  onUpgradeClick={() => navigate('/pricing')}
>
  <AnalyticsDashboard />
</FeatureGuard>

// Ejemplo 5: Ocultar completamente si no tiene acceso
<FeatureGuard feature="white_label" hideWhenRestricted>
  <WhiteLabelSettings />
</FeatureGuard>
```

### FeatureSwitch

Mostrar diferentes componentes según el plan:

```tsx
import { FeatureSwitch } from "@/components/FeatureGuard";

<FeatureSwitch>
  <FeatureSwitch.When feature="advanced_analytics">
    <AdvancedDashboard />
  </FeatureSwitch.When>

  <FeatureSwitch.When feature="api_access">
    <BasicDashboard />
  </FeatureSwitch.When>

  <FeatureSwitch.Otherwise>
    <FreeDashboard />
  </FeatureSwitch.Otherwise>
</FeatureSwitch>
```

---

## 📊 Features Actuales por Plan

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| `team_management` | ❌ | ✅ | ✅ | ✅ |
| `api_access` | ❌ | ❌ | ✅ | ✅ |
| `priority_support` | ❌ | ❌ | ✅ | ✅ |
| `advanced_analytics` | ❌ | ❌ | ✅ | ✅ |
| `advanced_security` | ❌ | ❌ | ✅ | ✅ |
| `custom_branding` | ❌ | ❌ | ❌ | ✅ |
| `dedicated_support` | ❌ | ❌ | ❌ | ✅ |
| `custom_integrations` | ❌ | ❌ | ❌ | ✅ |
| `white_label` | ❌ | ❌ | ❌ | ✅ |
| `sla_guarantee` | ❌ | ❌ | ❌ | ✅ |

---

## 🔧 Ejemplos Prácticos

### Ejemplo 1: Agregar "Unlimited Storage"

**Paso 1:** Crear el feature (Opción estática)

```typescript
// src/hooks/use-subscription-features.ts
const featureAccess: Record<string, string[]> = {
  // ... otros features
  unlimited_storage: ['enterprise'],
};
```

**Paso 2:** Usar en un componente

```tsx
// src/components/StorageSettings.tsx
import { FeatureGuard } from "@/components/FeatureGuard";

export function StorageSettings() {
  return (
    <div>
      <h2>Almacenamiento</h2>

      <FeatureGuard feature="unlimited_storage">
        <div className="alert alert-success">
          ✅ Tienes almacenamiento ilimitado
        </div>
      </FeatureGuard>

      <FeatureGuard feature="unlimited_storage" hideWhenRestricted>
        <button>Subir archivos grandes</button>
      </FeatureGuard>
    </div>
  );
}
```

### Ejemplo 2: Verificar múltiples features

```tsx
import { useSubscriptionFeatures } from "@/hooks/use-subscription-features";

export function DashboardWidget() {
  const {
    hasFeatureAccess,
    hasAllFeatures,
    hasAnyFeature,
    getCurrentPlan
  } = useSubscriptionFeatures();

  // Verificar un feature
  const canUseAPI = hasFeatureAccess('api_access');

  // Verificar todos los features (AND)
  const hasAdvancedFeatures = hasAllFeatures([
    'api_access',
    'advanced_analytics',
    'priority_support'
  ]);

  // Verificar al menos uno (OR)
  const hasAnySupport = hasAnyFeature([
    'priority_support',
    'dedicated_support'
  ]);

  return (
    <div>
      <p>Tu plan: {getCurrentPlan()}</p>

      {canUseAPI && <ApiKeyDisplay />}
      {hasAdvancedFeatures && <AdvancedDashboard />}
      {hasAnySupport && <SupportButton />}
    </div>
  );
}
```

---

## 🏗️ Arquitectura de Componentes

### Componentes Disponibles

#### `CompleteSubscriptionManager` (Componente Principal)
**Ubicación:** `src/components/CompleteSubscriptionManager.tsx`

**Descripción:** Componente maestro que integra toda la gestión de suscripciones en una interfaz con tabs.

**Características:**
- Vista de tabs con 3 secciones: Planes, Features Disponibles, Asignar Features
- Navegación a vista de edición de features por plan
- Badge con contador de planes
- Botón de volver desde la vista de edición

**Uso:**
```tsx
import CompleteSubscriptionManager from "@/components/CompleteSubscriptionManager";

<CompleteSubscriptionManager />
```

---

#### `SubscriptionPlansManager`
**Ubicación:** `src/components/SubscriptionPlansManager.tsx`

**Descripción:** CRUD completo para planes de suscripción.

**Características:**
- Tabla con todos los planes
- Crear nuevo plan con formulario
- Editar plan existente
- Eliminar plan (con confirmación)
- Toggle activo/inactivo
- Auto-generación de slug desde el nombre
- Validación de campos requeridos

---

#### `SubscriptionFeaturesManager`
**Ubicación:** `src/components/SubscriptionFeaturesManager.tsx`

**Descripción:** CRUD completo para features del sistema.

**Características:**
- Tabla con todos los features disponibles
- Crear nuevo feature con tipos: boolean, number, string, json
- Editar feature (key no editable después de crear)
- Eliminar feature (con confirmación)
- Orden de visualización personalizable

---

#### `PlanFeaturesEditor`
**Ubicación:** `src/components/PlanFeaturesEditor.tsx`

**Descripción:** Editor visual de features asignados a un plan específico.

**Características:**
- Carga features disponibles del sistema
- Carga features asignados al plan
- Inputs dinámicos según el tipo de feature:
  - Boolean → Switch
  - Number → Input numérico
  - String → Input de texto
  - JSON → Textarea con validación
- Indicador visual de cambios sin guardar
- Guardar individual por feature
- Guardar todos los cambios de una vez
- Eliminar feature del plan
- Botón de recargar datos

**Uso:**
```tsx
import PlanFeaturesEditor from "@/components/PlanFeaturesEditor";

<PlanFeaturesEditor
  planId="plan-123"
  planName="Professional"
/>
```

---

### API Endpoints Agregados

#### Features del Sistema
```typescript
// GET - Obtener todos los features
subscriptionFeaturesApi.getAll()

// GET - Obtener un feature por ID
subscriptionFeaturesApi.getById(id)

// POST - Crear nuevo feature
subscriptionFeaturesApi.create({
  key: "video_calls",
  name: "Video Calls",
  description: "Access to video call features",
  value_type: "boolean",
  default_value: false,
  display_order: 10
})

// PUT - Actualizar feature
subscriptionFeaturesApi.update(id, data)

// DELETE - Eliminar feature
subscriptionFeaturesApi.delete(id)
```

#### Features de Planes
```typescript
// GET - Obtener features de un plan
subscriptionPlansApi.getPlanFeatures(planId)

// PUT - Actualizar todos los features de un plan
subscriptionPlansApi.updateAllPlanFeatures(planId, {
  video_calls: true,
  api_access: true,
  max_api_calls: 10000
})

// PATCH - Actualizar un feature específico de un plan
subscriptionPlansApi.updatePlanFeature(planId, "video_calls", {
  value: true
})

// DELETE - Eliminar feature de un plan
subscriptionPlansApi.deletePlanFeature(planId, "video_calls")
```

---

## ⚠️ Notas Importantes

1. **Los features en el hook son ESTÁTICOS**: Si modificas el archivo TypeScript, necesitas recompilar la aplicación.

2. **El Panel de Admin es DINÁMICO**: Los features creados vía UI se guardan en la base de datos, pero necesitas sincronizar con el hook manualmente.

3. **Consistencia**: Mantén sincronizados los features del hook con los de la base de datos para evitar inconsistencias.

4. **Testing**: Siempre prueba los features con diferentes planes antes de publicar cambios.

---

## 🚀 Próximos Pasos

1. ✅ Crea features básicos usando el hook
2. ✅ Agrega el panel de admin a tu aplicación
3. ✅ Implementa componente para asignar features a planes (CompleteSubscriptionManager)
4. ✅ Editor visual de features por plan (PlanFeaturesEditor)
5. ⭕ Sincronización automática entre hook y base de datos (próximamente)

---

¿Necesitas más ejemplos o ayuda con algún feature específico?
