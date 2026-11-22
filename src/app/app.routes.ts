import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard, invitadoGuard, permisoGuard } from './core/guards/auth.guard';
import { Permiso } from './core/models/permisos.model';

// Permiso que exige cada ruta (mismas reglas que SecurityConfig del backend; el módulo debe estar licenciado)
const HABITACIONES: Permiso[] = ['HABITACIONES_VER'];
const HABITACIONES_GESTION: Permiso[] = ['HABITACIONES_OPERAR'];
const HABITACIONES_ADMIN: Permiso[] = ['HABITACIONES_ADMINISTRAR'];
const RESERVAS: Permiso[] = ['RESERVAS_VER'];
const RECEPCION: Permiso[] = ['RESERVAS_GESTIONAR'];
const INCIDENCIAS: Permiso[] = ['LIMPIEZA'];
const PERSONAL: Permiso[] = ['PERSONAL_VER'];
const INVENTARIO: Permiso[] = ['INVENTARIO_VER'];
const INVENTARIO_GESTION: Permiso[] = ['INVENTARIO_GESTIONAR'];
const SERVICIOS: Permiso[] = ['SERVICIOS_VER'];
const EVENTOS: Permiso[] = ['EVENTOS_VER'];
const EVENTOS_GESTION: Permiso[] = ['EVENTOS_GESTIONAR'];
const FINANZAS: Permiso[] = ['FINANZAS'];
const REPORTES: Permiso[] = ['REPORTES'];
const FACTURAS: Permiso[] = ['FACTURAS'];
const CAJA: Permiso[] = ['CAJA_VER'];
const USUARIOS: Permiso[] = ['USUARIOS'];
const PROMOCIONES: Permiso[] = ['PROMOCIONES_GESTIONAR'];
const CONFIGURACION: Permiso[] = ['CONFIGURACION'];
const VENTAS: Permiso[] = ['VENTAS'];

const con = (permisos: Permiso[]) => ({ canActivate: [permisoGuard], data: { permisos } });

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'recuperar',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/auth/recuperar/recuperar.component').then((m) => m.RecuperarComponent),
  },
  {
    path: 'restablecer',
    loadComponent: () => import('./features/auth/recuperar/recuperar.component').then((m) => m.RestablecerComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'cambiar-password',
        loadComponent: () =>
          import('./features/auth/cambiar-password/cambiar-password.component').then((m) => m.CambiarPasswordComponent),
      },
      {
        path: 'ayuda',
        loadComponent: () => import('./features/ayuda/ayuda.component').then((m) => m.AyudaComponent),
      },

      // Habitaciones
      {
        path: 'habitaciones',
        ...con(HABITACIONES),
        loadComponent: () =>
          import('./features/habitaciones/habitaciones-list/habitaciones-list.component').then((m) => m.HabitacionesListComponent),
      },
      {
        path: 'habitaciones/plano',
        ...con(HABITACIONES),
        loadComponent: () =>
          import('./features/habitaciones/habitacion-plano/habitacion-plano.component').then((m) => m.HabitacionPlanoComponent),
      },
      {
        path: 'habitaciones/nueva',
        ...con(HABITACIONES_ADMIN),
        loadComponent: () =>
          import('./features/habitaciones/habitacion-form/habitacion-form.component').then((m) => m.HabitacionFormComponent),
      },
      {
        path: 'habitaciones/:id/reservar',
        ...con(RECEPCION),
        loadComponent: () =>
          import('./features/habitaciones/habitacion-reserva/habitacion-reserva.component').then((m) => m.HabitacionReservaComponent),
      },
      {
        path: 'habitaciones/:id/editar',
        ...con(HABITACIONES_GESTION),
        loadComponent: () =>
          import('./features/habitaciones/habitacion-form/habitacion-form.component').then((m) => m.HabitacionFormComponent),
      },
      {
        path: 'habitaciones/:id/estado',
        ...con(HABITACIONES_GESTION),
        loadComponent: () =>
          import('./features/habitaciones/habitacion-estado/habitacion-estado.component').then((m) => m.HabitacionEstadoComponent),
      },
      {
        path: 'habitaciones/:id',
        ...con(HABITACIONES),
        loadComponent: () =>
          import('./features/habitaciones/habitacion-detalle/habitacion-detalle.component').then((m) => m.HabitacionDetalleComponent),
      },

      // Reservas y huéspedes
      {
        path: 'reservas',
        ...con(RESERVAS),
        loadComponent: () => import('./features/reservas/reservas-list/reservas-list.component').then((m) => m.ReservasListComponent),
      },
      {
        path: 'reservas/:id',
        ...con(RESERVAS),
        loadComponent: () =>
          import('./features/reservas/reserva-detalle/reserva-detalle.component').then((m) => m.ReservaDetalleComponent),
      },
      {
        path: 'huespedes',
        ...con(RESERVAS),
        loadComponent: () => import('./features/huespedes/huespedes-list/huespedes-list.component').then((m) => m.HuespedesListComponent),
      },
      {
        path: 'huespedes/nuevo',
        ...con(RECEPCION),
        loadComponent: () => import('./features/huespedes/huesped-form/huesped-form.component').then((m) => m.HuespedFormComponent),
      },
      {
        path: 'huespedes/:id/editar',
        ...con(RECEPCION),
        loadComponent: () => import('./features/huespedes/huesped-form/huesped-form.component').then((m) => m.HuespedFormComponent),
      },
      {
        path: 'huespedes/:id',
        ...con(RESERVAS),
        loadComponent: () =>
          import('./features/huespedes/huesped-detalle/huesped-detalle.component').then((m) => m.HuespedDetalleComponent),
      },

      // Limpieza, mantenimiento y personal
      {
        path: 'incidencias',
        ...con(INCIDENCIAS),
        loadComponent: () =>
          import('./features/incidencias/incidencias-list/incidencias-list.component').then((m) => m.IncidenciasListComponent),
      },
      {
        path: 'incidencias/:id',
        ...con(INCIDENCIAS),
        loadComponent: () =>
          import('./features/incidencias/incidencia-detail/incidencia-detail.component').then((m) => m.IncidenciaDetailComponent),
      },
      {
        path: 'personal',
        ...con(PERSONAL),
        loadComponent: () => import('./features/personal/personal-list/personal-list.component').then((m) => m.PersonalListComponent),
      },

      // Servicios y eventos
      {
        path: 'servicios',
        ...con(SERVICIOS),
        loadComponent: () => import('./features/servicios/servicios.component').then((m) => m.ServiciosComponent),
      },
      {
        path: 'eventos',
        ...con(EVENTOS),
        loadComponent: () => import('./features/eventos/eventos-list/eventos-list.component').then((m) => m.EventosListComponent),
      },
      {
        path: 'eventos/nuevo',
        ...con(EVENTOS_GESTION),
        loadComponent: () => import('./features/eventos/evento-form/evento-form.component').then((m) => m.EventoFormComponent),
      },
      {
        path: 'eventos/:id/editar',
        ...con(EVENTOS_GESTION),
        loadComponent: () => import('./features/eventos/evento-form/evento-form.component').then((m) => m.EventoFormComponent),
      },
      {
        path: 'eventos/:id',
        ...con(EVENTOS),
        loadComponent: () => import('./features/eventos/evento-detalle/evento-detalle.component').then((m) => m.EventoDetalleComponent),
      },

      // Inventario
      {
        path: 'inventario',
        ...con(INVENTARIO),
        loadComponent: () => import('./features/inventario/inventario-list/inventario-list.component').then((m) => m.InventarioListComponent),
      },
      {
        path: 'inventario/reporte',
        ...con(INVENTARIO),
        loadComponent: () =>
          import('./features/inventario/inventario-reporte/inventario-reporte.component').then((m) => m.InventarioReporteComponent),
      },
      {
        path: 'inventario/categorias',
        ...con(INVENTARIO),
        loadComponent: () =>
          import('./features/inventario/categorias-list/categorias-list.component').then((m) => m.CategoriasListComponent),
      },
      {
        path: 'inventario/categorias/nueva',
        ...con(INVENTARIO_GESTION),
        loadComponent: () => import('./features/inventario/categoria-form/categoria-form.component').then((m) => m.CategoriaFormComponent),
      },
      {
        path: 'inventario/categorias/:id/editar',
        ...con(INVENTARIO_GESTION),
        loadComponent: () => import('./features/inventario/categoria-form/categoria-form.component').then((m) => m.CategoriaFormComponent),
      },
      {
        path: 'inventario/nuevo',
        ...con(INVENTARIO_GESTION),
        loadComponent: () => import('./features/inventario/articulo-form/articulo-form.component').then((m) => m.ArticuloFormComponent),
      },
      {
        path: 'inventario/:id/editar',
        ...con(INVENTARIO_GESTION),
        loadComponent: () => import('./features/inventario/articulo-form/articulo-form.component').then((m) => m.ArticuloFormComponent),
      },

      // Finanzas
      {
        path: 'finanzas',
        ...con(FINANZAS),
        loadComponent: () => import('./features/finanzas/finanzas-panel/finanzas-panel.component').then((m) => m.FinanzasPanelComponent),
      },
      {
        path: 'ventas',
        ...con(VENTAS),
        loadComponent: () => import('./features/ventas/ventas.component').then((m) => m.VentasComponent),
      },
      {
        path: 'ventas/:id/ticket',
        ...con(VENTAS),
        loadComponent: () => import('./features/ventas/ticket-venta.component').then((m) => m.TicketVentaComponent),
      },
      {
        path: 'caja',
        ...con(CAJA),
        loadComponent: () => import('./features/caja/caja.component').then((m) => m.CajaComponent),
      },
      {
        path: 'caja/turnos/:id',
        ...con(CAJA),
        loadComponent: () => import('./features/caja/turno-detalle.component').then((m) => m.TurnoDetalleComponent),
      },
      {
        path: 'facturas',
        ...con(FACTURAS),
        loadComponent: () => import('./features/finanzas/facturas-list/facturas-list.component').then((m) => m.FacturasListComponent),
      },
      {
        path: 'facturas/:id',
        ...con(FACTURAS),
        loadComponent: () =>
          import('./features/finanzas/factura-detalle/factura-detalle.component').then((m) => m.FacturaDetalleComponent),
      },
      {
        path: 'reportes',
        ...con(REPORTES),
        loadComponent: () => import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
      },

      // Administración
      {
        path: 'usuarios',
        ...con(USUARIOS),
        loadComponent: () => import('./features/admin/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'promociones',
        ...con(PROMOCIONES),
        loadComponent: () => import('./features/admin/promociones/promociones.component').then((m) => m.PromocionesComponent),
      },
      {
        path: 'configuracion',
        ...con(CONFIGURACION),
        loadComponent: () => import('./features/admin/configuracion/configuracion.component').then((m) => m.ConfiguracionComponent),
      },
      {
        path: 'auditoria',
        ...con(USUARIOS),
        loadComponent: () => import('./features/admin/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
