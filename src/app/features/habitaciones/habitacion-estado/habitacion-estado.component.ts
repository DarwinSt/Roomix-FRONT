import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import {
  EstadoHabitacion,
  etiquetaEstadoReserva,
  Habitacion,
  MotivoInhabilitacion,
} from '../../../core/models/habitacion.model';
import {
  TransicionOpcion,
  etiquetaEstado,
  etiquetaMotivoInhabilitacion,
  metaEstado,
  transicionesDisponibles,
  payloadActualizarEstado,
} from '../../../core/utils/habitacion-estado.util';
import { formatearFechaDisplay, parsearFechaApi } from '../../../core/utils/date.util';
import { FechaRoomixPipe } from '../../../shared/pipes/fecha-roomix.pipe';

@Component({
  selector: 'app-habitacion-estado',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    FechaRoomixPipe,
  ],
  templateUrl: './habitacion-estado.component.html',
  styleUrl: './habitacion-estado.component.scss',
})
export class HabitacionEstadoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly habitacionService = inject(HabitacionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly habitacion = signal<Habitacion | null>(null);
  readonly transicionSeleccionada = signal<TransicionOpcion | null>(null);

  readonly opcionesPermitidas = computed(() => {
    const h = this.habitacion();
    return h ? transicionesDisponibles(h) : [];
  });

  readonly mostrarFechasReserva = computed(
    () => this.transicionSeleccionada()?.estadoDestino === 'RESERVADO',
  );

  readonly form = this.fb.group({
    fechaEntrada: [null as Date | null],
    fechaSalida: [null as Date | null],
  });

  etiquetaReserva = etiquetaEstadoReserva;
  formatearFecha = formatearFechaDisplay;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.habitacionService.obtener(id).subscribe({
      next: (h) => {
        this.habitacion.set(h);
        if (h.fechaEntrada) {
          this.form.patchValue({
            fechaEntrada: parsearFechaApi(h.fechaEntrada),
            fechaSalida: parsearFechaApi(h.fechaSalida),
          });
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.errorDialog.mostrarDesdeApi(err);
        void this.router.navigate(['/habitaciones']);
      },
    });
  }

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

  etiqueta(estado: EstadoHabitacion): string {
    return etiquetaEstado(estado);
  }

  meta(estado: EstadoHabitacion) {
    return metaEstado(estado);
  }

  etiquetaMotivo(motivo: MotivoInhabilitacion): string {
    return etiquetaMotivoInhabilitacion(motivo);
  }

  confirmar(): void {
    const op = this.transicionSeleccionada();
    const h = this.habitacion();
    if (!op || !h) {
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
        h.id,
        payloadActualizarEstado(
          h,
          op,
          this.form.value.fechaEntrada ?? null,
          this.form.value.fechaSalida ?? null,
        ),
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Estado actualizado correctamente', 'OK', { duration: 3000 });
          void this.router.navigate(['/habitaciones']);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }
}
