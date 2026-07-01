import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { Habitacion } from '../../../core/models/habitacion.model';
import {
  TransicionOpcion,
  etiquetaEstado,
  etiquetaMotivoInhabilitacion,
  metaEstado,
  transicionesDisponibles,
  payloadActualizarEstado,
} from '../../../core/utils/habitacion-estado.util';
import { parsearFechaApi } from '../../../core/utils/date.util';

@Component({
  selector: 'app-habitacion-estado-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Cambiar estado — Hab. {{ data.numero }}</h2>
    <mat-dialog-content>
      <div class="estado-actual">
        <span class="label">Estado actual</span>
        <div class="estado-badge" [class]="meta(data.estado).cssClass">
          <mat-icon>{{ meta(data.estado).icon }}</mat-icon>
          <span>{{ etiqueta(data.estado) }}</span>
        </div>
        @if (data.motivoInhabilitacion) {
          <p class="info">
            <mat-icon>info</mat-icon>
            {{ etiquetaMotivo(data.motivoInhabilitacion) }}
          </p>
        }
      </div>

      @if (opcionesPermitidas().length === 0) {
        <p class="sin-opciones">No hay acciones disponibles.</p>
      } @else {
        <form [formGroup]="form">
          <p class="subtitulo">Seleccione la acción</p>
          <div class="estado-grid">
            @for (op of opcionesPermitidas(); track op.estadoDestino + (op.motivoInhabilitacion ?? '')) {
              <button
                type="button"
                class="estado-opcion"
                [class]="op.cssClass"
                [class.seleccionado]="esSeleccionada(op)"
                (click)="seleccionarTransicion(op)"
              >
                <mat-icon>{{ op.icon }}</mat-icon>
                <span class="titulo">{{ op.label }}</span>
                <span class="hint">{{ op.hint }}</span>
              </button>
            }
          </div>

          @if (mostrarFechasReserva()) {
            <mat-form-field appearance="outline" class="fecha-field">
              <mat-label>Fecha de entrada</mat-label>
              <input matInput [matDatepicker]="pickerEntrada" formControlName="fechaEntrada" />
              <mat-datepicker-toggle matIconSuffix [for]="pickerEntrada" />
              <mat-datepicker #pickerEntrada />
            </mat-form-field>
            <mat-form-field appearance="outline" class="fecha-field">
              <mat-label>Fecha de salida</mat-label>
              <input matInput [matDatepicker]="pickerSalida" formControlName="fechaSalida" />
              <mat-datepicker-toggle matIconSuffix [for]="pickerSalida" />
              <mat-datepicker #pickerSalida />
            </mat-form-field>
          }
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="saving()">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        (click)="confirmar()"
        [disabled]="saving() || !transicionSeleccionada() || opcionesPermitidas().length === 0"
      >
        @if (saving()) {
          <mat-spinner diameter="18" />
        } @else {
          Confirmar
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    @use '../habitacion-estados.shared.scss';

    mat-dialog-content {
      min-width: min(92vw, 520px);
      padding-top: 0.5rem !important;
    }

    .estado-actual {
      margin-bottom: 1rem;
    }

    .label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-200);
      margin-bottom: 0.35rem;
    }

    .info {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      margin: 0.5rem 0 0;
      font-size: 0.85rem;
      color: #1565c0;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    .subtitulo {
      margin: 0 0 0.75rem;
      font-weight: 600;
      color: var(--text-100);
    }

    .estado-grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }

    .fecha-field {
      width: 100%;
      margin-top: 0.75rem;
    }

    .sin-opciones {
      color: var(--text-200);
      margin: 0;
    }

    mat-dialog-actions button mat-spinner {
      display: inline-block;
    }
  `,
})
export class HabitacionEstadoDialogComponent {
  readonly data = inject<Habitacion>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<HabitacionEstadoDialogComponent, boolean>);
  private readonly fb = inject(FormBuilder);
  private readonly habitacionService = inject(HabitacionService);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly saving = signal(false);
  readonly transicionSeleccionada = signal<TransicionOpcion | null>(null);

  readonly opcionesPermitidas = computed(() => transicionesDisponibles(this.data));

  readonly mostrarFechasReserva = computed(
    () => this.transicionSeleccionada()?.estadoDestino === 'RESERVADO',
  );

  readonly form = this.fb.group({
    fechaEntrada: [
      this.data.fechaEntrada ? parsearFechaApi(this.data.fechaEntrada) : null,
    ] as [Date | null],
    fechaSalida: [
      this.data.fechaSalida ? parsearFechaApi(this.data.fechaSalida) : null,
    ] as [Date | null],
  });

  seleccionarTransicion(op: TransicionOpcion): void {
    this.transicionSeleccionada.set(op);
    if (op.estadoDestino !== 'RESERVADO') {
      this.form.patchValue({ fechaEntrada: null, fechaSalida: null });
    } else if (!this.form.value.fechaEntrada) {
      const hoy = new Date();
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      this.form.patchValue({ fechaEntrada: hoy, fechaSalida: manana });
    }
  }

  esSeleccionada(op: TransicionOpcion): boolean {
    const sel = this.transicionSeleccionada();
    return (
      sel?.estadoDestino === op.estadoDestino &&
      sel?.motivoInhabilitacion === op.motivoInhabilitacion
    );
  }

  etiqueta = etiquetaEstado;
  meta = metaEstado;
  etiquetaMotivo = etiquetaMotivoInhabilitacion;

  confirmar(): void {
    const op = this.transicionSeleccionada();
    if (!op) {
      this.errorDialog.mostrar('Seleccione una acción', 'Validación');
      return;
    }

    if (op.estadoDestino === 'RESERVADO' && (!this.form.value.fechaEntrada || !this.form.value.fechaSalida)) {
      this.errorDialog.mostrar('Seleccione fechas de entrada y salida', 'Validación');
      return;
    }

    this.saving.set(true);
    this.habitacionService
      .actualizarEstado(
        this.data.id,
        payloadActualizarEstado(
          this.data,
          op,
          this.form.value.fechaEntrada ?? null,
          this.form.value.fechaSalida ?? null,
        ),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          this.saving.set(false);
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }
}
