import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { InventarioService } from '../../core/services/inventario.service';
import { AuthService } from '../../core/services/auth.service';
import { ArticuloInventario, UNIDADES_MEDIDA } from '../../core/models/inventario.model';
import { Incidencia } from '../../core/models/incidencia.model';

export interface MaterialGastado {
  articuloId: number;
  cantidad: number;
}

interface Fila {
  articuloId: number | null;
  cantidad: number | null;
}

/**
 * Confirmación de cierre de una limpieza o un mantenimiento con los materiales gastados, que se descuentan del
 * inventario. Si el usuario no ve el inventario (o el hotel no lo tiene), solo se confirma el cierre.
 */
@Component({
  selector: 'app-finalizar-incidencia-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>task_alt</mat-icon></div>
      <div class="header-text"><h2>Finalizar servicio</h2><p>{{ data.titulo }}.{{ data.habitacionId ? ' La habitación volverá a su estado operativo.' : '' }}</p></div>
    </div>
    <mat-dialog-content>
      @if (puedeInventario) {
        <p class="section-label">Materiales gastados (opcional)</p>
        <p class="rx-muted ayuda">Se descuentan del inventario y quedan registrados en este servicio.</p>
        @for (f of filas(); track $index) {
          <div class="fila">
            <mat-form-field appearance="outline" class="articulo">
              <mat-label>Material</mat-label>
              <mat-select [(ngModel)]="f.articuloId" (ngModelChange)="refrescar()" panelClass="roomix-select-panel">
                @for (a of articulos(); track a.id) {
                  <mat-option [value]="a.id" [disabled]="a.cantidad <= 0">{{ a.nombre }} · {{ a.cantidad }} {{ unidad(a) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="cantidad">
              <mat-label>Cantidad</mat-label>
              <input matInput type="number" min="1" [(ngModel)]="f.cantidad" (ngModelChange)="refrescar()" />
            </mat-form-field>
            <button mat-icon-button type="button" (click)="quitar($index)" aria-label="Quitar material"><mat-icon>delete</mat-icon></button>
          </div>
        }
        <button mat-stroked-button type="button" (click)="agregar()" [disabled]="articulos().length === 0">
          <mat-icon>add</mat-icon>Agregar material
        </button>
        @if (cargado() && articulos().length === 0) { <p class="rx-muted ayuda">No hay artículos activos en el inventario.</p> }
      } @else {
        <p>¿Confirmar que el servicio fue completado?</p>
      }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="confirmar()"><mat-icon>task_alt</mat-icon>Finalizar servicio</button>
    </mat-dialog-actions>
  `,
  styles: `
    .ayuda { margin: 0 0 0.75rem; font-size: 0.85rem; }
    .fila { display: grid; grid-template-columns: 1fr 110px auto; gap: 0.5rem; align-items: start; }
    .error { color: #c62828; font-size: 0.85rem; margin: 0.5rem 0 0; }
    @media (max-width: 480px) { .fila { grid-template-columns: 1fr 90px auto; } }
  `,
})
export class FinalizarIncidenciaDialogComponent {
  readonly data = inject<Incidencia>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<FinalizarIncidenciaDialogComponent, MaterialGastado[] | null>);
  private readonly inventario = inject(InventarioService);
  readonly puedeInventario = inject(AuthService).puede('INVENTARIO_VER');

  readonly articulos = signal<ArticuloInventario[]>([]);
  readonly cargado = signal(false);
  readonly filas = signal<Fila[]>([]);
  readonly error = signal<string | null>(null);
  private readonly porId = computed(() => new Map(this.articulos().map((a) => [a.id, a])));

  constructor() {
    if (this.puedeInventario) {
      this.inventario.listarArticulos(undefined, true).subscribe({
        next: (lista) => {
          this.articulos.set([...lista].sort((a, b) => a.nombre.localeCompare(b.nombre)));
          this.cargado.set(true);
        },
        error: () => this.cargado.set(true),
      });
    }
  }

  unidad(a: ArticuloInventario): string {
    return (UNIDADES_MEDIDA.find((u) => u.value === a.unidadMedida)?.label ?? a.unidadMedida).toLowerCase();
  }

  agregar(): void {
    this.filas.update((f) => [...f, { articuloId: null, cantidad: 1 }]);
  }

  quitar(i: number): void {
    this.filas.update((f) => f.filter((_, j) => j !== i));
    this.refrescar();
  }

  refrescar(): void {
    this.error.set(null);
  }

  confirmar(): void {
    const filas = this.filas().filter((f) => f.articuloId != null || f.cantidad);
    if (filas.some((f) => f.articuloId == null || !f.cantidad || f.cantidad < 1)) {
      this.error.set('Cada material debe tener artículo y una cantidad mayor que cero.');
      return;
    }
    // Se suman las cantidades del mismo artículo para validar el stock disponible
    const totales = new Map<number, number>();
    for (const f of filas) totales.set(f.articuloId!, (totales.get(f.articuloId!) ?? 0) + Number(f.cantidad));
    for (const [id, cantidad] of totales) {
      const a = this.porId().get(id);
      if (a && cantidad > a.cantidad) {
        this.error.set(`No hay suficiente ${a.nombre}: disponible ${a.cantidad} ${this.unidad(a)}.`);
        return;
      }
    }
    this.ref.close([...totales].map(([articuloId, cantidad]) => ({ articuloId, cantidad })));
  }
}
