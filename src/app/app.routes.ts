import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'habitaciones',
        loadComponent: () =>
          import('./features/habitaciones/habitaciones-list/habitaciones-list.component').then(
            (m) => m.HabitacionesListComponent,
          ),
      },
      {
        path: 'habitaciones/nueva',
        loadComponent: () =>
          import('./features/habitaciones/habitacion-form/habitacion-form.component').then(
            (m) => m.HabitacionFormComponent,
          ),
      },
      {
        path: 'habitaciones/:id/editar',
        loadComponent: () =>
          import('./features/habitaciones/habitacion-form/habitacion-form.component').then(
            (m) => m.HabitacionFormComponent,
          ),
      },
      {
        path: 'habitaciones/:id/estado',
        loadComponent: () =>
          import('./features/habitaciones/habitacion-estado/habitacion-estado.component').then(
            (m) => m.HabitacionEstadoComponent,
          ),
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario-list/inventario-list.component').then(
            (m) => m.InventarioListComponent,
          ),
      },
      {
        path: 'inventario/categorias',
        loadComponent: () =>
          import('./features/inventario/categorias-list/categorias-list.component').then(
            (m) => m.CategoriasListComponent,
          ),
      },
      {
        path: 'inventario/categorias/nueva',
        loadComponent: () =>
          import('./features/inventario/categoria-form/categoria-form.component').then(
            (m) => m.CategoriaFormComponent,
          ),
      },
      {
        path: 'inventario/categorias/:id/editar',
        loadComponent: () =>
          import('./features/inventario/categoria-form/categoria-form.component').then(
            (m) => m.CategoriaFormComponent,
          ),
      },
      {
        path: 'inventario/nuevo',
        loadComponent: () =>
          import('./features/inventario/articulo-form/articulo-form.component').then(
            (m) => m.ArticuloFormComponent,
          ),
      },
      {
        path: 'inventario/:id/editar',
        loadComponent: () =>
          import('./features/inventario/articulo-form/articulo-form.component').then(
            (m) => m.ArticuloFormComponent,
          ),
      },
      {
        path: 'incidencias',
        loadComponent: () =>
          import('./features/incidencias/incidencias-list/incidencias-list.component').then(
            (m) => m.IncidenciasListComponent,
          ),
      },
      {
        path: 'incidencias/:id',
        loadComponent: () =>
          import('./features/incidencias/incidencia-detail/incidencia-detail.component').then(
            (m) => m.IncidenciaDetailComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
