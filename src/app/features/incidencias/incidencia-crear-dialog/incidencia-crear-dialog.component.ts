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
  TIPOS_INCIDENCIA,
  TipoIncidencia,
} from '../../../core/models/incidencia.model';
import { IncidenciaService } from '../../../core/services/incidencia.service';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { combinarFechaHora } from '../../../core/utils/date.util';

export interface IncidenciaCrearDialogData {
  /** Si se abre desde una tarjeta de habitación. */
  habitacion?: Habitacion;
  tipoPreseleccionado?: TipoIncidencia;
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
  template: `
    <h2 mat-dialog-title>{{ tituloDialogo() }}</h2>
    <mat-dialog-content>
      <p class="hint">{{ textoHint() }}</p>

      @if (!data.habitacion) {
        <mat-form-field appearance="outline" class="full">
          <mat-label>¿Dónde aplica?</mat-label>
          <mat-select [(value)]="alcance" (selectionChange)="onAlcanceChange()">
            @for (a of ALCANCES; track a.value) {
              <mat-option [value]="a.value">{{ a.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (alcance === 'HABITACION') {
        @if (!data.habitacion) {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Habitación</mat-label>
            <mat-select [(value)]="habitacionId">
              @for (h of habitaciones(); track h.id) {
                <mat-option [value]="h.id">
                  {{ h.numero }} — {{ h.estado }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      } @else {
        <mat-form-field appearance="outline" class="full">
          <mat-label>Ubicación (zona común)</mat-label>
          <input
            matInput
            [(ngModel)]="ubicacion"
            placeholder="Ej. Lobby, Piscina, Pasillo 2, Cocina..."
          />
        </mat-form-field>
      }

      <mat-form-field appearance="outline" class="full">
        <mat-label>Tipo de servicio</mat-label>
        <mat-select [(value)]="tipo">
          @for (t of tiposDisponibles(); track t.value) {
            <mat-option [value]="t.value">{{ t.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (tipo === 'MANTENIMIENTO' && alcance === 'HABITACION') {
        <mat-form-field appearance="outline" class="full">
          <mat-label>Fecha programada</mat-label>
          <input matInput [matDatepicker]="pickerProg" [(ngModel)]="fechaProgramada" />
          <mat-datepicker-toggle matIconSuffix [for]="pickerProg" />
          <mat-datepicker #pickerProg />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Hora programada</mat-label>
          <input matInput type="time" [(ngModel)]="horaProgramada" />
        </mat-form-field>
        @if (mantenimientoEsHoy()) {
          <p class="aviso-hoy">
            <mat-icon>info</mat-icon>
            Si la fecha es hoy, la habitación quedará inhabilitada solo ese día.
          </p>
        }
      }

      <mat-form-field appearance="outline" class="full">
        <mat-label>Descripción (opcional)</mat-label>
        <textarea matInput rows="2" [(ngModel)]="descripcion"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!puedeCrear() || guardando" (click)="crear()">
        @if (guardando) {
          <mat-spinner diameter="18" />
        } @else {
          Crear incidencia
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
      min-width: min(92vw, 520px);
    }

    mat-dialog-content {
      padding-top: 0.5rem !important;
    }

    .full { width: 100%; }
    .hint { margin: 0 0 1rem; color: var(--text-200); font-size: 0.88rem; }
    .aviso-hoy {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      margin: 0 0 1rem;
      font-size: 0.85rem;
      color: var(--text-200);
    }
    .aviso-hoy mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
  `,
})
export class IncidenciaCrearDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<IncidenciaCrearDialogComponent, boolean>);
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly habitacionService = inject(HabitacionService);
  private readonly errorDialog = inject(ErrorDialogService);
  readonly data: IncidenciaCrearDialogData = inject(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly ALCANCES = ALCANCES_INCIDENCIA;
  readonly habitaciones = signal<Habitacion[]>([]);

  alcance: AlcanceIncidencia = 'HABITACION';
  habitacionId: number | null = null;
  ubicacion = '';
  tipo: TipoIncidencia | null = null;
  descripcion = '';
  fechaProgramada: Date | null = null;
  horaProgramada = '09:00';
  guardando = false;

  private readonly hoy = signal(this.inicioDia(new Date()));

  readonly habitacionSeleccionada = computed(() => {
    if (this.data.habitacion) return this.data.habitacion;
    const id = this.habitacionId;
    return id != null ? this.habitaciones().find((h) => h.id === id) ?? null : null;
  });

  readonly tiposDisponibles = computed(() => {
    if (this.alcance === 'ZONA_COMUN') {
      return TIPOS_INCIDENCIA.filter((t) => t.value === 'MANTENIMIENTO' || t.value === 'OTRO');
    }
    const h = this.habitacionSeleccionada();
    if (!h) {
      return TIPOS_INCIDENCIA;
    }
    if (h.estado === 'OCUPADO') {
      return TIPOS_INCIDENCIA.filter((t) => t.value !== 'LIMPIEZA' && t.value !== 'MANTENIMIENTO');
    }
    if (h.estado === 'INHABILITADO') {
      return TIPOS_INCIDENCIA;
    }
    if (h.estado === 'LIBRE' || h.estado === 'RESERVADO') {
      return TIPOS_INCIDENCIA.filter((t) => t.value === 'MANTENIMIENTO' || t.value === 'OTRO');
    }
    return TIPOS_INCIDENCIA;
  });

  ngOnInit(): void {
    if (this.data.habitacion) {
      this.alcance = 'HABITACION';
      this.habitacionId = this.data.habitacion.id;
    } else {
      this.habitacionService.listar().subscribe({
        next: (list) => this.habitaciones.set(list),
        error: (err) => this.errorDialog.mostrarDesdeApi(err),
      });
    }

    const pre = this.data.tipoPreseleccionado;
    if (pre && this.tiposDisponibles().some((t) => t.value === pre)) {
      this.tipo = pre;
      if (pre === 'MANTENIMIENTO' && !this.fechaProgramada) {
        this.fechaProgramada = new Date();
      }
      return;
    }
    if (this.data.habitacion?.estado === 'OCUPADO') {
      this.tipo = 'SERVICIO_CUARTO';
    }
  }

  tituloDialogo(): string {
    if (this.data.habitacion) {
      return `Nueva incidencia — Habitación ${this.data.habitacion.numero}`;
    }
    return 'Nueva incidencia';
  }

  textoHint(): string {
    if (this.alcance === 'ZONA_COMUN') {
      return 'Reparaciones o servicios fuera de habitaciones: lobby, pasillos, piscina, etc.';
    }
    const h = this.habitacionSeleccionada();
    if (!h) return 'Seleccione la habitación y el tipo de servicio.';
    if (h.estado === 'OCUPADO') {
      return 'Huésped en la habitación: servicio al cuarto u otro.';
    }
    if (h.estado === 'INHABILITADO') {
      return 'Limpieza, mantenimiento, servicio al cuarto u otro. Puede haber varios servicios activos a la vez.';
    }
    if (h.estado === 'LIBRE' || h.estado === 'RESERVADO') {
      return 'Mantenimiento u otro. Tras el check-out la limpieza se crea automáticamente al inhabilitar la habitación.';
    }
    return 'Seleccione el tipo de servicio para la habitación.';
  }

  onAlcanceChange(): void {
    this.tipo = null;
    this.ubicacion = '';
    this.habitacionId = null;
  }

  mantenimientoEsHoy(): boolean {
    if (!this.fechaProgramada) return false;
    return this.inicioDia(this.fechaProgramada).getTime() === this.hoy().getTime();
  }

  puedeCrear(): boolean {
    if (!this.tipo) return false;
    if (this.alcance === 'HABITACION' && !this.habitacionId) return false;
    if (this.alcance === 'ZONA_COMUN' && !this.ubicacion.trim()) return false;
    if (
      this.tipo === 'MANTENIMIENTO' &&
      this.alcance === 'HABITACION' &&
      (!this.fechaProgramada || !this.horaProgramada)
    ) {
      return false;
    }
    return true;
  }

  crear(): void {
    if (!this.tipo) return;
    this.guardando = true;

    let fechaHoraProgramada: string | null = null;
    if (this.tipo === 'MANTENIMIENTO' && this.alcance === 'HABITACION' && this.fechaProgramada) {
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
        tipo: this.tipo,
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

  private inicioDia(fecha: Date): Date {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
