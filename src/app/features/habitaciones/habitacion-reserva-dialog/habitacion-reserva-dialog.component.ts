import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { calcularNoches, Habitacion } from '../../../core/models/habitacion.model';
import { Huesped, documentoCompleto } from '../../../core/models/huesped.model';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { HuespedService } from '../../../core/services/huesped.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { payloadReservar } from '../../../core/utils/habitacion-acciones.util';
import { formatearFechaIso } from '../../../core/utils/date.util';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { HuespedCrearDialogComponent } from '../../huespedes/huesped-crear-dialog/huesped-crear-dialog.component';

@Component({
  selector: 'app-habitacion-reserva-dialog',
  host: { class: 'roomix-dialog-shell' },
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
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon">
        <mat-icon>event_available</mat-icon>
      </div>
      <div class="header-text">
        <h2>Reservar — Habitación {{ data.numero }}</h2>
        <p>Seleccione huésped y fechas de la estadía.</p>
      </div>
    </div>

    <mat-dialog-content>
      <div class="info-banner">
        <mat-icon>info</mat-icon>
        <span>Si el huésped llega tarde, las noches reservadas no cambian.</span>
      </div>

      <div class="form-block">
        <p class="section-label">Huésped</p>
        <div class="huesped-row">
          <mat-form-field appearance="outline" class="full roomix-dialog-select">
            <mat-label>Huésped registrado</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <mat-select panelClass="roomix-select-panel" [(value)]="huespedId">
              @for (h of huespedesDisponibles(); track h.id) {
                <mat-option [value]="h.id">
                  <span class="roomix-option">
                    <mat-icon>badge</mat-icon>
                    <span class="roomix-option-body">
                      <span class="roomix-option-label">{{ h.nombreCompleto }}</span>
                      <span class="roomix-option-hint">{{ documentoCompleto(h) }}</span>
                    </span>
                  </span>
                </mat-option>
              }
            </mat-select>
            @if (huespedes().length === 0) {
              <mat-hint>No hay huéspedes registrados</mat-hint>
            }
          </mat-form-field>
          <button mat-stroked-button type="button" class="btn-nuevo" (click)="registrarHuesped()">
            <mat-icon>person_add</mat-icon>
            Nuevo
          </button>
        </div>

        <p class="section-label">Fechas</p>
        <div class="dialog-form-grid fechas-grid">
          <mat-form-field appearance="outline">
            <mat-label>Fecha de entrada</mat-label>
            <input matInput [matDatepicker]="pickerEntrada" [(ngModel)]="fechaEntrada" />
            <mat-datepicker-toggle matIconSuffix [for]="pickerEntrada" />
            <mat-datepicker #pickerEntrada />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fecha de salida</mat-label>
            <input matInput [matDatepicker]="pickerSalida" [(ngModel)]="fechaSalida" [min]="fechaEntrada" />
            <mat-datepicker-toggle matIconSuffix [for]="pickerSalida" />
            <mat-datepicker #pickerSalida />
          </mat-form-field>
        </div>
      </div>
    </mat-dialog-content>

    <div class="dialog-footer">
      @if (puedeConfirmar && noches !== null) {
        <div class="dialog-summary-bar">
          <mat-icon>nights_stay</mat-icon>
          <span>
            Al confirmar:
            <strong>{{ noches }} noche(s)</strong>
            · quedará en estado
            <span class="estado-chip estado-reservado">Reservado</span>
          </span>
        </div>
      } @else if (mensajeValidacion) {
        <div class="dialog-summary-bar validation">
          <mat-icon>info</mat-icon>
          <span>{{ mensajeValidacion }}</span>
        </div>
      }

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="!puedeConfirmar"
          (click)="confirmar()"
        >
          @if (guardando) {
            <mat-spinner diameter="18" />
          } @else {
            Confirmar reserva
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .huesped-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 0.25rem;
      min-width: 0;

      .full { flex: 1; min-width: 0; }
      .btn-nuevo { flex-shrink: 0; }
    }

    .fechas-grid {
      gap: 0.5rem 1.15rem;
    }
  `,
})
export class HabitacionReservaDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<HabitacionReservaDialogComponent, boolean>);
  private readonly dialog = inject(MatDialog);
  private readonly habitacionService = inject(HabitacionService);
  private readonly huespedService = inject(HuespedService);
  private readonly errorDialog = inject(ErrorDialogService);
  readonly data = inject<Habitacion>(MAT_DIALOG_DATA);

  readonly huespedes = signal<Huesped[]>([]);
  readonly documentoCompleto = documentoCompleto;

  huespedId: number | null = null;
  fechaEntrada: Date | null = new Date();
  fechaSalida: Date | null = this.sumaDias(new Date(), 1);
  guardando = false;

  readonly huespedesDisponibles = () =>
    this.huespedes().filter((h) => !h.habitacionActualNumero);

  ngOnInit(): void {
    this.cargarHuespedes();
  }

  get noches(): number | null {
    if (!this.fechaEntrada || !this.fechaSalida) return null;
    return calcularNoches(formatearFechaIso(this.fechaEntrada), formatearFechaIso(this.fechaSalida));
  }

  get puedeConfirmar(): boolean {
    return (
      !!this.huespedId &&
      !!this.fechaEntrada &&
      !!this.fechaSalida &&
      (this.noches ?? 0) >= 1 &&
      !this.guardando
    );
  }

  get mensajeValidacion(): string | null {
    if (this.guardando || this.puedeConfirmar) return null;
    if (!this.huespedId) {
      if (this.huespedesDisponibles().length === 0) {
        return 'No hay huéspedes disponibles. Pulse «Nuevo» para registrar uno.';
      }
      return 'Seleccione el huésped que ocupará la habitación.';
    }
    if (!this.fechaEntrada || !this.fechaSalida) {
      return 'Indique la fecha de entrada y la de salida.';
    }
    if ((this.noches ?? 0) < 1) {
      return 'La fecha de salida debe ser posterior a la de entrada (mínimo 1 noche).';
    }
    return null;
  }

  registrarHuesped(): void {
    const ref = this.dialog.open(HuespedCrearDialogComponent, roomixDialogConfig({ width: '520px' }));
    ref.afterClosed().subscribe((h) => {
      if (!h) return;
      this.cargarHuespedes(() => {
        this.huespedId = h.id;
      });
    });
  }

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    this.guardando = true;
    this.habitacionService
      .actualizarEstado(this.data.id, payloadReservar(this.fechaEntrada!, this.fechaSalida!, this.huespedId!))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          this.guardando = false;
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }

  private cargarHuespedes(after?: () => void): void {
    this.huespedService.listar({ activo: true }).subscribe({
      next: (list) => {
        this.huespedes.set(list);
        after?.();
      },
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
  }

  private sumaDias(fecha: Date, dias: number): Date {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d;
  }
}
