# Guía de Deployment - Holy Moly Frontend

## Configuración de Variables de Entorno

Este proyecto usa variables de entorno que se configuran de forma segura a través de GitHub Secrets.

### Variables de Entorno Necesarias

El frontend requiere las siguientes variables de entorno:

```env
VITE_API_URL=https://api-holymoly.networksalas.com/api
VITE_APP_URL=https://holymoly.networksalas.com
```

## Configurar GitHub Secrets

Para que el deployment funcione correctamente, necesitas configurar los siguientes secrets en GitHub:

### 1. Acceder a GitHub Secrets

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

### 2. Secrets Requeridos

Configura los siguientes secrets:

#### Secrets de Deployment (Ya existentes)
- `DEPLOY_SERVER`: Dirección IP del servidor (ej: `172.235.129.129`)
- `DEPLOY_USER`: Usuario SSH para deployment (ej: `deploy`)
- `DEPLOY_KEY`: Contenido de la llave privada SSH

#### Secrets de Variables de Entorno (NUEVOS - Agregar estos)

**VITE_API_URL**
```
Name: VITE_API_URL
Secret: https://api-holymoly.networksalas.com/api
```

**VITE_APP_URL**
```
Name: VITE_APP_URL
Secret: https://holymoly.networksalas.com
```

### 3. Verificar Secrets Configurados

Después de agregar los secrets, deberías ver en la lista:

- ✅ `DEPLOY_SERVER`
- ✅ `DEPLOY_USER`
- ✅ `DEPLOY_KEY`
- ✅ `VITE_API_URL` (NUEVO)
- ✅ `VITE_APP_URL` (NUEVO)

## Cómo Funciona el Deployment

### Flujo de Deployment

1. **Push a la rama `main`** → Activa GitHub Actions
2. **GitHub Actions**:
   - Hace checkout del código
   - Crea archivo `.env` desde los secrets
   - Sube el código al servidor (incluyendo `.env`)
3. **En el Servidor**:
   - Docker lee el `.env`
   - Pasa las variables como build args al Dockerfile
   - Durante el build, Vite lee el `.env` y embebe las variables en el código
   - Genera los archivos estáticos optimizados
   - Sirve los archivos con el servidor

### Arquitectura de Variables de Entorno

```
GitHub Secrets
    ↓
GitHub Actions crea .env
    ↓
rsync sube .env al servidor
    ↓
Docker Compose lee .env
    ↓
Dockerfile recibe build args
    ↓
npm run build con variables embebidas
    ↓
Aplicación desplegada con configuración correcta
```

## Archivos Importantes

### `.env` (Local - NO se sube a GitHub)
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_URL=http://localhost:8080
```

### `.env.example` (Template - SÍ se sube a GitHub)
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_URL=http://localhost:5173
```

### `.gitignore` (Configurado para NO subir .env)
```
.env
.env.local
.env.production
```

## Desarrollo Local

Para desarrollo local:

1. **Copiar el template**:
   ```bash
   cp .env.example .env
   ```

2. **Editar `.env`** con valores locales:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_APP_URL=http://localhost:8080
   ```

3. **Reiniciar el servidor** después de cambiar `.env`:
   ```bash
   npm run dev
   ```

## Deployment a Producción

### Deployment Automático

Cada vez que haces push a `main`, GitHub Actions automáticamente:

1. Crea el `.env` desde los secrets
2. Despliega al servidor
3. Construye y reinicia el contenedor Docker

### Deployment Manual

Si necesitas hacer deploy manualmente:

```bash
# 1. SSH al servidor
ssh deploy@172.235.129.129

# 2. Ir al directorio del proyecto
cd /var/www/holy_dashboard

# 3. Crear/actualizar .env
nano .env
# Agregar:
# VITE_API_URL=https://api-holymoly.networksalas.com/api
# VITE_APP_URL=https://holymoly.networksalas.com

# 4. Rebuild y restart
docker compose build --no-cache
docker compose up -d
```

## Troubleshooting

### Problema: 404 en rutas después del deployment

**Síntoma**: Las rutas como `/reset-password` dan 404.

**Causa**: El frontend no está desplegado o las variables de entorno no están configuradas.

**Solución**:
1. Verificar que los GitHub Secrets estén configurados correctamente
2. Hacer push a `main` para activar el deployment
3. Verificar logs de GitHub Actions

### Problema: API URLs incorrectas

**Síntoma**: La app intenta conectarse a `localhost` en producción.

**Causa**: Las variables de entorno no se están pasando correctamente.

**Solución**:
1. Verificar GitHub Secrets (`VITE_API_URL` y `VITE_APP_URL`)
2. Verificar que el `.env` existe en el servidor:
   ```bash
   ssh deploy@servidor
   cat /var/www/holy_dashboard/.env
   ```
3. Rebuild el contenedor:
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

### Problema: Variables de entorno no se actualizan

**Síntoma**: Cambié los secrets pero la app sigue usando valores antiguos.

**Causa**: Docker está usando la imagen cacheada.

**Solución**:
```bash
# En el servidor
cd /var/www/holy_dashboard
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Verificar Deployment

Después del deployment, verifica:

1. **GitHub Actions**: ✅ El workflow completó sin errores
2. **Contenedor corriendo**:
   ```bash
   ssh deploy@servidor
   docker ps | grep holymoly-frontend
   ```
3. **URLs funcionando**:
   - https://holymoly.networksalas.com
   - https://holymoly.networksalas.com/reset-password
   - https://holymoly.networksalas.com/forgot-password

## Cambiar URLs de Producción

Si necesitas cambiar las URLs (por ejemplo, cambiar dominio):

1. **Actualizar GitHub Secrets**:
   - Settings → Secrets and variables → Actions
   - Editar `VITE_API_URL` y/o `VITE_APP_URL`

2. **Hacer push a main** (puede ser un commit vacío):
   ```bash
   git commit --allow-empty -m "Trigger rebuild with new env vars"
   git push origin main
   ```

3. **Verificar** que el deployment completó exitosamente

## Seguridad

⚠️ **IMPORTANTE**:

- ❌ **NUNCA** subas archivos `.env` a GitHub
- ✅ Usa GitHub Secrets para valores sensibles
- ✅ El `.gitignore` ya está configurado para proteger `.env`
- ✅ Los secrets están encriptados en GitHub
- ✅ Solo los colaboradores con permisos pueden ver/editar secrets

## Contacto

Para problemas con el deployment, contactar al equipo de DevOps o revisar los logs en GitHub Actions.
