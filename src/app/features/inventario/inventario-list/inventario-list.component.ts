import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { InventarioService } from '../../../core/services/inventario.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import {
  ArticuloInventario,
  CategoriaInventario,
  UNIDADES_MEDIDA,
  UnidadMedida,
} from '../../../core/models/inventario.model';
import {
  NivelStock,
  etiquetaNivel,
  iconoCategoria,
  nivelStock,
  porcentajeStock,
} from '../../../core/utils/inventario-stock.util';
import { StockDialogComponent } from '../stock-dialog/stock-dialog.component';
import { FechaRoomixPipe } from '../../../shared/pipes/fecha-roomix.pipe';

type OrdenInventario = 'nombre' | 'stock-asc' | 'stock-desc' | 'categoria';

@Component({
  selector: 'app-inventario-list',
  imports: [
    FormsModule,
    FechaRoomixPipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
  ],
  templateUrl: './inventario-list.component.html',
  styleUrl: './inventario-list.component.scss',
})
export class InventarioListComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly loading = signal(true);
  readonly articulos = signal<ArticuloInventario[]>([]);
  readonly categorias = signal<CategoriaInventario[]>([]);
  readonly busqueda = signal('');

  filtroCategoriaId: number | null = null;
  soloStockBajo = false;
  orden: OrdenInventario = 'nombre';

  readonly articulosVisibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    let list = this.articulos();

    if (q) {
      list = list.filter(
        (a) =>
          a.nombre.toLowerCase().includes(q) ||
          a.descripcion.toLowerCase().includes(q) ||
          a.categoria.nombre.toLowerCase().includes(q) ||
          (a.ubicacion?.toLowerCase().includes(q) ?? false),
      );
    }

    return [...list].sort((a, b) => {
      switch (this.orden) {
        case 'stock-asc':
          return a.cantidad - b.cantidad;
        case 'stock-desc':
          return b.cantidad - a.cantidad;
        case 'categoria':
          return (
            a.categoria.nombre.localeCompare(b.categoria.nombre) ||
            a.nombre.localeCompare(b.nombre)
          );
        default:
          return a.nombre.localeCompare(b.nombre);
      }
    });
  });

  readonly resumen = computed(() => {
    const list = this.articulosVisibles();
    return {
      total: list.length,
      stockBajo: list.filter((a) => a.stockBajo).length,
      categorias: new Set(list.map((a) => a.categoria.id)).size,
    };
  });

  ngOnInit(): void {
    this.inventarioService.listarCategorias().subscribe({
      next: (c) => this.categorias.set(c),
    });
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.inventarioService
      .listarArticulos(
        this.filtroCategoriaId ?? undefined,
        undefined,
        this.soloStockBajo || undefined,
      )
      .subscribe({
        next: (data) => {
          this.articulos.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }

  filtrarCategoria(id: number | null): void {
    this.filtroCategoriaId = id;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroCategoriaId = null;
    this.soloStockBajo = false;
    this.busqueda.set('');
    this.orden = 'nombre';
    this.cargar();
  }

  abrirStock(articulo: ArticuloInventario): void {
    const ref = this.dialog.open(StockDialogComponent, {
      width: '400px',
      data: { articulo },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.cargar();
    });
  }

  eliminar(a: ArticuloInventario): void {
    if (!confirm(`¿Dar de baja "${a.nombre}"?`)) return;
    this.inventarioService.eliminarArticulo(a.id).subscribe({
      next: () => {
        this.snackBar.open('Artículo dado de baja', 'OK', { duration: 3000 });
        this.cargar();
      },
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
  }

  nivel(a: ArticuloInventario): NivelStock {
    return nivelStock(a);
  }

  porcentaje(a: ArticuloInventario): number {
    return porcentajeStock(a);
  }

  etiquetaNivel(nivel: NivelStock): string {
    return etiquetaNivel(nivel);
  }

  iconoCat(nombre: string): string {
    return iconoCategoria(nombre);
  }

  unidadLabel(unidad: UnidadMedida): string {
    return UNIDADES_MEDIDA.find((u) => u.value === unidad)?.label ?? unidad;
  }
}
