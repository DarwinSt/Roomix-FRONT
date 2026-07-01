import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventarioService } from '../../../core/services/inventario.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';

@Component({
  selector: 'app-categoria-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './categoria-form.component.html',
})
export class CategoriaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inventarioService = inject(InventarioService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  id: number | null = null;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    descripcion: ['', [Validators.required, Validators.maxLength(300)]],
    ejemplosArticulos: ['', [Validators.required, Validators.maxLength(500)]],
    activo: [true],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      this.id = Number(idParam);
      this.loading.set(true);
      this.inventarioService.obtenerCategoria(this.id).subscribe({
        next: (c) => {
          this.form.patchValue({
            nombre: c.nombre,
            descripcion: c.descripcion,
            ejemplosArticulos: c.ejemplosArticulos,
            activo: c.activo,
          });
          this.loading.set(false);
        },
        error: (err) => {
          this.errorDialog.mostrarDesdeApi(err);
          void this.router.navigate(['/inventario/categorias']);
        },
      });
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      nombre: v.nombre!,
      descripcion: v.descripcion!,
      ejemplosArticulos: v.ejemplosArticulos!,
      activo: v.activo ?? true,
    };
    this.saving.set(true);
    const req$ = this.id
      ? this.inventarioService.actualizarCategoria(this.id, payload)
      : this.inventarioService.crearCategoria(payload);
    req$.subscribe({
      next: () => {
        this.snackBar.open(this.id ? 'Categoría actualizada' : 'Categoría creada', 'OK', { duration: 3000 });
        void this.router.navigate(['/inventario/categorias']);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }
}
