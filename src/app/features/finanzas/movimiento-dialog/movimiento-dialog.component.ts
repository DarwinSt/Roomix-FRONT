import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { CategoriaFinanciera, METODOS_PAGO, MetodoPago, TipoMovimiento } from '../../../core/models/finanzas.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { hoyIso } from '../../../core/utils/formato.util';

/** Registro manual de un ingreso o egreso (nómina, servicios públicos, proveedores...). */
@Component({
  selector: 'app-movimiento-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>{{ tipo() === 'INGRESO' ? 'trending_up' : 'trending_down' }}</mat-icon></div>
      <div class="header-text"><h2>Registrar {{ tipo() === 'INGRESO' ? 'ingreso' : 'egreso' }}</h2></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-button-toggle-group formControlName="tipo" class="rx-full tipo">
          <mat-button-toggle value="EGRESO"><mat-icon>trending_down</mat-icon> Egreso</mat-button-toggle>
          <mat-button-toggle value="INGRESO"><mat-icon>trending_up</mat-icon> Ingreso</mat-button-toggle>
        </mat-button-toggle-group>
        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="categoria" panelClass="roomix-select-panel">
            @for (c of categoriasTipo(); track c.codigo) { <mat-option [value]="c.codigo">{{ c.nombre }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Valor (COP)</mat-label>
          <input matInput type="number" min="1" formControlName="valor" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Concepto</mat-label>
          <input matInput formControlName="concepto" maxlength="200" placeholder="Ej. Energía eléctrica de octubre" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput type="date" formControlName="fecha" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Método de pago</mat-label>
          <mat-select formControlName="metodoPago" panelClass="roomix-select-panel">
            <mat-option [value]="null">—</mat-option>
            @for (m of metodos; track m.value) { <mat-option [value]="m.value">{{ m.label }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Proveedor / tercero</mat-label>
          <input matInput formControlName="tercero" maxlength="150" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Referencia / soporte</mat-label>
          <input matInput formControlName="referencia" maxlength="60" placeholder="N.º de factura del proveedor" />
        </mat-form-field>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Registrar</button>
    </mat-dialog-actions>
  `,
  styles: `.tipo { margin-bottom: 1rem; } .error { color: #c62828; font-size: 0.85rem; margin: 0; }`,
})
export class MovimientoDialogComponent {
  private readonly finanzas = inject(FinanzasService);
  private readonly ref = inject(MatDialogRef<MovimientoDialogComponent, boolean>);
  private readonly fb = inject(FormBuilder);
  private readonly tipoInicial = inject<TipoMovimiento | null>(MAT_DIALOG_DATA) ?? 'EGRESO';

  readonly metodos = METODOS_PAGO;
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly categorias = toSignal(this.finanzas.categorias(), { initialValue: [] });

  readonly form = this.fb.group({
    tipo: [this.tipoInicial as TipoMovimiento, Validators.required],
    categoria: [null as CategoriaFinanciera | null, Validators.required],
    valor: [null as number | null, [Validators.required, Validators.min(1)]],
    concepto: ['', Validators.required],
    fecha: [hoyIso(), Validators.required],
    metodoPago: [null as MetodoPago | null],
    tercero: [''],
    referencia: [''],
  });

  readonly tipo = toSignal(this.form.controls.tipo.valueChanges, { initialValue: this.tipoInicial });
  readonly categoriasTipo = computed(() => this.categorias().filter((c) => c.tipo === this.tipo()));

  constructor() {
    this.form.controls.tipo.valueChanges.subscribe(() => this.form.controls.categoria.setValue(null));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete tipo, categoría, valor, concepto y fecha.');
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.finanzas
      .registrar({
        tipo: v.tipo!,
        categoria: v.categoria!,
        valor: Number(v.valor),
        concepto: v.concepto!.trim(),
        fecha: v.fecha,
        metodoPago: v.metodoPago,
        tercero: v.tercero || null,
        referencia: v.referencia || null,
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: (e) => {
          this.guardando.set(false);
          this.error.set(extractApiErrorMessage(e));
        },
      });
  }
}
