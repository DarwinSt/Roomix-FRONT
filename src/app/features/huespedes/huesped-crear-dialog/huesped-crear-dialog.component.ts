import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HuespedService } from '../../../core/services/huesped.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { Huesped, TIPOS_DOCUMENTO, TipoDocumento } from '../../../core/models/huesped.model';

@Component({
  selector: 'app-huesped-crear-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './huesped-crear-dialog.component.html',
})
export class HuespedCrearDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<HuespedCrearDialogComponent, Huesped | null>);
  private readonly fb = inject(FormBuilder);
  private readonly huespedService = inject(HuespedService);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly guardando = signal(false);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    tipoDocumento: ['DNI' as TipoDocumento, Validators.required],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(40)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
  });

  guardar(): void {
    if (this.form.invalid) {
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
      .subscribe({
        next: (h) => this.dialogRef.close(h),
        error: (err) => {
          this.guardando.set(false);
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }
}
