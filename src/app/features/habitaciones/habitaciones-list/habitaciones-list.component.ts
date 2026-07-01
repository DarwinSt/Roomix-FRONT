import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  etiquetaEstado,
  etiquetaMotivoInhabilitacion,
  metaEstado,
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
import { TipoIncidencia } from '../../../core/models/incidencia.model';
import { formatearFechaDisplay } from '../../../core/utils/date.util';
import { HabitacionEstadoDialogComponent } from '../habitacion-estado-dialog/habitacion-estado-dialog.component';
import { HabitacionReservaDialogComponent } from '../habitacion-reserva-dialog/habitacion-reserva-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

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

  readonly estados = ESTADOS_HABITACION;
  readonly tipos = TIPOS_HABITACION;
  readonly loading = signal(true);
  readonly habitaciones = signal<Habitacion[]>([]);
  readonly incidenciasPorHabitacion = signal<Map<number, Incidencia[]>>(new Map());
  readonly busqueda = signal('');
  readonly filtroEstado = signal<EstadoHabitacion | ''>('');
  readonly tarjetaExpandidaId = signal<number | null>(null);

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
          h.caracteristicas.some((c) => c.toLowerCase().includes(q)),
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

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
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
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
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
      data: h,
      width: '560px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.snackBar.open(`Estado de habitación ${h.numero} actualizado`, 'OK', { duration: 3000 });
        this.cargar();
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
      case 'GENERAR_INCIDENCIA':
        this.abrirCrearIncidencia(h, event);
        return;
      case 'ADECUACION':
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
      data: {
        title: `Habitación ${h.numero}`,
        message: `${accion.label}. ${accion.hint}`,
        confirmLabel: 'Confirmar',
        icon: accion.icon,
      },
      width: '420px',
      maxWidth: '95vw',
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.habitacionService.actualizarEstado(h.id, payload).subscribe({
        next: () => {
          this.snackBar.open(`Habitación ${h.numero}: ${accion.label}`, 'OK', { duration: 3000 });
          this.cargar();
        },
        error: (err) => this.errorDialog.mostrarDesdeApi(err),
      });
    });
  }

  abrirReserva(h: Habitacion): void {
    const ref = this.dialog.open(HabitacionReservaDialogComponent, {
      data: h,
      width: '440px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.snackBar.open(`Habitación ${h.numero} reservada`, 'OK', { duration: 3000 });
        this.cargar();
      }
    });
  }

  eliminar(h: Habitacion, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar habitación',
        message: `¿Eliminar la habitación ${h.numero}? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        icon: 'delete',
        warn: true,
      },
      width: '400px',
      maxWidth: '95vw',
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.habitacionService.eliminar(h.id).subscribe({
        next: () => {
          this.snackBar.open('Habitación eliminada', 'OK', { duration: 3000 });
          this.cargar();
        },
        error: (err) => this.errorDialog.mostrarDesdeApi(err),
      });
    });
  }

  etiqueta(estado: EstadoHabitacion): string {
    return etiquetaEstado(estado);
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
    return (
      h.estado === 'INHABILITADO' ||
      h.estado === 'OCUPADO' ||
      this.incidenciasDe(h).length > 0
    );
  }

  abrirCrearIncidencia(h: Habitacion, event: Event, tipoPreseleccionado?: TipoIncidencia): void {
    event.stopPropagation();
    const ref = this.dialog.open(IncidenciaCrearDialogComponent, {
      data: { habitacion: h, tipoPreseleccionado },
      width: '460px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.snackBar.open(`Incidencia creada para habitación ${h.numero}`, 'OK', { duration: 3000 });
        this.cargar();
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
}
