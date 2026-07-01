import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { ROOMIX_LOGO_URL } from '../../core/config/brand.config';
import { HabitacionService } from '../../core/services/habitacion.service';
import { IncidenciaService } from '../../core/services/incidencia.service';
import { InventarioService } from '../../core/services/inventario.service';
import { ErrorDialogService } from '../../core/services/error-dialog.service';
import { ESTADOS_HABITACION, Habitacion } from '../../core/models/habitacion.model';
import { Incidencia } from '../../core/models/incidencia.model';
import { ArticuloInventario } from '../../core/models/inventario.model';
import { metaEstado } from '../../core/utils/habitacion-estado.util';
import { prioridadIncidencia, siguienteAccionIncidencia } from '../../core/utils/incidencia-accion.util';
import { progresoIncidencia } from '../../core/utils/incidencia-progreso.util';
import { etiquetaUltimaActualizacion, programarAutoRefresh } from '../../core/utils/auto-refresh.util';
import { etiquetaContextoLimpieza } from '../../core/utils/servicios-habitacion.util';

export interface ColaOperativaItem {
  id: string;
  titulo: string;
  subtitulo: string;
  accionLabel: string;
  icon: string;
  ruta: string | unknown[];
  prioridad: number;
}

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly habitacionService = inject(HabitacionService);
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly inventarioService = inject(InventarioService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly logoUrl = ROOMIX_LOGO_URL;
  readonly loading = signal(true);
  readonly habitaciones = signal<Habitacion[]>([]);
  readonly incidenciasActivas = signal<Incidencia[]>([]);
  readonly stockBajo = signal<ArticuloInventario[]>([]);
  readonly personalOcupado = signal(0);
  readonly ultimaActualizacion = signal<Date | null>(null);

  readonly resumenHabitaciones = computed(() =>
    ESTADOS_HABITACION.map((e) => ({
      ...e,
      ...metaEstado(e.value),
      count: this.habitaciones().filter((h) => h.estado === e.value).length,
    })),
  );

  readonly incidenciasSinAsignar = computed(
    () => this.incidenciasActivas().filter((i) => i.estado === 'CREADA').length,
  );

  readonly colaOperativa = computed((): ColaOperativaItem[] => {
    const items: ColaOperativaItem[] = [];

    for (const inc of [...this.incidenciasActivas()].sort(
      (a, b) => prioridadIncidencia(a) - prioridadIncidencia(b),
    )) {
      const accion = siguienteAccionIncidencia(inc);
      if (!accion) continue;
      const ctx =
        inc.tipo === 'LIMPIEZA' && inc.contextoLimpieza
          ? ` · ${etiquetaContextoLimpieza(inc.contextoLimpieza)}`
          : '';
      items.push({
        id: `inc-${inc.id}`,
        titulo: inc.titulo,
        subtitulo: `${inc.ubicacionEtiqueta} · ${progresoIncidencia(inc)}%${ctx}`,
        accionLabel: accion.label,
        icon: accion.icon,
        ruta: ['/incidencias', inc.id],
        prioridad: prioridadIncidencia(inc),
      });
    }

    for (const h of this.habitaciones().filter((x) => x.estado === 'INHABILITADO')) {
      items.push({
        id: `hab-${h.id}`,
        titulo: `Habitación ${h.numero} inhabilitada`,
        subtitulo: h.motivoInhabilitacion === 'POST_CHECKOUT'
          ? 'Limpieza pendiente tras check-out'
          : 'Mantenimiento o servicios en curso',
        accionLabel: 'Ver habitación',
        icon: 'hotel',
        ruta: ['/habitaciones'],
        prioridad: h.motivoInhabilitacion === 'POST_CHECKOUT' ? 3 : 15,
      });
    }

    for (const art of this.stockBajo().slice(0, 5)) {
      items.push({
        id: `inv-${art.id}`,
        titulo: art.nombre,
        subtitulo: `Stock: ${art.cantidad} ${art.unidadMedida} (mín. ${art.cantidadMinima})`,
        accionLabel: 'Ver inventario',
        icon: 'inventory_2',
        ruta: ['/inventario'],
        prioridad: 50,
      });
    }

    return items.sort((a, b) => a.prioridad - b.prioridad).slice(0, 12);
  });

  readonly etiquetaSync = computed(() => etiquetaUltimaActualizacion(this.ultimaActualizacion()));

  ngOnInit(): void {
    this.cargar(true);
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cargar(mostrarLoading: boolean): void {
    if (mostrarLoading) this.loading.set(true);

    forkJoin({
      habitaciones: this.habitacionService.listar(),
      incidencias: this.incidenciaService.listar({ activas: true }),
      stockBajo: this.inventarioService.listarArticulos(undefined, true, true),
      personal: this.incidenciaService.listarPersonal(true),
    }).subscribe({
      next: ({ habitaciones, incidencias, stockBajo, personal }) => {
        this.habitaciones.set(habitaciones);
        this.incidenciasActivas.set(incidencias);
        this.stockBajo.set(stockBajo);
        this.personalOcupado.set(personal.filter((p) => p.ocupado).length);
        this.ultimaActualizacion.set(new Date());
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }

  irAHabitaciones(estado: string): void {
    void this.router.navigate(['/habitaciones'], { queryParams: { estado } });
  }

  irAIncidencias(vista: string): void {
    void this.router.navigate(['/incidencias'], { queryParams: { vista } });
  }
}
