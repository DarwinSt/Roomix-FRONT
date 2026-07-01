import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventarioService } from '../../../core/services/inventario.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { CategoriaInventario } from '../../../core/models/inventario.model';
import { FechaRoomixPipe } from '../../../shared/pipes/fecha-roomix.pipe';

@Component({
  selector: 'app-categorias-list',
  imports: [
    RouterLink,
    FechaRoomixPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './categorias-list.component.html',
  styleUrl: './categorias-list.component.scss',
})
export class CategoriasListComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly columns = ['nombre', 'descripcion', 'ejemplos', 'tipo', 'creado', 'acciones'];
  readonly loading = signal(true);
  readonly categorias = signal<CategoriaInventario[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.inventarioService.listarCategorias(false).subscribe({
      next: (data) => {
        this.categorias.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }

  eliminar(c: CategoriaInventario): void {
    if (!confirm(`¿Eliminar categoría "${c.nombre}"?`)) return;
    this.inventarioService.eliminarCategoria(c.id).subscribe({
      next: () => {
        this.snackBar.open('Categoría eliminada', 'OK', { duration: 3000 });
        this.cargar();
      },
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
  }
}
