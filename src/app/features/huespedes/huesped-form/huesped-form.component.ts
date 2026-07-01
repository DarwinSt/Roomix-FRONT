import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { HuespedService } from '../../../core/services/huesped.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { TIPOS_DOCUMENTO, TipoDocumento } from '../../../core/models/huesped.model';
import { formatearFechaIso } from '../../../core/utils/date.util';

@Component({
  selector: 'app-huesped-form',
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
    MatIconModule,
    MatDatepickerModule,
  ],
  templateUrl: './huesped-form.component.html',
  styleUrl: './huesped-form.component.scss',
})
export class HuespedFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly huespedService = inject(HuespedService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly loading = signal(false);
  readonly saving = signal(false);
  id: number | null = null;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    tipoDocumento: ['DNI' as TipoDocumento, Validators.required],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(40)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
    nacionalidad: ['', Validators.maxLength(80)],
    fechaNacimiento: [null as Date | null],
    notas: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.cargar(this.id);
    }
  }

  private cargar(id: number): void {
    this.loading.set(true);
    this.huespedService.obtener(id).subscribe({
      next: (h) => {
        this.form.patchValue({
          nombre: h.nombre,
          apellidos: h.apellidos,
          tipoDocumento: h.tipoDocumento,
          numeroDocumento: h.numeroDocumento,
          email: h.email,
          telefono: h.telefono,
          nacionalidad: h.nacionalidad ?? '',
          fechaNacimiento: h.fechaNacimiento ? new Date(h.fechaNacimiento + 'T12:00:00') : null,
          notas: h.notas ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
        void this.router.navigate(['/huespedes']);
      },
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      nombre: v.nombre!.trim(),
      apellidos: v.apellidos!.trim(),
      tipoDocumento: v.tipoDocumento!,
      numeroDocumento: v.numeroDocumento!.trim(),
      email: v.email!.trim(),
      telefono: v.telefono!.trim(),
      nacionalidad: v.nacionalidad?.trim() || null,
      fechaNacimiento: v.fechaNacimiento ? formatearFechaIso(v.fechaNacimiento) : null,
      notas: v.notas?.trim() || null,
      activo: true,
    };
    this.saving.set(true);
    const req$ = this.id
      ? this.huespedService.actualizar(this.id, payload)
      : this.huespedService.crear(payload);
    req$.subscribe({
      next: () => {
        this.snackBar.open(this.id ? 'Huésped actualizado' : 'Huésped registrado', 'OK', { duration: 3000 });
        void this.router.navigate(['/huespedes']);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }
}
