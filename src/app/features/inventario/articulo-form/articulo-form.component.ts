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
import { InventarioService } from '../../../core/services/inventario.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { UNIDADES_MEDIDA, CategoriaInventario, UnidadMedida } from '../../../core/models/inventario.model';

@Component({
  selector: 'app-articulo-form',
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
  ],
  templateUrl: './articulo-form.component.html',
  styleUrl: './articulo-form.component.scss',
})
export class ArticuloFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inventarioService = inject(InventarioService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly unidades = UNIDADES_MEDIDA;
  readonly categorias = signal<CategoriaInventario[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  id: number | null = null;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    categoriaId: [null as number | null, Validators.required],
    cantidad: [0, [Validators.required, Validators.min(0)]],
    cantidadMinima: [null as number | null],
    unidadMedida: ['UNIDAD' as UnidadMedida, Validators.required],
    ubicacion: [''],
  });

  ngOnInit(): void {
    this.inventarioService.listarCategorias().subscribe({
      next: (c) => this.categorias.set(c),
    });
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      this.id = Number(idParam);
      this.cargar(this.id);
    }
  }

  private cargar(id: number): void {
    this.loading.set(true);
    this.inventarioService.obtenerArticulo(id).subscribe({
      next: (a) => {
        this.form.patchValue({
          nombre: a.nombre,
          descripcion: a.descripcion,
          categoriaId: a.categoria.id,
          cantidad: a.cantidad,
          cantidadMinima: a.cantidadMinima,
          unidadMedida: a.unidadMedida,
          ubicacion: a.ubicacion ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
        void this.router.navigate(['/inventario']);
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
      nombre: v.nombre!,
      descripcion: v.descripcion!,
      categoriaId: v.categoriaId!,
      cantidad: v.cantidad!,
      cantidadMinima: v.cantidadMinima,
      unidadMedida: v.unidadMedida!,
      ubicacion: v.ubicacion || null,
    };
    this.saving.set(true);
    const req$ = this.id
      ? this.inventarioService.actualizarArticulo(this.id, payload)
      : this.inventarioService.crearArticulo(payload);
    req$.subscribe({
      next: () => {
        this.snackBar.open(this.id ? 'Artículo actualizado' : 'Artículo creado', 'OK', { duration: 3000 });
        void this.router.navigate(['/inventario']);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }
}
