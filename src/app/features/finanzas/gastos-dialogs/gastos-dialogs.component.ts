import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import {
  CategoriaFinanciera,
  GastoRecurrente,
  METODOS_PAGO,
  MetodoPago,
  MovimientoFinanciero,
  etiquetaMetodoPago,
} from '../../../core/models/finanzas.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { fechaCorta, hoyIso, moneda } from '../../../core/utils/formato.util';
import { ICONO_CATEGORIA } from '../../../core/models/caja.model';
import { SelectorOpcionesComponent } from '../../../shared/formularios/selector-opciones.component';
import { MonedaDirective } from '../../../shared/directivas/moneda.directive';
import { CampoFechaComponent } from '../../../shared/formularios/campo-fecha.component';

/** Confirmar el pago de un egreso que estaba «por pagar». */
@Component({
  selector: 'app-pagar-gasto-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [CampoFechaComponent, MonedaDirective, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    SelectorOpcionesComponent],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>task_alt</mat-icon></div>
      <div class="header-text"><h2>Registrar pago</h2><p>{{ data.concepto }} · vence {{ fecha(data.fechaVencimiento) }}</p></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="rx-monto rx-campo-completo">
          <mat-label>Valor pagado</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput rxMoneda formControlName="valor" />
        </mat-form-field>
        <rx-campo-fecha class="fecha" etiqueta="Fecha del pago" formControlName="fecha" subscript="fixed" />
        <rx-selector-opciones formControlName="metodoPago" [opciones]="metodos" etiqueta="Medio de pago" />
        <mat-form-field appearance="outline" class="rx-campo-completo">
          <mat-label>Referencia / soporte (opcional)</mat-label>
          <input matInput formControlName="referencia" maxlength="60" />
        </mat-form-field>
      </form>
      @if (error()) { <p class="rx-error-dialogo"><mat-icon>error_outline</mat-icon>{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()"><mat-icon>task_alt</mat-icon>Confirmar pago</button>
    </mat-dialog-actions>
  `,
  styles: `.fecha { width: 220px; max-width: 100%; }`,
})
export class PagarGastoDialogComponent {
  readonly data = inject<MovimientoFinanciero>(MAT_DIALOG_DATA);
  private readonly finanzas = inject(FinanzasService);
  private readonly ref = inject(MatDialogRef<PagarGastoDialogComponent, boolean>);
  readonly metodos = METODOS_PAGO;
  readonly fecha = fechaCorta;
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).group({
    valor: [this.data.valor as number | null, [Validators.required, Validators.min(1)]],
    fecha: [hoyIso(), Validators.required],
    metodoPago: [(this.data.metodoPago ?? 'TRANSFERENCIA') as MetodoPago],
    referencia: [this.data.referencia ?? ''],
  });

  guardar(): void {
    const v = this.form.getRawValue();
    this.finanzas
      .pagar(this.data.id, { valor: Number(v.valor), fecha: v.fecha, metodoPago: v.metodoPago, referencia: v.referencia || null })
      .subscribe({ next: () => this.ref.close(true), error: (e) => this.error.set(extractApiErrorMessage(e)) });
  }
}

/** Crear o editar la plantilla de un gasto que se repite cada mes. */
@Component({
  selector: 'app-gasto-recurrente-form-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [MonedaDirective, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatSlideToggleModule, SelectorOpcionesComponent],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>event_repeat</mat-icon></div>
      <div class="header-text"><h2>{{ data ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente' }}</h2><p>Cada mes se genera un egreso «por pagar» con vencimiento el día indicado.</p></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="rx-campo-completo">
          <mat-label>Concepto</mat-label>
          <input matInput formControlName="concepto" maxlength="200" placeholder="Ej. Arriendo del local, nómina quincenal, energía" />
        </mat-form-field>
        <rx-selector-opciones formControlName="categoria" [opciones]="opcionesCategoria()" etiqueta="Categoría" />
        <div class="dialog-form-grid">
          <mat-form-field appearance="outline" class="rx-monto">
            <mat-label>Valor mensual</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput rxMoneda formControlName="valor" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Día de vencimiento</mat-label>
            <input matInput type="number" min="1" max="28" formControlName="diaVencimiento" />
            <mat-hint>Del 1 al 28 de cada mes</mat-hint>
          </mat-form-field>
        </div>
        <rx-selector-opciones formControlName="metodoPago" [opciones]="metodos" etiqueta="Medio de pago habitual (opcional)" />
        <mat-form-field appearance="outline" class="rx-campo-completo">
          <mat-label>Proveedor / tercero</mat-label>
          <input matInput formControlName="tercero" maxlength="150" />
        </mat-form-field>
        @if (data) { <mat-slide-toggle formControlName="activo">Activo (genera el egreso cada mes)</mat-slide-toggle> }
      </form>
      @if (error()) { <p class="rx-error-dialogo"><mat-icon>error_outline</mat-icon>{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()"><mat-icon>check</mat-icon>Guardar</button>
    </mat-dialog-actions>
  `,
})
export class GastoRecurrenteFormDialogComponent {
  readonly data = inject<GastoRecurrente | null>(MAT_DIALOG_DATA);
  private readonly finanzas = inject(FinanzasService);
  private readonly ref = inject(MatDialogRef<GastoRecurrenteFormDialogComponent, boolean>);
  readonly metodos = METODOS_PAGO;
  readonly error = signal<string | null>(null);
  private readonly categorias = toSignal(this.finanzas.categorias(), { initialValue: [] });
  readonly categoriasEgreso = computed(() => this.categorias().filter((c) => c.tipo === 'EGRESO'));
  readonly opcionesCategoria = computed(() => this.categoriasEgreso()
    .map((c) => ({ value: c.codigo, label: c.nombre, icon: ICONO_CATEGORIA[c.codigo] ?? 'label' })));
  readonly form = inject(FormBuilder).group({
    concepto: [this.data?.concepto ?? '', Validators.required],
    categoria: [(this.data?.categoria ?? null) as CategoriaFinanciera | null, Validators.required],
    valor: [this.data?.valor ?? (null as number | null), [Validators.required, Validators.min(1)]],
    diaVencimiento: [this.data?.diaVencimiento ?? 5, [Validators.required, Validators.min(1), Validators.max(28)]],
    metodoPago: [(this.data?.metodoPago ?? null) as MetodoPago | null],
    tercero: [this.data?.tercero ?? ''],
    activo: [this.data?.activo ?? true],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete concepto, categoría, valor y un día de vencimiento entre 1 y 28.');
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      concepto: v.concepto!.trim(), categoria: v.categoria!, valor: Number(v.valor), diaVencimiento: Number(v.diaVencimiento),
      metodoPago: v.metodoPago, tercero: v.tercero?.trim() || null, activo: !!v.activo,
    };
    (this.data ? this.finanzas.actualizarGastoRecurrente(this.data.id, body) : this.finanzas.crearGastoRecurrente(body)).subscribe({
      next: () => this.ref.close(true),
      error: (e) => this.error.set(extractApiErrorMessage(e)),
    });
  }
}

/** Lista de gastos recurrentes (plantillas mensuales) con su próximo vencimiento. */
@Component({
  selector: 'app-gastos-recurrentes-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>event_repeat</mat-icon></div>
      <div class="header-text"><h2>Gastos recurrentes</h2><p>Arriendo, nómina, servicios públicos… Cada mes quedan «por pagar» hasta que se confirme el pago.</p></div>
    </div>
    <mat-dialog-content>
      @if (cargando()) {
        <div class="rx-cargando"><mat-spinner diameter="36" /></div>
      } @else if (gastos().length === 0) {
        <div class="rx-vacio"><mat-icon>event_repeat</mat-icon><p>No hay gastos recurrentes. Cree el primero.</p></div>
      } @else {
        <div class="rx-tabla-wrap">
          <table class="rx-tabla">
            <thead><tr><th>Concepto</th><th>Vence</th><th>Próximo</th><th class="derecha">Valor</th><th>Activo</th><th></th></tr></thead>
            <tbody>
              @for (g of gastos(); track g.id) {
                <tr [class.inactivo]="!g.activo">
                  <td data-label="Concepto" class="ancho"><strong>{{ g.concepto }}</strong><span class="sub">{{ g.categoriaNombre }}@if (g.tercero) { · {{ g.tercero }} } · {{ metodo(g.metodoPago) }}</span></td>
                  <td data-label="Vence">Día {{ g.diaVencimiento }}</td>
                  <td data-label="Próximo" class="rx-num">{{ g.proximoVencimiento ? fecha(g.proximoVencimiento) : '—' }}</td>
                  <td data-label="Valor" class="derecha rx-num">{{ moneda(g.valor) }}</td>
                  <td data-label="Activo"><mat-slide-toggle [checked]="g.activo" (change)="activar(g, $event.checked)" [attr.aria-label]="'Activar ' + g.concepto" /></td>
                  <td><button mat-icon-button (click)="abrir(g)" matTooltip="Editar" aria-label="Editar gasto recurrente"><mat-icon>edit</mat-icon></button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="rx-muted total">Total mensual activo: <strong>{{ moneda(totalMensual()) }}</strong></p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="huboCambios">Cerrar</button>
      <button mat-flat-button color="primary" (click)="abrir(null)"><mat-icon>add</mat-icon>Nuevo gasto recurrente</button>
    </mat-dialog-actions>
  `,
  styles: `.sub { display: block; color: #5b6660; font-size: 0.8rem; } tr.inactivo td { opacity: 0.55; } .total { margin: 0.75rem 0 0; }`,
})
export class GastosRecurrentesDialogComponent implements OnInit {
  private readonly finanzas = inject(FinanzasService);
  private readonly dialog = inject(MatDialog);
  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly metodo = etiquetaMetodoPago;
  readonly cargando = signal(true);
  readonly gastos = signal<GastoRecurrente[]>([]);
  readonly totalMensual = computed(() => this.gastos().filter((g) => g.activo).reduce((s, g) => s + Number(g.valor), 0));
  huboCambios = false;

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.finanzas.gastosRecurrentes().subscribe({
      next: (g) => {
        this.gastos.set(g);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  abrir(g: GastoRecurrente | null): void {
    this.dialog
      .open(GastoRecurrenteFormDialogComponent, { ...roomixDialogConfig({ width: '560px' }), data: g })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.huboCambios = true;
          this.cargar();
        }
      });
  }

  activar(g: GastoRecurrente, valor: boolean): void {
    this.finanzas.activarGastoRecurrente(g.id, valor).subscribe({
      next: () => {
        this.huboCambios = true;
        this.cargar();
      },
      error: () => this.cargar(),
    });
  }
}
