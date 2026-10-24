import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard, invitadoGuard, rolGuard } from './core/guards/auth.guard';
import { Rol } from './core/models/auth.model';

// Roles por módulo (mismas reglas que SecurityConfig del backend)
const HABITACIONES: Rol[] = ['ADMIN', 'RECEPCION', 'HOUSEKEEPING', 'EVENTOS'];
const HABITACIONES_GESTION: Rol[] = ['ADMIN', 'RECEPCION'];
const RESERVAS: Rol[] = ['ADMIN', 'RECEPCION', 'FINANZAS'];
const RECEPCION: Rol[] = ['ADMIN', 'RECEPCION'];
const INCIDENCIAS: Rol[] = ['ADMIN', 'RECEPCION', 'HOUSEKEEPING'];
const PERSONAL: Rol[] = ['ADMIN', 'RECEPCION', 'HOUSEKEEPING', 'EVENTOS'];
const INVENTARIO: Rol[] = ['ADMIN', 'ALMACEN', 'HOUSEKEEPING', 'FINANZAS'];
const INVENTARIO_GESTION: Rol[] = ['ADMIN', 'ALMACEN'];
const SERVICIOS: Rol[] = ['ADMIN', 'RECEPCION', 'HOUSEKEEPING', 'EVENTOS', 'FINANZAS'];
const EVENTOS: Rol[] = ['ADMIN', 'EVENTOS', 'RECEPCION', 'FINANZAS'];
const EVENTOS_GESTION: Rol[] = ['ADMIN', 'EVENTOS'];
const FINANZAS: Rol[] = ['ADMIN', 'FINANZAS'];
const FACTURAS: Rol[] = ['ADMIN', 'FINANZAS', 'RECEPCION'];
const ADMIN: Rol[] = ['ADMIN'];

const con = (roles: Rol[]) => ({ canActivate: [rolGuard], data: { roles } });

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
        ...con(ADMIN),
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
        ...con(FINANZAS),
        loadComponent: () => import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
      },

      // Administración
      {
        path: 'usuarios',
        ...con(ADMIN),
        loadComponent: () => import('./features/admin/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'auditoria',
        ...con(ADMIN),
        loadComponent: () => import('./features/admin/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
