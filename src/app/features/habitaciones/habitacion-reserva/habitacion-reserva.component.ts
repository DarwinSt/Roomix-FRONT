import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs';
import {
  calcularNoches,
  Habitacion,
  TIPOS_HABITACION,
  TipoHabitacion,
} from '../../../core/models/habitacion.model';
import { TIPOS_DOCUMENTO, TipoDocumento } from '../../../core/models/huesped.model';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { HuespedService } from '../../../core/services/huesped.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { payloadReservar } from '../../../core/utils/habitacion-acciones.util';
import { formatearFechaIso } from '../../../core/utils/date.util';
import { etiquetaEstado, metaEstado } from '../../../core/utils/habitacion-estado.util';

@Component({
  selector: 'app-habitacion-reserva',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './habitacion-reserva.component.html',
  styleUrl: './habitacion-reserva.component.scss',
})
export class HabitacionReservaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly habitacionService = inject(HabitacionService);
  private readonly huespedService = inject(HuespedService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly loading = signal(true);
  readonly guardando = signal(false);
  readonly habitacion = signal<Habitacion | null>(null);
  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly etiqueta = etiquetaEstado;
  readonly meta = metaEstado;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    tipoDocumento: ['DNI' as TipoDocumento, Validators.required],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(40)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
    fechaEntrada: [new Date(), Validators.required],
    fechaSalida: [this.sumaDias(new Date(), 1), Validators.required],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      void this.router.navigate(['/habitaciones']);
      return;
    }

    this.habitacionService.obtener(id).subscribe({
      next: (h) => {
        this.habitacion.set(h);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorDialog.mostrarDesdeApi(err);
        void this.router.navigate(['/habitaciones']);
      },
    });
  }

  puedeReservar(): boolean {
    return this.habitacion()?.estado === 'LIBRE';
  }

  etiquetaTipo(tipo: TipoHabitacion): string {
    return TIPOS_HABITACION.find((t) => t.value === tipo)?.label ?? tipo;
  }

  get noches(): number | null {
    const entrada = this.form.controls.fechaEntrada.value;
    const salida = this.form.controls.fechaSalida.value;
    if (!entrada || !salida) return null;
    return calcularNoches(formatearFechaIso(entrada), formatearFechaIso(salida));
  }

  get puedeConfirmar(): boolean {
    return this.puedeReservar() && this.form.valid && (this.noches ?? 0) >= 1 && !this.guardando();
  }

  get mensajeValidacion(): string | null {
    if (!this.puedeReservar() || this.guardando() || this.puedeConfirmar) return null;

    const f = this.form.controls;
    if (f.nombre.invalid || f.apellidos.invalid || f.tipoDocumento.invalid || f.numeroDocumento.invalid) {
      return 'Complete nombre, apellidos y documento del huésped.';
    }
    if (f.email.invalid) return 'Indique un email válido del huésped.';
    if (f.telefono.invalid) return 'Indique el teléfono de contacto del huésped.';
    if (!f.fechaEntrada.value || !f.fechaSalida.value) {
      return 'Indique la fecha de entrada y la de salida.';
    }
    if ((this.noches ?? 0) < 1) {
      return 'La fecha de salida debe ser posterior a la de entrada (mínimo 1 noche).';
    }
    return null;
  }

  confirmar(): void {
    const habitacion = this.habitacion();
    if (!habitacion || !this.puedeConfirmar) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.guardando.set(true);

    this.huespedService
      .crear({
        nombre: v.nombre!.trim(),
        apellidos: v.apellidos!.trim(),
        tipoDocumento: v.tipoDocumento!,
        numeroDocumento: v.numeroDocumento!.trim(),
        email: v.email!.trim(),
        telefono: v.telefono!.trim(),
        activo: true,
      })
      .pipe(
        switchMap((huesped) =>
          this.habitacionService.actualizarEstado(
            habitacion.id,
            payloadReservar(v.fechaEntrada!, v.fechaSalida!, huesped.id),
          ),
        ),
      )
      .subscribe({
        next: () => {
          this.snackBar.open(`Habitación ${habitacion.numero} reservada`, 'OK', { duration: 3000 });
          void this.router.navigate(['/habitaciones']);
        },
        error: (err) => {
          this.guardando.set(false);
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
