import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { calcularNoches, Habitacion } from '../../../core/models/habitacion.model';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { payloadReservar } from '../../../core/utils/habitacion-acciones.util';
import { formatearFechaIso } from '../../../core/utils/date.util';

@Component({
  selector: 'app-habitacion-reserva-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Reservar — Habitación {{ data.numero }}</h2>
    <mat-dialog-content>
      <p class="hint">
        La reserva define fechas planificadas. Si el huésped llega tarde, las noches reservadas no cambian.
        No se puede reservar si hay limpieza pendiente o mantenimiento programado en alguna noche del rango.
      </p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Fecha de entrada</mat-label>
        <input matInput [matDatepicker]="pickerEntrada" [(ngModel)]="fechaEntrada" />
        <mat-datepicker-toggle matIconSuffix [for]="pickerEntrada" />
        <mat-datepicker #pickerEntrada />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Fecha de salida</mat-label>
        <input matInput [matDatepicker]="pickerSalida" [(ngModel)]="fechaSalida" [min]="fechaEntrada" />
        <mat-datepicker-toggle matIconSuffix [for]="pickerSalida" />
        <mat-datepicker #pickerSalida />
      </mat-form-field>
      @if (noches !== null) {
        <p class="noches">
          <mat-icon>nights_stay</mat-icon>
          {{ noches }} noche(s) reservada(s) · Estado: <strong>Reservado</strong>
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="!fechaEntrada || !fechaSalida || noches === null || noches < 1 || guardando"
        (click)="confirmar()"
      >
        @if (guardando) {
          <mat-spinner diameter="18" />
        } @else {
          Confirmar reserva
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; }
    .hint { margin: 0 0 1rem; color: var(--text-200); font-size: 0.88rem; line-height: 1.45; }
    .noches {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.9rem;
      color: var(--accent-200);
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
  `,
})
export class HabitacionReservaDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<HabitacionReservaDialogComponent, boolean>);
  private readonly habitacionService = inject(HabitacionService);
  private readonly errorDialog = inject(ErrorDialogService);
  readonly data = inject<Habitacion>(MAT_DIALOG_DATA);

  fechaEntrada: Date | null = new Date();
  fechaSalida: Date | null = this.sumaDias(new Date(), 1);
  guardando = false;

  get noches(): number | null {
    if (!this.fechaEntrada || !this.fechaSalida) return null;
    return calcularNoches(formatearFechaIso(this.fechaEntrada), formatearFechaIso(this.fechaSalida));
  }

  confirmar(): void {
    if (!this.fechaEntrada || !this.fechaSalida || (this.noches ?? 0) < 1) return;
    this.guardando = true;
    this.habitacionService
      .actualizarEstado(this.data.id, payloadReservar(this.fechaEntrada, this.fechaSalida))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          this.guardando = false;
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }

  private sumaDias(fecha: Date, dias: number): Date {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d;
  }
}
