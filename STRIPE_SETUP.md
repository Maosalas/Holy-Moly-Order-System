# Configuración de Stripe para Suscripciones

Este documento describe cómo configurar Stripe para gestionar las suscripciones de los planes en la aplicación.

## Requisitos Previos

1. Cuenta de Stripe (crear en https://stripe.com)
2. Variables de entorno configuradas en el archivo `.env`

## Paso 1: Obtener las Claves de Stripe

1. Ingresa a tu [Dashboard de Stripe](https://dashboard.stripe.com)
2. Ve a **Developers** → **API Keys**
3. Copia las siguientes claves:
   - **Publishable key** (comienza con `pk_test_` o `pk_live_`)
   - **Secret key** (comienza con `sk_test_` o `sk_live_`)

## Paso 2: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (si no existe) y agrega:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica_aqui
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
```

**Importante:**
- `VITE_STRIPE_PUBLISHABLE_KEY`: Es pública y se usa en el frontend
- `STRIPE_SECRET_KEY`: **NUNCA** debe compartirse y solo se usa en el backend
- `STRIPE_WEBHOOK_SECRET`: Se usa para verificar eventos de webhook

## Paso 3: Configurar Webhooks (Opcional pero Recomendado)

Los webhooks permiten que tu aplicación reciba notificaciones automáticas cuando ocurren eventos en Stripe (ej. cuando un pago es exitoso).

1. En el Dashboard de Stripe, ve a **Developers** → **Webhooks**
2. Haz clic en **Add endpoint**
3. Ingresa tu URL de webhook: `https://tu-dominio.com/api/stripe/webhook`
4. Selecciona los eventos que quieres recibir:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copia el **Signing secret** y agrégalo a tu `.env` como `STRIPE_WEBHOOK_SECRET`

## Paso 4: Crear Productos y Precios en Stripe

### Opción A: Mediante el Dashboard de Stripe

1. Ve a **Products** en el Dashboard
2. Haz clic en **Add product**
3. Ingresa:
   - **Name**: Nombre del plan (ej. "Plan Starter")
   - **Description**: Descripción del plan
4. En la sección **Pricing**, configura:
   - **Recurring**: Marca esta opción
   - **Billing period**: Monthly o Yearly
   - **Price**: El precio del plan
5. Copia el **Price ID** (comienza con `price_`) y guárdalo en tu base de datos en el campo `stripe_price_id` del plan correspondiente

### Opción B: Mediante la API (Backend)

El backend puede crear productos y precios automáticamente al crear un plan de suscripción. Asegúrate de que el endpoint `/super-admin/subscription-plans` esté configurado para crear productos en Stripe.

## Paso 5: Flujo de Checkout

Cuando un usuario hace clic en "Suscribirse" o "Activar Suscripción":

1. El frontend llama a `initializeStripeCheckout()` en `src/lib/stripe.ts`
2. Se crea una sesión de checkout en Stripe mediante el endpoint `/stripe/create-checkout-session`
3. El usuario es redirigido a la página de pago de Stripe
4. Después del pago exitoso:
   - Stripe redirige al usuario de vuelta a tu aplicación
   - El webhook notifica a tu backend sobre el pago exitoso
   - Tu backend actualiza el estado de la suscripción en la base de datos

## Paso 6: Gestionar Suscripciones

Los usuarios con una suscripción activa pueden:
- Ver el botón "Gestionar Suscripción" en la configuración de la organización
- Al hacer clic, son redirigidos al **Customer Portal** de Stripe
- Allí pueden:
  - Cambiar su plan
  - Actualizar método de pago
  - Ver historial de facturas
  - Cancelar suscripción

## Endpoints del Backend Requeridos

Tu backend debe implementar estos endpoints:

### 1. Crear Sesión de Checkout
```
POST /api/stripe/create-checkout-session
Body: {
  "planId": "uuid-del-plan",
  "organizationId": "uuid-de-la-organizacion",
  "billingInterval": "monthly" | "yearly"
}
Response: {
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### 2. Crear Sesión del Portal del Cliente
```
POST /api/stripe/create-portal-session
Body: {
  "organizationId": "uuid-de-la-organizacion"
}
Response: {
  "url": "https://billing.stripe.com/..."
}
```

### 3. Webhook de Stripe
```
POST /api/stripe/webhook
Headers: {
  "stripe-signature": "t=...,v1=..."
}
Body: Evento de Stripe (raw body)
```

## URLs de Redirección

Configura estas URLs en tu sesión de checkout:

- **Success URL**: `https://tu-dominio.com/organization/settings?success=true`
- **Cancel URL**: `https://tu-dominio.com/organization/settings?canceled=true`

## Seguridad

### ⚠️ Importante:

1. **Nunca expongas `STRIPE_SECRET_KEY`** en el frontend
2. **Verifica todas las webhooks** usando el `STRIPE_WEBHOOK_SECRET`
3. **Valida todos los datos** antes de procesarlos
4. **Usa HTTPS** en producción
5. **Implementa rate limiting** en tus endpoints
6. **Registra todos los eventos** importantes para auditoría

## Modo de Prueba vs Producción

### Modo de Prueba (Testing)
- Usa claves que empiezan con `pk_test_` y `sk_test_`
- No se realizan cargos reales
- Usa [tarjetas de prueba de Stripe](https://stripe.com/docs/testing)
- Ejemplo: `4242 4242 4242 4242` (Visa exitosa)

### Modo de Producción
- Usa claves que empiezan con `pk_live_` y `sk_live_`
- Se realizan cargos reales
- Requiere verificación de cuenta de Stripe
- Configura tus dominios permitidos en Stripe

## Tarjetas de Prueba

Algunas tarjetas de prueba útiles:

| Número | Resultado |
|--------|-----------|
| 4242 4242 4242 4242 | Pago exitoso |
| 4000 0025 0000 3155 | Requiere autenticación 3D Secure |
| 4000 0000 0000 9995 | Pago fallido (fondos insuficientes) |

Fecha de expiración: Cualquier fecha futura
CVC: Cualquier 3 dígitos
ZIP: Cualquier 5 dígitos

## Recursos Adicionales

- [Documentación de Stripe](https://stripe.com/docs)
- [Checkout de Stripe](https://stripe.com/docs/payments/checkout)
- [Webhooks de Stripe](https://stripe.com/docs/webhooks)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Tarjetas de Prueba](https://stripe.com/docs/testing)

## Soporte

Si tienes problemas:
1. Revisa los logs de Stripe en el Dashboard
2. Verifica que las claves de API estén correctas
3. Asegúrate de que los webhooks estén configurados correctamente
4. Consulta la [documentación de Stripe](https://stripe.com/docs)
