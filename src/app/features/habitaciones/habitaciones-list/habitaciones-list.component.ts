import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { IncidenciaService } from '../../../core/services/incidencia.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import {
  ESTADOS_HABITACION,
  EstadoHabitacion,
  etiquetaEstadoReserva,
  Habitacion,
  TIPOS_HABITACION,
  TipoHabitacion,
} from '../../../core/models/habitacion.model';
import { Incidencia } from '../../../core/models/incidencia.model';
import { IncidenciaCrearDialogComponent } from '../../incidencias/incidencia-crear-dialog/incidencia-crear-dialog.component';
import {
  etiquetaEstadoIncidencia,
  nivelProgresoIncidencia,
  progresoIncidencia,
  resumenProgresoIncidencia,
} from '../../../core/utils/incidencia-progreso.util';
import { forkJoin } from 'rxjs';
import { FechaRoomixPipe } from '../../../shared/pipes/fecha-roomix.pipe';
import {
  etiquetaMotivoInhabilitacion,
  metaEstado,
  transicionesDisponibles,
} from '../../../core/utils/habitacion-estado.util';
import {
  AccionRapida,
  accionesRapidasDisponibles,
  trackAccionRapida,
} from '../../../core/utils/acciones-rapidas.util';
import {
  payloadCancelarReserva,
  payloadCheckIn,
  payloadCheckOut,
} from '../../../core/utils/habitacion-acciones.util';
import { TipoIncidencia, ContextoLimpieza } from '../../../core/models/incidencia.model';
import { formatearFechaDisplay } from '../../../core/utils/date.util';
import { HabitacionEstadoDialogComponent } from '../habitacion-estado-dialog/habitacion-estado-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { etiquetaUltimaActualizacion, programarAutoRefresh } from '../../../core/utils/auto-refresh.util';
import { etiquetaEstadoHabitacion, etiquetaContextoLimpieza } from '../../../core/utils/servicios-habitacion.util';

type OrdenHabitacion = 'numero' | 'estado' | 'tipo' | 'actualizado-desc';

@Component({
  selector: 'app-habitaciones-list',
  imports: [
    FormsModule,
    RouterLink,
    FechaRoomixPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDialogModule,
  ],
  templateUrl: './habitaciones-list.component.html',
  styleUrl: './habitaciones-list.component.scss',
})
export class HabitacionesListComponent implements OnInit {
  private readonly habitacionService = inject(HabitacionService);
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly estados = ESTADOS_HABITACION;
  readonly tipos = TIPOS_HABITACION;
  readonly loading = signal(true);
  readonly habitaciones = signal<Habitacion[]>([]);
  readonly incidenciasPorHabitacion = signal<Map<number, Incidencia[]>>(new Map());
  readonly busqueda = signal('');
  readonly filtroEstado = signal<EstadoHabitacion | ''>('');
  readonly tarjetaExpandidaId = signal<number | null>(null);
  readonly ultimaActualizacion = signal<Date | null>(null);

  filtroTipo: TipoHabitacion | '' = '';
  orden: OrdenHabitacion = 'numero';

  readonly resumenEstados = computed(() =>
    ESTADOS_HABITACION.map((e) => ({
      ...e,
      ...metaEstado(e.value),
      count: this.habitaciones().filter((h) => h.estado === e.value).length,
    })),
  );

  readonly habitacionesVisibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    let list = this.habitaciones();

    const estado = this.filtroEstado();
    if (estado) {
      list = list.filter((h) => h.estado === estado);
    }

    if (this.filtroTipo) {
      list = list.filter((h) => h.tipoHabitacion === this.filtroTipo);
    }

    if (q) {
      list = list.filter(
        (h) =>
          h.numero.toLowerCase().includes(q) ||
          h.descripcion.toLowerCase().includes(q) ||
          h.tipoHabitacion.toLowerCase().includes(q) ||
          h.caracteristicas.some((c) => c.toLowerCase().includes(q)) ||
          (h.huesped?.nombreCompleto.toLowerCase().includes(q) ?? false) ||
          (h.huesped?.numeroDocumento.toLowerCase().includes(q) ?? false),
      );
    }

    return [...list].sort((a, b) => {
      switch (this.orden) {
        case 'estado':
          return a.estado.localeCompare(b.estado) || a.numero.localeCompare(b.numero);
        case 'tipo':
          return a.tipoHabitacion.localeCompare(b.tipoHabitacion) || a.numero.localeCompare(b.numero);
        case 'actualizado-desc':
          return b.fechaHoraUltimaActualizacion.localeCompare(a.fechaHoraUltimaActualizacion);
        default:
          return a.numero.localeCompare(b.numero, undefined, { numeric: true });
      }
    });
  });

  readonly totalVisible = computed(() => this.habitacionesVisibles().length);

  readonly etiquetaSync = computed(() => etiquetaUltimaActualizacion(this.ultimaActualizacion()));

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const estado = params.get('estado') as EstadoHabitacion | null;
      if (estado && ESTADOS_HABITACION.some((e) => e.value === estado)) {
        this.filtroEstado.set(estado);
      }
      this.cargar(true);
    });
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cargar(mostrarLoading = true): void {
    if (mostrarLoading) this.loading.set(true);
    forkJoin({
      habitaciones: this.habitacionService.listar(),
      incidencias: this.incidenciaService.listar({ activas: true }),
    }).subscribe({
      next: ({ habitaciones, incidencias }) => {
        this.habitaciones.set(habitaciones);
        const map = new Map<number, Incidencia[]>();
        for (const inc of incidencias) {
          if (inc.habitacionId == null) continue;
          const list = map.get(inc.habitacionId) ?? [];
          list.push(inc);
          map.set(inc.habitacionId, list);
        }
        this.incidenciasPorHabitacion.set(map);
        this.ultimaActualizacion.set(new Date());
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }

  puedeCambiarEstado(h: Habitacion): boolean {
    return transicionesDisponibles(h).length > 0;
  }

  filtrarPorEstado(estado: EstadoHabitacion | ''): void {
    this.filtroEstado.set(this.filtroEstado() === estado ? '' : estado);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroEstado.set('');
    this.filtroTipo = '';
    this.orden = 'numero';
  }

  toggleDetalle(id: number): void {
    this.tarjetaExpandidaId.update((actual) => (actual === id ? null : id));
  }

  abrirCambioEstado(h: Habitacion): void {
    const ref = this.dialog.open(HabitacionEstadoDialogComponent, {
      ...roomixDialogConfig({ width: '560px' }),
      data: h,
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.snackBar.open(`Estado de habitación ${h.numero} actualizado`, 'OK', { duration: 3000 });
        this.cargar(true);
      }
    });
  }

  acciones(h: Habitacion): AccionRapida[] {
    return accionesRapidasDisponibles(h);
  }

  trackAccion = trackAccionRapida;

  accionRapida(h: Habitacion, accion: AccionRapida, event: Event): void {
    event.stopPropagation();

    switch (accion.tipo) {
      case 'RESERVAR':
        this.abrirReserva(h);
        return;
      case 'SOLICITAR_SERVICIO':
        this.abrirCrearIncidencia(h, event);
        return;
      case 'MANTENIMIENTO':
        this.abrirCrearIncidencia(h, event, 'MANTENIMIENTO');
        return;
    }

    const payloads = {
      CHECK_IN: payloadCheckIn(),
      CHECK_OUT: payloadCheckOut(),
      CANCELAR_RESERVA: payloadCancelarReserva(),
    } as const;

    const payload = payloads[accion.tipo as keyof typeof payloads];
    if (!payload) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      ...roomixDialogConfig({ width: '460px' }),
      data: {
        title: `Habitación ${h.numero}`,
        message: this.mensajeConfirmacion(h, accion),
        confirmLabel: 'Confirmar',
        icon: accion.icon,
      },
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.habitacionService.actualizarEstado(h.id, payload).subscribe({
        next: () => {
          this.snackBar.open(`Habitación ${h.numero}: ${accion.label}`, 'OK', { duration: 3000 });
          this.cargar(true);
        },
        error: (err) => this.errorDialog.mostrarDesdeApi(err),
      });
    });
  }

  private mensajeConfirmacion(h: Habitacion, accion: AccionRapida): string {
    const huesped = h.huesped?.nombreCompleto ?? 'el huésped asignado';
    if (accion.tipo === 'CHECK_OUT') {
      return (
        `Registrar la salida de ${huesped} en la habitación ${h.numero}.\n\n` +
        'La habitación quedará INHABILITADA y se creará automáticamente una incidencia de LIMPIEZA.'
      );
    }
    if (accion.tipo === 'CHECK_IN') {
      return (
        `Registrar la llegada de ${huesped} a la habitación ${h.numero}.\n\n` +
        'El estado pasará a OCUPADO.'
      );
    }
    if (accion.tipo === 'CANCELAR_RESERVA') {
      return (
        `Cancelar la reserva de ${huesped} en la habitación ${h.numero}.\n\n` +
        'Volverá a LIBRE y se eliminarán las fechas planificadas.'
      );
    }
    return `${accion.label}. ${accion.hint}`;
  }

  abrirReserva(h: Habitacion, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/habitaciones', h.id, 'reservar']);
  }

  eliminar(h: Habitacion, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      ...roomixDialogConfig({ width: '400px' }),
      data: {
        title: 'Eliminar habitación',
        message: `¿Eliminar la habitación ${h.numero}? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        icon: 'delete',
        warn: true,
      },
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.habitacionService.eliminar(h.id).subscribe({
        next: () => {
          this.snackBar.open('Habitación eliminada', 'OK', { duration: 3000 });
          this.cargar(true);
        },
        error: (err) => this.errorDialog.mostrarDesdeApi(err),
      });
    });
  }

  etiqueta(h: Habitacion): string {
    return etiquetaEstadoHabitacion(h);
  }

  meta(estado: EstadoHabitacion) {
    return metaEstado(estado);
  }

  etiquetaMotivo(h: Habitacion): string | null {
    return h.motivoInhabilitacion ? etiquetaMotivoInhabilitacion(h.motivoInhabilitacion) : null;
  }

  etiquetaTipo(tipo: TipoHabitacion): string {
    return TIPOS_HABITACION.find((t) => t.value === tipo)?.label ?? tipo;
  }

  etiquetaReserva = etiquetaEstadoReserva;
  formatearFecha = formatearFechaDisplay;

  muestraIncidencias(h: Habitacion): boolean {
    return this.incidenciasDe(h).length > 0;
  }

  abrirCrearIncidencia(
    h: Habitacion,
    event: Event,
    tipoPreseleccionado?: TipoIncidencia,
    contextoLimpieza?: ContextoLimpieza,
  ): void {
    event.stopPropagation();
    const ref = this.dialog.open(IncidenciaCrearDialogComponent, {
      ...roomixDialogConfig(),
      data: { habitacion: h, tipoPreseleccionado, contextoLimpieza },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.snackBar.open(`Servicio registrado — habitación ${h.numero}`, 'OK', { duration: 3000 });
        this.cargar(true);
      }
    });
  }

  incidenciasDe(h: Habitacion): Incidencia[] {
    return this.incidenciasPorHabitacion().get(h.id) ?? [];
  }

  progresoInc = progresoIncidencia;
  resumenInc = resumenProgresoIncidencia;
  nivelInc = nivelProgresoIncidencia;
  etiquetaInc = etiquetaEstadoIncidencia;
  etiquetaContextoLimp = etiquetaContextoLimpieza;
}
