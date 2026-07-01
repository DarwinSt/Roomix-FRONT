import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import {
  calcularNoches,
  Habitacion,
  TIPOS_HABITACION,
  TipoHabitacion,
} from '../../../core/models/habitacion.model';
import { TIPOS_DOCUMENTO, TipoDocumento } from '../../../core/models/huesped.model';
import { formatearMoneda } from '../../../core/models/reserva.model';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { HuespedService } from '../../../core/services/huesped.service';
import { ReservaService } from '../../../core/services/reserva.service';
import { TarifaService } from '../../../core/services/tarifa.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
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
  private readonly reservaService = inject(ReservaService);
  private readonly tarifaService = inject(TarifaService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly guardando = signal(false);
  readonly verificandoDisponibilidad = signal(false);
  readonly habitacion = signal<Habitacion | null>(null);
  readonly tarifaNoche = signal<number | null>(null);
  readonly disponibleEnFechas = signal<boolean | null>(null);
  readonly errorDisponibilidad = signal<string | null>(null);
  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly etiqueta = etiquetaEstado;
  readonly meta = metaEstado;
  readonly formatearMoneda = formatearMoneda;

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
        if (h.precioNoche != null) {
          this.tarifaNoche.set(Number(h.precioNoche));
        } else {
          this.cargarTarifa(h.tipoHabitacion);
        }
        this.loading.set(false);
        this.verificarDisponibilidad();
      },
      error: (err) => {
        this.errorDialog.mostrarDesdeApi(err);
        void this.router.navigate(['/habitaciones']);
      },
    });

    this.form.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.verificarDisponibilidad());
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

  get totalEstimado(): number | null {
    const tarifa = this.tarifaNoche();
    const noches = this.noches;
    if (tarifa == null || noches == null || noches < 1) return null;
    return tarifa * noches;
  }

  get puedeConfirmar(): boolean {
    return (
      this.puedeReservar() &&
      this.form.valid &&
      (this.noches ?? 0) >= 1 &&
      this.disponibleEnFechas() === true &&
      this.tarifaNoche() != null &&
      !this.guardando() &&
      !this.verificandoDisponibilidad()
    );
  }

  get mensajeValidacion(): string | null {
    if (!this.puedeReservar() || this.guardando() || this.puedeConfirmar) return null;

    if (this.verificandoDisponibilidad()) {
      return 'Comprobando disponibilidad para las fechas seleccionadas…';
    }

    if (this.errorDisponibilidad()) {
      return this.errorDisponibilidad();
    }

    if (this.disponibleEnFechas() === false) {
      return (
        this.errorDisponibilidad() ??
        'La habitación no está disponible en esas fechas (reserva solapada, mantenimiento o limpieza pendiente).'
      );
    }

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
    if (this.tarifaNoche() == null) {
      return 'No se pudo cargar la tarifa para este tipo de habitación.';
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
    const fechaEntrada = formatearFechaIso(v.fechaEntrada!);
    const fechaSalida = formatearFechaIso(v.fechaSalida!);
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
          this.reservaService.crear({
            habitacionId: habitacion.id,
            huespedId: huesped.id,
            fechaEntrada,
            fechaSalida,
          }),
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

  private cargarTarifa(tipo: TipoHabitacion): void {
    this.tarifaService.listar().subscribe({
      next: (tarifas) => {
        const tarifa = tarifas.find((t) => t.tipoHabitacion === tipo);
        this.tarifaNoche.set(tarifa?.precioNoche ?? null);
      },
      error: () => this.tarifaNoche.set(null),
    });
  }

  private verificarDisponibilidad(): void {
    const habitacion = this.habitacion();
    const entrada = this.form.controls.fechaEntrada.value;
    const salida = this.form.controls.fechaSalida.value;
    if (!habitacion || !entrada || !salida || (this.noches ?? 0) < 1) {
      this.disponibleEnFechas.set(null);
      this.errorDisponibilidad.set(null);
      return;
    }

    this.verificandoDisponibilidad.set(true);
    this.errorDisponibilidad.set(null);
    const fechaEntrada = formatearFechaIso(entrada);
    const fechaSalida = formatearFechaIso(salida);

    this.reservaService
      .disponibilidadHabitacion(habitacion.id, fechaEntrada, fechaSalida, habitacion.tipoHabitacion)
      .subscribe({
      next: (resultado) => {
        this.disponibleEnFechas.set(resultado.disponible);
        this.tarifaNoche.set(Number(resultado.tarifaNoche));
        this.errorDisponibilidad.set(null);
        this.verificandoDisponibilidad.set(false);
      },
      error: (err) => {
        this.disponibleEnFechas.set(null);
        this.errorDisponibilidad.set(
          err?.error?.detail ?? 'No se pudo comprobar la disponibilidad. Intente de nuevo.',
        );
        this.verificandoDisponibilidad.set(false);
      },
    });
  }

  private sumaDias(fecha: Date, dias: number): Date {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d;
  }
}
