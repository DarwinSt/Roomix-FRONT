import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InventarioService } from '../../../core/services/inventario.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { ArticuloInventario, TipoMovimientoStock } from '../../../core/models/inventario.model';

@Component({
  selector: 'app-stock-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>

    <div mat-dialog-title class="dialog-header">
      <div class="header-icon">
        <mat-icon>inventory_2</mat-icon>
      </div>
      <div class="header-text">
        <h2>Movimiento de stock</h2>
        <p>{{ data.articulo.nombre }} · Stock actual: {{ data.articulo.cantidad }}</p>
      </div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form-grid">
        <mat-form-field appearance="outline" class="roomix-dialog-select">
          <mat-label>Tipo</mat-label>
          <mat-select panelClass="roomix-select-panel" formControlName="tipo" placeholder="Seleccionar">
            <mat-option value="ENTRADA">Entrada</mat-option>
            <mat-option value="SALIDA">Salida</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cantidad</mat-label>
          <input matInput type="number" formControlName="cantidad" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Motivo (opcional)</mat-label>
          <input matInput formControlName="motivo" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="form.invalid">Registrar</button>
    </mat-dialog-actions>
  `,
  styles: ``,
})
export class StockDialogComponent {
  readonly data = inject<{ articulo: ArticuloInventario }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<StockDialogComponent>);
  private readonly inventarioService = inject(InventarioService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    tipo: [null as TipoMovimientoStock | null, Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    motivo: [''],
  });

  guardar(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.inventarioService
      .ajustarStock(this.data.articulo.id, {
        tipo: v.tipo!,
        cantidad: v.cantidad!,
        motivo: v.motivo || undefined,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Stock actualizado', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => this.errorDialog.mostrarDesdeApi(err),
      });
  }
}
