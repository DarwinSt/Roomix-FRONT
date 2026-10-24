# Roomix — Frontend

Aplicación Angular 21 para la administración hotelera. Consume el API REST del backend (`http://localhost:8080` en desarrollo; configurable con `API_URL` en producción).

## Requisitos

- Node.js 22+
- npm 11+
- Angular CLI 21.2+
- Backend Roomix en ejecución

## Instalación

```bash
cd Roomix-FRONT
npm install
```

## Desarrollo

```bash
npm start
```

Abre http://localhost:4200

## Acceso y roles

La app exige iniciar sesión (`/login`). El token JWT se guarda en `localStorage` y el interceptor `auth.interceptor.ts` lo envía en cada petición; si el backend responde 401 la sesión se cierra. Los guards `authGuard` y `rolGuard` (con `data.roles` en `app.routes.ts`) y el menú (`core/config/navegacion.config.ts`) muestran a cada rol solo sus módulos; los botones de acciones también se ocultan según el rol. El backend aplica las mismas reglas.

Usuarios de demostración (si el backend tiene `APP_DEMO_USERS=true`): `admin`, `recepcion`, `housekeeping`, `finanzas`, `eventos`, `almacen`.

## Módulos y rutas

| Ruta | Roles | Descripción |
|------|-------|-------------|
| `/login`, `/recuperar`, `/restablecer` | público | Ingreso y recuperación de contraseña por correo |
| `/inicio` | todos | Dashboard del rol: ocupación, llegadas/salidas con check-in/out rápido, alertas, finanzas, inventario crítico, eventos |
| `/habitaciones` | admin, recepción, housekeeping, eventos | Tarjetas por estado, filtros y acciones rápidas |
| `/habitaciones/plano` | ídem | Plano del hotel por piso |
| `/habitaciones/:id` | ídem | Fotos (subida por admin), datos, historial de reservas |
| `/reservas` · `/reservas/:id` | admin, recepción, finanzas | Listado y calendario · detalle: editar, cancelar con motivo, check-in/out, cuenta, servicios, comprobante imprimible, facturar |
| `/huespedes` · `/huespedes/:id` | admin, recepción, finanzas | Registro con autorización Ley 1581 · historial de reservas, servicios y facturas |
| `/incidencias` | admin, recepción, housekeeping | Limpieza y mantenimiento |
| `/servicios` | operación | Solicitudes (asignar, programar, completar, cancelar) y catálogo |
| `/eventos` · `/eventos/:id` | admin, eventos (+ lectura recepción y finanzas) | Eventos y salones · participantes, asistencia, recursos, estados, factura |
| `/inventario` · `/inventario/reporte` | admin, almacén (+ lectura housekeeping y finanzas) | Artículos, movimientos (entrada/salida/ajuste) · valorización, más usados, críticos |
| `/finanzas` · `/facturas` | admin, finanzas (+ facturas recepción) | Ingresos, egresos, gráficos, facturas, pagos |
| `/reportes` | admin, finanzas | Ocupación, ADR, RevPAR, canales, procedencia, servicios, eventos; CSV e impresión |
| `/usuarios` · `/auditoria` | admin | Gestión de usuarios y roles · bitácora de acciones |
| `/ayuda` | todos | Manual de usuario por rol |

## Pruebas

```bash
npm test
```

Vitest: sesión, guards de ruta, interceptor JWT (token y cierre por 401), menú por rol y política de contraseñas.

## Configuración API

- **Desarrollo:** `src/environments/environment.ts` (`http://localhost:8080/api`).
- **Producción:** `src/environments/environment.production.ts`, que `npm run build` regenera a partir de la variable de entorno **`API_URL`** (script `scripts/set-env.mjs`). Sin `API_URL` se usa `/api` (mismo dominio).

Los montos se muestran en pesos colombianos (`es-CO`, `COP`).

## Build producción

```bash
API_URL=https://mi-backend.up.railway.app/api npm run build
```

Salida en `dist/roomix/browser`.

## Despliegue

Antes de desplegar, agrega la URL del frontend a `CORS_ALLOWED_ORIGINS` en el backend.

| Plataforma | Configuración |
|------------|---------------|
| **Render (Static Site)** | Build command: `npm ci && npm run build` · Publish directory: `dist/roomix/browser` · Variable `API_URL`. En *Redirects/Rewrites* agrega `/*` → `/index.html` (Rewrite). |
| **Railway** | Usa el `Dockerfile` (nginx). Define `API_URL` como variable (Railway la pasa como build arg). Genera un dominio público. |
| **Vercel** | Importa el repo; `vercel.json` ya define build, salida y rewrites. Define `API_URL` en *Environment Variables*. |
| **Docker** | `docker build --build-arg API_URL=https://.../api -t roomix-front .` y `docker run -p 8080:80 roomix-front`. |

## App Android (APK)

La misma aplicación Angular se empaqueta como app nativa con **Capacitor 8** (sin reescribir la UI). El proyecto nativo está en `android/`.

### Requisitos

- Android Studio (incluye el SDK) y JDK 21
- Backend desplegado con **https** y `https://localhost` en `CORS_ALLOWED_ORIGINS` (es el origen de la app dentro del teléfono)

### Generar el APK

```bash
# 1. Compila Angular apuntando al backend y sincroniza con el proyecto Android
API_URL=https://mi-backend.up.railway.app/api npm run build:android

# 2a. APK de prueba (instalable directamente)
cd android && ./gradlew assembleDebug
#     → android/app/build/outputs/apk/debug/app-debug.apk

# 2b. O abre Android Studio para firmar la versión final
npm run android:open      # Build → Generate Signed App Bundle / APK
```

En Windows (PowerShell): `$env:API_URL="https://.../api"; npm run build:android` y luego `cd android; .\gradlew assembleDebug`.

> El `API_URL` queda fijo dentro del APK: si cambias la URL del backend, vuelve a generarlo.

**Pruebas con el emulador y el backend local:** `API_URL=http://10.0.2.2:8080/api npm run build:android` (`10.0.2.2` es el PC visto desde el emulador). Con una URL `http://` se habilita automáticamente el tráfico sin cifrar (ver `capacitor.config.ts`); con `https://` queda bloqueado.

### Detalles de la integración

| Aspecto | Implementación |
|---------|----------------|
| Botón "atrás" de Android | Vuelve a la pantalla anterior; en la raíz cierra la app (`core/config/mobile.config.ts`) |
| Barra de estado / notch / gestos | `viewport-fit=cover` + `env(safe-area-inset-*)` en la barra superior, menú y contenido |
| Fuentes e íconos | Incluidos en el build (sin Google Fonts): funcionan con mala señal |
| Ícono y splash | Generados desde `assets/logo.png` con `npx @capacitor/assets generate --android` |

## Diseño responsive

Validado sin desbordes en 320, 360, 375, 390, 412 y 430 px (vertical), 740 y 915 px (horizontal), tablets 768 y 1024 px y escritorio 1366 px:

- Menos de 1024 px: menú lateral superpuesto que se cierra al navegar; barra superior fija al hacer scroll.
- Tablas (reservas, categorías): se convierten en tarjetas en pantallas pequeñas.
- Contadores de resumen en una fila compacta; filtros a todo el ancho.
- Calendario de reservas: en el teléfono muestra el número de reservas por día; al tocar un día se listan debajo.
- Utilidades compartidas en `src/styles/_responsive.scss`.

## Documentación API

Swagger UI del backend: http://localhost:8080/swagger-ui.html
