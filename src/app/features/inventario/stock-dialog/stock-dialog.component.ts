import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InventarioService } from '../../../core/services/inventario.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { ArticuloInventario, MovimientoInventario, TipoMovimientoStock } from '../../../core/models/inventario.model';
import { fechaCorta, moneda } from '../../../core/utils/formato.util';

/** Registrar una entrada (compra), salida (consumo) o ajuste por conteo físico. */
@Component({
  selector: 'app-stock-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>inventory_2</mat-icon></div>
      <div class="header-text">
        <h2>Movimiento de stock</h2>
        <p>{{ data.articulo.nombre }} · Stock actual: {{ data.articulo.cantidad }}</p>
      </div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-button-toggle-group formControlName="tipo" class="rx-full tipos">
          <mat-button-toggle value="ENTRADA"><mat-icon>add_shopping_cart</mat-icon> Entrada</mat-button-toggle>
          <mat-button-toggle value="SALIDA"><mat-icon>output</mat-icon> Salida</mat-button-toggle>
          <mat-button-toggle value="AJUSTE"><mat-icon>fact_check</mat-icon> Ajuste</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field appearance="outline">
          <mat-label>{{ tipo() === 'AJUSTE' ? 'Conteo físico (stock real)' : 'Cantidad' }}</mat-label>
          <input matInput type="number" formControlName="cantidad" [min]="tipo() === 'AJUSTE' ? 0 : 1" />
          <mat-hint>Stock resultante: {{ resultante() }}</mat-hint>
        </mat-form-field>

        @if (tipo() === 'ENTRADA') {
          <mat-form-field appearance="outline">
            <mat-label>Costo unitario (COP)</mat-label>
            <input matInput type="number" min="0" formControlName="costoUnitario" />
            @if (totalCompra() > 0) { <mat-hint>Total {{ moneda(totalCompra()) }}</mat-hint> }
          </mat-form-field>
          <mat-form-field appearance="outline" class="rx-full">
            <mat-label>Proveedor</mat-label>
            <input matInput formControlName="proveedor" maxlength="150" />
          </mat-form-field>
          <mat-checkbox formControlName="registrarCompra" class="rx-full">Registrar la compra como egreso en Finanzas</mat-checkbox>
        }

        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>{{ tipo() === 'AJUSTE' ? 'Motivo del ajuste' : 'Motivo (opcional)' }}</mat-label>
          <input matInput formControlName="motivo" [placeholder]="tipo() === 'SALIDA' ? 'Ej. Reposición habitaciones piso 2' : ''" />
        </mat-form-field>
      </form>
      @if (tipo() === 'SALIDA' && resultante() < 0) { <p class="error">La salida supera el stock disponible.</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="form.invalid || resultante() < 0 || guardando()">Registrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .tipos { margin-bottom: 0.5rem; }
    .error { color: #c62828; font-size: 0.85rem; }
  `,
})
export class StockDialogComponent {
  readonly data = inject<{ articulo: ArticuloInventario }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<StockDialogComponent>);
  private readonly inventarioService = inject(InventarioService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly moneda = moneda;
  readonly guardando = signal(false);
  readonly form = inject(FormBuilder).group({
    tipo: ['ENTRADA' as TipoMovimientoStock, Validators.required],
    cantidad: [1, [Validators.required, Validators.min(0)]],
    costoUnitario: [this.data.articulo.precioUnitario as number | null],
    proveedor: [this.data.articulo.proveedor ?? ''],
    registrarCompra: [true],
    motivo: [''],
  });
  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly tipo = computed(() => this.valores().tipo);
  readonly resultante = computed(() => {
    const c = Number(this.valores().cantidad ?? 0);
    const actual = this.data.articulo.cantidad;
    return this.tipo() === 'ENTRADA' ? actual + c : this.tipo() === 'SALIDA' ? actual - c : c;
  });
  readonly totalCompra = computed(() => Number(this.valores().cantidad ?? 0) * Number(this.valores().costoUnitario ?? 0));

  guardar(): void {
    const v = this.form.getRawValue();
    if (v.tipo !== 'AJUSTE' && Number(v.cantidad) < 1) {
      this.snackBar.open('La cantidad debe ser al menos 1', 'OK', { duration: 3000 });
      return;
    }
    const entrada = v.tipo === 'ENTRADA';
    this.guardando.set(true);
    this.inventarioService
      .ajustarStock(this.data.articulo.id, {
        tipo: v.tipo!,
        cantidad: Number(v.cantidad),
        motivo: v.motivo || undefined,
        costoUnitario: entrada && v.costoUnitario ? Number(v.costoUnitario) : null,
        proveedor: entrada ? v.proveedor || null : null,
        registrarCompra: entrada && !!v.registrarCompra,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Stock actualizado', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }
}

/** Historial de movimientos (kardex) de un artículo. */
@Component({
  selector: 'app-movimientos-articulo-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>history</mat-icon></div>
      <div class="header-text"><h2>Movimientos</h2><p>{{ data.nombre }} · Stock actual: {{ data.cantidad }}</p></div>
    </div>
    <mat-dialog-content>
      @if (cargando()) {
        <div class="rx-cargando"><mat-spinner diameter="36" /></div>
      } @else if (movimientos().length === 0) {
        <p class="rx-muted">Sin movimientos registrados.</p>
      } @else {
        <div class="rx-tabla-wrap">
          <table class="rx-tabla">
            <thead><tr><th>Fecha</th><th>Tipo</th><th class="derecha">Cant.</th><th class="derecha">Stock</th><th>Detalle</th></tr></thead>
            <tbody>
              @for (m of movimientos(); track m.id) {
                <tr>
                  <td data-label="Fecha">{{ fecha(m.fechaHora, true) }}</td>
                  <td data-label="Tipo"><span class="rx-chip {{ m.tipo === 'ENTRADA' ? 'ok' : m.tipo === 'SALIDA' ? 'alerta' : 'neutro' }}">{{ m.tipo === 'ENTRADA' ? 'Entrada' : m.tipo === 'SALIDA' ? 'Salida' : 'Ajuste' }}</span></td>
                  <td data-label="Cant." class="derecha">{{ m.cantidad }}</td>
                  <td data-label="Stock" class="derecha">{{ m.stockAnterior }} → {{ m.stockResultante }}</td>
                  <td data-label="Detalle" class="ancho">{{ m.motivo ?? '' }}@if (m.proveedor) { · {{ m.proveedor }} }@if (m.costoUnitario) { · {{ moneda(m.costoUnitario) }} c/u } · {{ m.registradoPor }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions>
  `,
})
export class MovimientosArticuloDialogComponent implements OnInit {
  readonly data = inject<ArticuloInventario>(MAT_DIALOG_DATA);
  private readonly service = inject(InventarioService);
  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly cargando = signal(true);
  readonly movimientos = signal<MovimientoInventario[]>([]);

  ngOnInit(): void {
    this.service.movimientosArticulo(this.data.id).subscribe({
      next: (m) => {
        this.movimientos.set(m);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
