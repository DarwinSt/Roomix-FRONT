import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CajaService } from '../../core/services/caja.service';
import { BILLETES, CATEGORIAS_CAJA, MONEDAS, TipoMovimientoCaja, TurnoCaja } from '../../core/models/caja.model';
import { CategoriaFinanciera, METODOS_PAGO, MetodoPago, TipoMovimiento } from '../../core/models/finanzas.model';
import { extractApiErrorMessage } from '../../core/utils/api-error.util';
import { moneda } from '../../core/utils/formato.util';

const BASE_IMPORTS = [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule];

// ------------------------------------------------------------------ Abrir turno
export interface AbrirTurnoData {
  baseSugerida: number | null;
  ultimoCajero: string | null;
}

@Component({
  selector: 'app-abrir-turno-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: BASE_IMPORTS,
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>lock_open</mat-icon></div>
      <div class="header-text"><h2>Abrir turno de caja</h2><p>Cuente el efectivo que recibe y regístrelo como base.</p></div>
    </div>
    <mat-dialog-content>
      @if (data.baseSugerida !== null) {
        <div class="info-banner"><mat-icon>info</mat-icon>
          <span>El turno anterior{{ data.ultimoCajero ? ' (' + data.ultimoCajero + ')' : '' }} dejó una base de <strong>{{ moneda(data.baseSugerida) }}</strong>.</span>
        </div>
      }
      <form [formGroup]="form" class="dialog-form-grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Base recibida (COP)</mat-label>
          <input matInput type="number" min="0" formControlName="base" />
          <mat-hint>Efectivo con el que empieza el turno (para dar vueltas)</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Observación {{ difiere() ? '(obligatoria)' : '(opcional)' }}</mat-label>
          <textarea matInput rows="2" formControlName="observacion" maxlength="300"></textarea>
          @if (difiere()) { <mat-hint class="aviso">La base no coincide con la que dejó el turno anterior: explique la diferencia.</mat-hint> }
        </mat-form-field>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()"><mat-icon>lock_open</mat-icon>Abrir turno</button>
    </mat-dialog-actions>
  `,
  styles: ` .error { color: #c62828; font-size: 0.85rem; margin: 0.5rem 0 0; } .aviso { color: #b26a00; } .info-banner { margin-bottom: 1rem; } `,
})
export class AbrirTurnoDialogComponent {
  readonly data = inject<AbrirTurnoData>(MAT_DIALOG_DATA);
  private readonly caja = inject(CajaService);
  private readonly ref = inject(MatDialogRef<AbrirTurnoDialogComponent, boolean>);
  private readonly fb = inject(FormBuilder);

  readonly moneda = moneda;
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.group({
    base: [this.data.baseSugerida as number | null, [Validators.required, Validators.min(0)]],
    observacion: [''],
  });
  private readonly base = toSignal(this.form.controls.base.valueChanges, { initialValue: this.data.baseSugerida });
  readonly difiere = computed(() => this.data.baseSugerida !== null && this.base() !== null && Number(this.base()) !== this.data.baseSugerida);

  guardar(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid) {
      this.error.set('Indique la base recibida (puede ser $0).');
      return;
    }
    if (this.difiere() && !v.observacion?.trim()) {
      this.error.set('Explique en la observación por qué la base es distinta.');
      return;
    }
    this.guardando.set(true);
    this.caja.abrir(Number(v.base), v.observacion?.trim() || null).subscribe({
      next: () => this.ref.close(true),
      error: (e) => {
        this.guardando.set(false);
        this.error.set(extractApiErrorMessage(e));
      },
    });
  }
}

// ------------------------------------------------------------------ Ingreso o egreso desde la caja
@Component({
  selector: 'app-movimiento-caja-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: BASE_IMPORTS,
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>{{ tipo() === 'INGRESO' ? 'trending_up' : 'trending_down' }}</mat-icon></div>
      <div class="header-text"><h2>Registrar {{ tipo() === 'INGRESO' ? 'ingreso' : 'egreso' }} en caja</h2>
        <p>Queda en su turno y en Finanzas. Los pagos de facturas y abonos se registran desde la factura o la reserva.</p></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form-grid">
        <mat-button-toggle-group formControlName="tipo" class="full tipo">
          <mat-button-toggle value="INGRESO"><mat-icon>trending_up</mat-icon> Ingreso</mat-button-toggle>
          <mat-button-toggle value="EGRESO"><mat-icon>trending_down</mat-icon> Egreso</mat-button-toggle>
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
        <mat-form-field appearance="outline" class="full">
          <mat-label>Concepto</mat-label>
          <input matInput formControlName="concepto" maxlength="200"
                 [placeholder]="tipo() === 'INGRESO' ? 'Ej. Venta de agua en recepción' : 'Ej. Compra de bombillos'" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Medio de pago</mat-label>
          <mat-select formControlName="metodoPago" panelClass="roomix-select-panel">
            @for (m of metodos; track m.value) { <mat-option [value]="m.value">{{ m.label }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ tipo() === 'INGRESO' ? 'Cliente (opcional)' : 'Proveedor (opcional)' }}</mat-label>
          <input matInput formControlName="tercero" maxlength="150" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Referencia o soporte (opcional)</mat-label>
          <input matInput formControlName="referencia" maxlength="60" placeholder="N.º de recibo o factura" />
        </mat-form-field>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Registrar</button>
    </mat-dialog-actions>
  `,
  styles: ` .tipo { margin-bottom: 1rem; } .error { color: #c62828; font-size: 0.85rem; margin: 0; } `,
})
export class MovimientoCajaDialogComponent {
  private readonly caja = inject(CajaService);
  private readonly ref = inject(MatDialogRef<MovimientoCajaDialogComponent, boolean>);
  private readonly fb = inject(FormBuilder);
  private readonly tipoInicial = inject<TipoMovimiento | null>(MAT_DIALOG_DATA) ?? 'INGRESO';

  readonly metodos = METODOS_PAGO;
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.group({
    tipo: [this.tipoInicial as TipoMovimiento, Validators.required],
    categoria: [null as CategoriaFinanciera | null, Validators.required],
    valor: [null as number | null, [Validators.required, Validators.min(1)]],
    concepto: ['', Validators.required],
    metodoPago: ['EFECTIVO' as MetodoPago, Validators.required],
    tercero: [''],
    referencia: [''],
  });
  readonly tipo = toSignal(this.form.controls.tipo.valueChanges, { initialValue: this.tipoInicial });
  readonly categoriasTipo = computed(() => CATEGORIAS_CAJA.filter((c) => c.tipo === this.tipo()));

  constructor() {
    this.form.controls.tipo.valueChanges.subscribe(() => this.form.controls.categoria.setValue(null));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete categoría, valor, concepto y medio de pago.');
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.caja
      .registrarMovimiento({
        tipo: v.tipo!,
        categoria: v.categoria!,
        valor: Number(v.valor),
        concepto: v.concepto!.trim(),
        metodoPago: v.metodoPago!,
        tercero: v.tercero?.trim() || null,
        referencia: v.referencia?.trim() || null,
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

// ------------------------------------------------------------------ Retiro o aporte de efectivo
@Component({
  selector: 'app-retiro-aporte-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: BASE_IMPORTS,
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>swap_vert</mat-icon></div>
      <div class="header-text"><h2>Retiro o aporte de efectivo</h2>
        <p>Mueve efectivo entre la caja y la administración; no es un ingreso ni un gasto del hotel.</p></div>
    </div>
    <mat-dialog-content>
      <div class="info-banner"><mat-icon>payments</mat-icon><span>Efectivo en caja ahora: <strong>{{ moneda(turno.efectivoEsperado) }}</strong></span></div>
      <form [formGroup]="form" class="dialog-form-grid">
        <mat-button-toggle-group formControlName="tipo" class="full tipo">
          <mat-button-toggle value="RETIRO"><mat-icon>north_east</mat-icon> Retiro</mat-button-toggle>
          <mat-button-toggle value="APORTE"><mat-icon>south_west</mat-icon> Aporte</mat-button-toggle>
        </mat-button-toggle-group>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Valor (COP)</mat-label>
          <input matInput type="number" min="1" formControlName="valor" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Motivo</mat-label>
          <input matInput formControlName="motivo" maxlength="200"
                 [placeholder]="form.controls.tipo.value === 'RETIRO' ? 'Ej. Billetes grandes a la caja fuerte' : 'Ej. Monedas para dar vueltas'" />
        </mat-form-field>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Registrar</button>
    </mat-dialog-actions>
  `,
  styles: ` .tipo { margin-bottom: 1rem; } .info-banner { margin-bottom: 1rem; } .error { color: #c62828; font-size: 0.85rem; margin: 0; } `,
})
export class RetiroAporteDialogComponent {
  readonly turno = inject<TurnoCaja>(MAT_DIALOG_DATA);
  private readonly caja = inject(CajaService);
  private readonly ref = inject(MatDialogRef<RetiroAporteDialogComponent, boolean>);
  private readonly fb = inject(FormBuilder);

  readonly moneda = moneda;
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.group({
    tipo: ['RETIRO' as TipoMovimientoCaja, Validators.required],
    valor: [null as number | null, [Validators.required, Validators.min(1)]],
    motivo: ['', Validators.required],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.error.set('Indique el valor y el motivo.');
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.caja.retiroAporte(v.tipo!, Number(v.valor), v.motivo!.trim()).subscribe({
      next: () => this.ref.close(true),
      error: (e) => {
        this.guardando.set(false);
        this.error.set(extractApiErrorMessage(e));
      },
    });
  }
}

// ------------------------------------------------------------------ Arqueo y cierre del turno
export interface CerrarTurnoData {
  turno: TurnoCaja;
  porAdministrador: boolean;
}

@Component({
  selector: 'app-cerrar-turno-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [...BASE_IMPORTS, FormsModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>point_of_sale</mat-icon></div>
      <div class="header-text"><h2>Arqueo y cierre de turno</h2>
        <p>Cuente el efectivo de la caja, deje la base para el siguiente turno y entregue el resto.</p></div>
    </div>
    <mat-dialog-content>
      @if (data.porAdministrador) {
        <div class="info-banner"><mat-icon>admin_panel_settings</mat-icon><span>Va a cerrar el turno de <strong>{{ t.cajeroNombre }}</strong> como administrador: la observación es obligatoria.</span></div>
      }
      <p class="section-label">Conteo del efectivo</p>
      <mat-button-toggle-group [(ngModel)]="modo" class="modo">
        <mat-button-toggle value="denominaciones"><mat-icon>grid_view</mat-icon> Por billetes y monedas</mat-button-toggle>
        <mat-button-toggle value="total"><mat-icon>calculate</mat-icon> Solo el total</mat-button-toggle>
      </mat-button-toggle-group>

      @if (modo === 'denominaciones') {
        <div class="denominaciones">
          @for (grupo of grupos; track grupo.titulo) {
            <div class="grupo">
              <span class="grupo-titulo">{{ grupo.titulo }}</span>
              @for (d of grupo.valores; track d) {
                <label class="fila">
                  <span class="den">{{ moneda(d) }}</span>
                  <span class="por">×</span>
                  <input type="number" min="0" inputmode="numeric" [value]="cantidades()[d] || ''"
                         (input)="cambiarCantidad(d, $any($event.target).value)" [attr.aria-label]="'Cantidad de ' + moneda(d)" />
                  <span class="sub rx-num">{{ moneda(d * (cantidades()[d] || 0)) }}</span>
                </label>
              }
            </div>
          }
        </div>
      } @else {
        <mat-form-field appearance="outline" class="total">
          <mat-label>Total de efectivo contado (COP)</mat-label>
          <input matInput type="number" min="0" [ngModel]="totalManual()" (ngModelChange)="totalManual.set($event)" />
        </mat-form-field>
      }

      <div class="resumen">
        <div><span>Esperado</span><strong class="rx-num">{{ moneda(t.efectivoEsperado) }}</strong></div>
        <div><span>Contado</span><strong class="rx-num">{{ moneda(contado()) }}</strong></div>
        <div [class.negativo]="diferencia() < 0" [class.positivo]="diferencia() > 0">
          <span>{{ diferencia() < 0 ? 'Faltante' : diferencia() > 0 ? 'Sobrante' : 'Diferencia' }}</span>
          <strong class="rx-num">{{ moneda(diferencia()) }}</strong>
        </div>
      </div>
      <p class="detalle-esperado">Esperado = base {{ moneda(t.baseInicial) }} + ingresos en efectivo {{ moneda(t.ingresosEfectivo) }}
        − egresos en efectivo {{ moneda(t.egresosEfectivo) }} + aportes {{ moneda(t.aportes) }} − retiros {{ moneda(t.retiros) }}</p>

      <p class="section-label">Entrega</p>
      <div class="dialog-form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Base que queda en la caja</mat-label>
          <input matInput type="number" min="0" [ngModel]="base()" (ngModelChange)="base.set($event)" />
          <mat-hint>Para el siguiente turno</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Valor que entrega</mat-label>
          <input matInput [value]="moneda(entregado())" readonly />
          <mat-hint>Contado − base</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Recibe (opcional)</mat-label>
          <input matInput [(ngModel)]="recibidoPor" maxlength="120" placeholder="Nombre de quien recibe la caja o el dinero" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Observación {{ requiereObservacion() ? '(obligatoria)' : '(opcional)' }}</mat-label>
          <textarea matInput rows="2" [(ngModel)]="observacion" maxlength="500"></textarea>
          @if (diferencia() !== 0) { <mat-hint class="aviso">Explique el {{ diferencia() < 0 ? 'faltante' : 'sobrante' }}.</mat-hint> }
        </mat-form-field>
      </div>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="cerrar()" [disabled]="guardando()"><mat-icon>lock</mat-icon>Cerrar turno</button>
    </mat-dialog-actions>
  `,
  styles: `
    .modo { margin-bottom: 0.75rem; flex-wrap: wrap; }
    .denominaciones { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr)); gap: 0.75rem 1.25rem; margin-bottom: 0.75rem; padding-right: 0.75rem; }
    .grupo { display: flex; flex-direction: column; gap: 0.3rem; }
    .grupo-titulo { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #5b6660; }
    .fila { display: grid; grid-template-columns: 5.5rem 0.8rem 4.5rem 1fr; align-items: center; gap: 0.35rem; font-size: 0.9rem; }
    .fila input { width: 100%; box-sizing: border-box; padding: 0.35rem 0.4rem; border: 1px solid #c5ccc8; border-radius: 6px; font: inherit; text-align: right; }
    .fila input:focus { outline: 2px solid #2f6b4f; border-color: transparent; }
    .den { font-weight: 600; } .por { color: #8a948f; } .sub { text-align: right; color: #5b6660; }
    .total { width: 100%; }
    .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; background: #f3f6f4; border-radius: 10px; padding: 0.6rem 0.8rem; margin-top: 0.25rem; }
    .resumen div { display: flex; flex-direction: column; } .resumen span { font-size: 0.72rem; color: #5b6660; text-transform: uppercase; }
    .resumen .negativo strong { color: #c62828; } .resumen .positivo strong { color: #b26a00; }
    .detalle-esperado { font-size: 0.75rem; color: #5b6660; margin: 0.4rem 0 0.75rem; }
    .aviso { color: #b26a00; }
    .error { color: #c62828; font-size: 0.85rem; margin: 0.5rem 0 0; }
    @media (max-width: 600px) { .resumen { grid-template-columns: 1fr; } }
  `,
})
export class CerrarTurnoDialogComponent {
  readonly data = inject<CerrarTurnoData>(MAT_DIALOG_DATA);
  private readonly caja = inject(CajaService);
  private readonly ref = inject(MatDialogRef<CerrarTurnoDialogComponent, TurnoCaja>);

  readonly t = this.data.turno;
  readonly moneda = moneda;
  readonly grupos = [{ titulo: 'Billetes', valores: BILLETES }, { titulo: 'Monedas', valores: MONEDAS }];
  modo: 'denominaciones' | 'total' = 'denominaciones';
  recibidoPor = '';
  observacion = '';
  readonly cantidades = signal<Record<number, number>>({});
  readonly totalManual = signal<number | null>(null);
  readonly base = signal<number | null>(this.t.baseInicial);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly contadoDenominaciones = computed(() =>
    Object.entries(this.cantidades()).reduce((s, [d, c]) => s + Number(d) * (c || 0), 0));
  contado(): number {
    return this.modo === 'denominaciones' ? this.contadoDenominaciones() : Number(this.totalManual() || 0);
  }
  diferencia(): number {
    return Math.round((this.contado() - this.t.efectivoEsperado) * 100) / 100;
  }
  entregado(): number {
    return Math.max(this.contado() - Number(this.base() || 0), 0);
  }
  requiereObservacion(): boolean {
    return this.diferencia() !== 0 || this.data.porAdministrador;
  }

  cambiarCantidad(denominacion: number, valor: string): void {
    const n = Math.max(0, Math.floor(Number(valor) || 0));
    this.cantidades.update((c) => ({ ...c, [denominacion]: n }));
  }

  cerrar(): void {
    this.error.set(null);
    const contado = this.contado();
    const base = Number(this.base() ?? NaN);
    if (this.modo === 'total' && (this.totalManual() === null || this.totalManual() === undefined)) {
      this.error.set('Escriba el total de efectivo contado.');
      return;
    }
    if (Number.isNaN(base) || base < 0) {
      this.error.set('Indique la base que queda en la caja (puede ser $0).');
      return;
    }
    if (base > contado) {
      this.error.set('La base que queda no puede ser mayor que el efectivo contado.');
      return;
    }
    if (this.requiereObservacion() && !this.observacion.trim()) {
      this.error.set(this.data.porAdministrador ? 'Escriba la observación del cierre por administrador.'
        : `Explique en la observación el ${this.diferencia() < 0 ? 'faltante' : 'sobrante'} de ${moneda(Math.abs(this.diferencia()))}.`);
      return;
    }
    const conteo = this.modo === 'denominaciones'
      ? Object.entries(this.cantidades()).filter(([, c]) => c > 0).map(([d, c]) => ({ denominacion: Number(d), cantidad: c }))
      : null;
    this.guardando.set(true);
    this.caja
      .cerrar({
        conteo,
        efectivoContado: this.modo === 'total' ? contado : null,
        baseSiguiente: base,
        recibidoPor: this.recibidoPor.trim() || null,
        observacion: this.observacion.trim() || null,
      })
      .subscribe({
        next: (turno) => this.ref.close(turno),
        error: (e) => {
          this.guardando.set(false);
          this.error.set(extractApiErrorMessage(e));
        },
      });
  }
}
