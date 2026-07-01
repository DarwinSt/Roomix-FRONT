import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import {
  EstadoHabitacion,
  Habitacion,
  TIPOS_HABITACION,
  TipoHabitacion,
} from '../../../core/models/habitacion.model';
import { formatearFechaIso, parsearFechaApi } from '../../../core/utils/date.util';
import {
  TransicionOpcion,
  opcionesEstadoAlta,
  opcionesEstadoEdicion,
} from '../../../core/utils/habitacion-estado.util';

@Component({
  selector: 'app-habitacion-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatIconModule,
  ],
  templateUrl: './habitacion-form.component.html',
  styleUrl: './habitacion-form.component.scss',
})
export class HabitacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly habitacionService = inject(HabitacionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly tipos = TIPOS_HABITACION;
  readonly loading = signal(false);
  readonly saving = signal(false);
  id: number | null = null;

  readonly habitacionCargada = signal<Habitacion | null>(null);

  readonly opcionesEstado = computed<TransicionOpcion[]>(() => {
    if (this.id && this.habitacionCargada()) {
      return opcionesEstadoEdicion(this.habitacionCargada()!);
    }
    return opcionesEstadoAlta();
  });

  readonly mostrarFechasReserva = computed(
    () => this.form.controls.estado.value === 'RESERVADO',
  );

  readonly form = this.fb.group({
    numero: ['', [Validators.required, Validators.maxLength(20)]],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    tipoHabitacion: ['DOBLE' as TipoHabitacion, Validators.required],
    estado: ['LIBRE' as EstadoHabitacion, Validators.required],
    caracteristicasTexto: [''],
    fechaEntrada: [null as Date | null],
    fechaSalida: [null as Date | null],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      this.id = Number(idParam);
      this.cargar(this.id);
    }

    this.form.controls.estado.valueChanges.subscribe((estado) => {
      if (estado !== 'RESERVADO') {
        this.form.patchValue({ fechaEntrada: null, fechaSalida: null });
      } else if (!this.form.value.fechaEntrada) {
        const hoy = new Date();
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        this.form.patchValue({ fechaEntrada: hoy, fechaSalida: manana });
      }
    });
  }

  private cargar(id: number): void {
    this.loading.set(true);
    this.habitacionService.obtener(id).subscribe({
      next: (h) => {
        this.habitacionCargada.set(h);
        this.form.patchValue({
          numero: h.numero,
          descripcion: h.descripcion,
          tipoHabitacion: h.tipoHabitacion,
          estado: h.estado,
          caracteristicasTexto: h.caracteristicas.join(', '),
          fechaEntrada: parsearFechaApi(h.fechaEntrada),
          fechaSalida: parsearFechaApi(h.fechaSalida),
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
        void this.router.navigate(['/habitaciones']);
      },
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    if (v.estado === 'RESERVADO' && (!v.fechaEntrada || !v.fechaSalida)) {
      this.errorDialog.mostrar('Seleccione fechas de entrada y salida', 'Validación');
      return;
    }

    const caracteristicas = (v.caracteristicasTexto ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      numero: v.numero!,
      descripcion: v.descripcion!,
      tipoHabitacion: v.tipoHabitacion!,
      estado: v.estado!,
      caracteristicas,
      fechaEntrada:
        v.estado === 'RESERVADO' && v.fechaEntrada ? formatearFechaIso(v.fechaEntrada) : null,
      fechaSalida:
        v.estado === 'RESERVADO' && v.fechaSalida ? formatearFechaIso(v.fechaSalida) : null,
    };

    this.saving.set(true);
    const req$ = this.id
      ? this.habitacionService.actualizar(this.id, payload)
      : this.habitacionService.crear(payload);

    req$.subscribe({
      next: () => {
        this.snackBar.open(this.id ? 'Habitación actualizada' : 'Habitación creada', 'OK', {
          duration: 3000,
        });
        void this.router.navigate(['/habitaciones']);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }
}
