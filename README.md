# Roomix — Frontend

Aplicación Angular 21 para la administración hotelera. Consume el API REST del backend en `http://localhost:8080`.

## Requisitos

- Node.js 22+
- npm 11+
- Angular CLI 21.2+
- Backend Roomix en ejecución

## Instalación

```bash
cd Frontend
npm install
```

## Desarrollo

```bash
npm start
```

Abre http://localhost:4200

## Módulos y rutas

| Ruta | Descripción |
|------|-------------|
| `/inicio` | Panel de módulos (acceso rápido) |
| `/habitaciones` | Grid de habitaciones, filtros y cambio de estado |
| `/habitaciones/nueva` | Alta de habitación |
| `/habitaciones/:id/editar` | Edición |
| `/habitaciones/:id/estado` | Cambio de estado dedicado |
| `/incidencias` | Listado de incidencias activas y cerradas |
| `/incidencias/:id` | Gestión: asignar, iniciar, checklist, finalizar |
| `/inventario` | Artículos y movimientos de stock |
| `/inventario/categorias` | Categorías del inventario |

## Flujos principales (UI)

### Habitaciones

1. Reservar → check-in → ocupada.
2. Desde **ocupada**, marcar **check-out** → habitación **inhabilitada** (`POST_CHECKOUT`).
3. Desde **libre** o **reservada**, marcar **adecuación programada** → **inhabilitada** (`ADECUACION_PROGRAMADA`).
4. En **inhabilitada**, crear servicios (limpieza, mantenimiento, servicio al cuarto, etc.) y ver barras de progreso en la tarjeta.

### Incidencias (servicios)

1. Se crean **manualmente** desde una habitación en estado `INHABILITADO` (botón «Nuevo servicio»).
2. Tipos: limpieza, mantenimiento, servicio al cuarto, otro.
3. **Asignar personal** → 25 %.
4. **Iniciar servicio en habitación** → 50 %.
5. Marcar **checks** del checklist → avance hasta 99 %.
6. **Finalizar** (o cancelar) todas las incidencias activas → la habitación se **habilita** automáticamente (`LIBRE` o `RESERVADO` según el motivo de inhabilitación).

### Inventario

- CRUD de artículos y categorías.
- Ajuste de stock (entrada/salida).
- Iconos **estáticos** (`mat-icon`) dentro del módulo; los **GIF** animados solo en inicio y menú lateral.

## Menú lateral

- Habitaciones, Incidencias, Inventario, Categorías.
- Habitaciones / Inventario / Categorías usan iconos GIF en el nav; Incidencias usa icono Material.

## Configuración API

Edita `src/environments/environment.ts` si el backend no está en el puerto 8080.

## Build producción

```bash
npm run build
```

Salida en `dist/roomix`.

## Documentación API

Swagger UI del backend: http://localhost:8080/swagger-ui.html
