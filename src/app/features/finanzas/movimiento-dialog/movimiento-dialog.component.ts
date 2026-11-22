import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { CategoriaFinanciera, METODOS_PAGO, MetodoPago, TipoMovimiento } from '../../../core/models/finanzas.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { hoyIso, moneda } from '../../../core/utils/formato.util';
import { ICONO_CATEGORIA } from '../../../core/models/caja.model';
import { SelectorOpcionesComponent } from '../../../shared/formularios/selector-opciones.component';

/** Registro manual de un ingreso o egreso (nómina, servicios públicos, proveedores...). */
import { MonedaDirective } from '../../../shared/directivas/moneda.directive';
@Component({
  selector: 'app-movimiento-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [MonedaDirective, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatCheckboxModule, MatFormFieldModule,
    MatIconModule, MatInputModule, SelectorOpcionesComponent],
  template: `
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon" [class.egreso]="tipo() === 'EGRESO'"><mat-icon>{{ tipo() === 'INGRESO' ? 'trending_up' : 'trending_down' }}</mat-icon></div>
      <div class="header-text"><h2>Registrar {{ tipo() === 'INGRESO' ? 'un ingreso' : 'un egreso' }}</h2>
        <p>{{ tipo() === 'INGRESO' ? 'Dinero que entra al hotel por fuera de reservas y facturas.' : 'Nómina, servicios públicos, proveedores y demás gastos.' }}</p></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-button-toggle-group formControlName="tipo" class="rx-segmento ancho-completo tipo" aria-label="Tipo de movimiento">
          <mat-button-toggle value="EGRESO"><mat-icon>trending_down</mat-icon>Sale dinero</mat-button-toggle>
          <mat-button-toggle value="INGRESO"><mat-icon>trending_up</mat-icon>Entra dinero</mat-button-toggle>
        </mat-button-toggle-group>
        <mat-form-field appearance="outline" class="rx-monto rx-campo-completo">
          <mat-label>Valor</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput rxMoneda formControlName="valor" placeholder="0" />
        </mat-form-field>
        <rx-selector-opciones formControlName="categoria" [opciones]="opcionesCategoria()" etiqueta="Categoría" />
        <mat-form-field appearance="outline" class="rx-campo-completo">
          <mat-label>Concepto</mat-label>
          <input matInput formControlName="concepto" maxlength="200"
                 [placeholder]="tipo() === 'INGRESO' ? 'Ej. Arriendo del salón a un tercero' : 'Ej. Energía eléctrica de octubre'" />
        </mat-form-field>
        @if (tipo() === 'EGRESO') {
          <mat-checkbox formControlName="pendiente" class="por-pagar">Queda por pagar (todavía no sale el dinero)</mat-checkbox>
          @if (esPendiente()) { <p class="por-pagar-ayuda">No cuenta en los totales hasta que registre su pago. La fecha es el vencimiento.</p> }
        }
        <mat-form-field appearance="outline" class="fecha">
          <mat-label>{{ esPendiente() ? 'Fecha de vencimiento' : 'Fecha' }}</mat-label>
          <input matInput type="date" formControlName="fecha" />
        </mat-form-field>
        @if (!esPendiente()) {
          <rx-selector-opciones formControlName="metodoPago" [opciones]="metodos" etiqueta="Medio de pago" />
        }
        @if (!detalles()) {
          <button type="button" class="rx-mas-detalles" (click)="detalles.set(true)">
            <mat-icon>add</mat-icon>Agregar {{ tipo() === 'INGRESO' ? 'cliente' : 'proveedor' }} y referencia
          </button>
        } @else {
          <div class="dialog-form-grid">
            <mat-form-field appearance="outline">
              <mat-label>{{ tipo() === 'INGRESO' ? 'Cliente / tercero' : 'Proveedor / tercero' }}</mat-label>
              <input matInput formControlName="tercero" maxlength="150" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Referencia / soporte</mat-label>
              <input matInput formControlName="referencia" maxlength="60" placeholder="N.º de factura del proveedor" />
            </mat-form-field>
          </div>
        }
      </form>
      @if (error()) { <p class="rx-error-dialogo"><mat-icon>error_outline</mat-icon>{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()"><mat-icon>check</mat-icon>Registrar {{ valor() ? moneda(valor()) : '' }}</button>
    </mat-dialog-actions>
  `,
  styles: ` .tipo { margin-bottom: 1rem; } .por-pagar { display: block; margin: 0 0 0.5rem; }
    .por-pagar-ayuda { margin: 0 0 0.75rem; font-size: 0.8rem; color: var(--text-200); } .fecha { width: 220px; max-width: 100%; }`,
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
    pendiente: [false],
  });
  readonly esPendiente = toSignal(this.form.controls.pendiente.valueChanges, { initialValue: false });

  readonly tipo = toSignal(this.form.controls.tipo.valueChanges, { initialValue: this.tipoInicial });
  readonly categoriasTipo = computed(() => this.categorias().filter((c) => c.tipo === this.tipo()));
  /** Las ventas de la tienda se registran en «Vender productos» (descuentan el inventario), no aquí. */
  readonly opcionesCategoria = computed(() => this.categoriasTipo().filter((c) => c.codigo !== 'VENTA_PRODUCTOS')
    .map((c) => ({ value: c.codigo, label: c.nombre, icon: ICONO_CATEGORIA[c.codigo] ?? 'label' })));
  readonly valor = toSignal(this.form.controls.valor.valueChanges, { initialValue: null as number | null });
  readonly detalles = signal(false);
  readonly moneda = moneda;

  constructor() {
    this.form.controls.tipo.valueChanges.subscribe((t) => {
      this.form.controls.categoria.setValue(null);
      if (t !== 'EGRESO') this.form.controls.pendiente.setValue(false);
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete el valor, la categoría, el concepto y la fecha.');
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
        pendiente: v.tipo === 'EGRESO' && !!v.pendiente,
        fechaVencimiento: v.tipo === 'EGRESO' && v.pendiente ? v.fecha : null,
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
