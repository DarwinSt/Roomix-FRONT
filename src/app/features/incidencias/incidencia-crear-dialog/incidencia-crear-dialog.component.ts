import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Habitacion } from '../../../core/models/habitacion.model';
import {
  ALCANCES_INCIDENCIA,
  AlcanceIncidencia,
  ContextoLimpieza,
  TipoIncidencia,
} from '../../../core/models/incidencia.model';
import { IncidenciaService } from '../../../core/services/incidencia.service';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { combinarFechaHora } from '../../../core/utils/date.util';
import {
  OpcionServicioHabitacion,
  etiquetaEstadoHabitacion,
  serviciosPermitidos,
} from '../../../core/utils/servicios-habitacion.util';
import { metaEstado } from '../../../core/utils/habitacion-estado.util';

export interface IncidenciaCrearDialogData {
  habitacion?: Habitacion;
  tipoPreseleccionado?: TipoIncidencia;
  contextoLimpieza?: ContextoLimpieza;
}

@Component({
  selector: 'app-incidencia-crear-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './incidencia-crear-dialog.component.html',
  styleUrl: './incidencia-crear-dialog.component.scss',
})
export class IncidenciaCrearDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<IncidenciaCrearDialogComponent, boolean>);
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly habitacionService = inject(HabitacionService);
  private readonly errorDialog = inject(ErrorDialogService);
  readonly data: IncidenciaCrearDialogData = inject(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly ALCANCES = ALCANCES_INCIDENCIA;
  readonly habitaciones = signal<Habitacion[]>([]);
  readonly meta = metaEstado;
  readonly etiquetaHab = etiquetaEstadoHabitacion;

  alcance: AlcanceIncidencia = 'HABITACION';
  habitacionId: number | null = null;
  ubicacion = '';
  tipo: TipoIncidencia | null = null;
  contextoLimpieza: ContextoLimpieza | null = null;
  tipoZonaComun: TipoIncidencia = 'MANTENIMIENTO';
  opcionSeleccionadaKey = '';
  descripcion = '';
  fechaProgramada: Date | null = null;
  horaProgramada = '09:00';
  guardando = false;

  readonly habitacionSeleccionada = computed(() => {
    if (this.data.habitacion) return this.data.habitacion;
    const id = this.habitacionId;
    return id != null ? this.habitaciones().find((h) => h.id === id) ?? null : null;
  });

  readonly opcionesServicio = computed(() => {
    const h = this.habitacionSeleccionada();
    if (!h || this.alcance !== 'HABITACION') return [];
    return serviciosPermitidos(h.estado);
  });

  readonly opcionActiva = (): OpcionServicioHabitacion | null => {
    const key = this.opcionSeleccionadaKey;
    return this.opcionesServicio().find((o) => this.opcionKey(o) === key) ?? null;
  };

  ngOnInit(): void {
    if (this.data.habitacion) {
      this.alcance = 'HABITACION';
      this.habitacionId = this.data.habitacion.id;
      this.aplicarPreseleccion();
    } else {
      this.habitacionService.listar().subscribe({
        next: (list) => this.habitaciones.set(list),
        error: (err) => this.errorDialog.mostrarDesdeApi(err),
      });
    }
  }

  tituloDialogo(): string {
    if (this.data.habitacion) {
      if (this.data.tipoPreseleccionado === 'MANTENIMIENTO') {
        return `Programar mantenimiento — Hab. ${this.data.habitacion.numero}`;
      }
      if (this.data.habitacion.estado === 'OCUPADO') {
        return 'Solicitar servicio al huésped';
      }
      return `Nuevo servicio — Hab. ${this.data.habitacion.numero}`;
    }
    return 'Nuevo servicio';
  }

  iconoDialogo(): string {
    if (this.data.tipoPreseleccionado === 'MANTENIMIENTO') return 'construction';
    if (this.habitacionSeleccionada()?.estado === 'OCUPADO') return 'room_service';
    if (this.alcance === 'ZONA_COMUN') return 'meeting_room';
    return 'support_agent';
  }

  textoHint(): string {
    if (this.alcance === 'ZONA_COMUN') {
      return 'Mantenimiento u otro servicio fuera de habitaciones.';
    }
    const h = this.habitacionSeleccionada();
    if (!h) return 'Seleccione la habitación y el tipo de servicio.';
    if (h.estado === 'OCUPADO') {
      return 'El huésped sigue con reserva activa. Los servicios no cambian el estado de la habitación.';
    }
    if (h.estado === 'INHABILITADO') {
      return 'La limpieza post check-out se crea sola. Aquí puede agregar mantenimiento u otro servicio.';
    }
    if (h.estado === 'LIBRE') {
      return 'Solo reservable si está Libre y sin mantenimiento en las fechas. La limpieza post check-out es automática.';
    }
    if (h.estado === 'RESERVADO') {
      return 'Mantenimiento u otro antes del check-in. No se programa limpieza manual aquí.';
    }
    return 'Seleccione el servicio.';
  }

  opcionKey(o: OpcionServicioHabitacion): string {
    return `${o.tipo}:${o.contextoLimpieza ?? ''}`;
  }

  onAlcanceChange(): void {
    this.tipo = null;
    this.contextoLimpieza = null;
    this.opcionSeleccionadaKey = '';
    this.ubicacion = '';
    this.habitacionId = null;
  }

  seleccionarAlcance(valor: AlcanceIncidencia): void {
    if (this.alcance === valor) return;
    this.alcance = valor;
    this.onAlcanceChange();
  }

  onHabitacionChange(): void {
    this.opcionSeleccionadaKey = '';
    this.tipo = null;
    this.contextoLimpieza = null;
  }

  onOpcionChange(): void {
    const op = this.opcionActiva();
    if (!op) return;
    this.aplicarOpcion(op);
  }

  seleccionarOpcion(o: OpcionServicioHabitacion): void {
    this.opcionSeleccionadaKey = this.opcionKey(o);
    this.aplicarOpcion(o);
  }

  private aplicarOpcion(o: OpcionServicioHabitacion): void {
    this.tipo = o.tipo;
    this.contextoLimpieza = o.contextoLimpieza ?? null;
    if (o.tipo === 'MANTENIMIENTO' && !this.fechaProgramada) {
      this.fechaProgramada = new Date();
    }
  }

  puedeCrear(): boolean {
    if (this.alcance === 'ZONA_COMUN') {
      if (!this.ubicacion.trim()) return false;
      return !!this.tipoZonaComun;
    }
    if (!this.habitacionId || !this.tipo) return false;
    if (this.tipo === 'LIMPIEZA' && !this.contextoLimpieza) return false;
    if (this.tipo === 'MANTENIMIENTO' && (!this.fechaProgramada || !this.horaProgramada)) return false;
    return true;
  }

  crear(): void {
    const tipo = this.alcance === 'ZONA_COMUN' ? this.tipoZonaComun : this.tipo;
    if (!tipo) return;
    this.guardando = true;

    let fechaHoraProgramada: string | null = null;
    if (tipo === 'MANTENIMIENTO' && this.alcance === 'HABITACION' && this.fechaProgramada) {
      const [h, m] = this.horaProgramada.split(':').map(Number);
      const hora = new Date();
      hora.setHours(h, m, 0, 0);
      fechaHoraProgramada = combinarFechaHora(this.fechaProgramada, hora);
    }

    this.incidenciaService
      .crear({
        alcance: this.alcance,
        habitacionId: this.alcance === 'HABITACION' ? this.habitacionId : null,
        ubicacion: this.alcance === 'ZONA_COMUN' ? this.ubicacion.trim() : null,
        tipo,
        contextoLimpieza: tipo === 'LIMPIEZA' ? this.contextoLimpieza : null,
        descripcion: this.descripcion.trim() || null,
        fechaHoraProgramada,
      })
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          this.guardando = false;
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }

  private aplicarPreseleccion(): void {
    const preTipo = this.data.tipoPreseleccionado;
    const preCtx = this.data.contextoLimpieza;
    const opciones = this.opcionesServicio();
    const match = opciones.find(
      (o) =>
        o.tipo === preTipo &&
        (preCtx == null ? !o.contextoLimpieza : o.contextoLimpieza === preCtx),
    );
    if (match) {
      this.seleccionarOpcion(match);
    } else if (opciones.length === 1) {
      this.seleccionarOpcion(opciones[0]);
    }
  }
}
