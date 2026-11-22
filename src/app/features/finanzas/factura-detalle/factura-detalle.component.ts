import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FacturaService, HotelService } from '../../../core/services/finanzas.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { AuthService } from '../../../core/services/auth.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { Factura, METODOS_PAGO, MetodoPago, etiquetaEstadoFactura } from '../../../core/models/finanzas.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { fechaCorta, moneda } from '../../../core/utils/formato.util';
import { MotivoDialogComponent } from '../../../shared/dialogs/motivo-dialog/motivo-dialog.component';
import { claseEstadoFactura } from '../facturas-list/facturas-list.component';
import { MonedaDirective } from '../../../shared/directivas/moneda.directive';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { SelectorOpcionesComponent } from '../../../shared/formularios/selector-opciones.component';
import { LogoHotelDirective } from '../../../shared/directivas/logo-hotel.directive';

/** Registro de un pago (total o abono) sobre una factura. */
@Component({
  selector: 'app-pago-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [MonedaDirective, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    SelectorOpcionesComponent],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>payments</mat-icon></div>
      <div class="header-text"><h2>Registrar pago</h2><p>Factura {{ data.numero }} · saldo {{ moneda(data.saldo) }}</p></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="rx-monto rx-campo-completo">
          <mat-label>Valor del pago</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput rxMoneda formControlName="valor" />
          <mat-hint>Puede ser un pago parcial</mat-hint>
        </mat-form-field>
        <div class="rx-atajos">
          <button type="button" class="rx-chip-boton" (click)="form.controls.valor.setValue(data.saldo)">Todo el saldo</button>
        </div>
        <rx-selector-opciones formControlName="metodo" [opciones]="metodos" etiqueta="Medio de pago" />
        @if (metodo() !== 'EFECTIVO') {
          <mat-form-field appearance="outline" class="rx-campo-completo">
            <mat-label>Referencia (aprobación, comprobante)</mat-label>
            <input matInput formControlName="referencia" maxlength="80" />
          </mat-form-field>
        }
      </form>
      @if (error()) { <p class="rx-error-dialogo"><mat-icon>error_outline</mat-icon>{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()"><mat-icon>check</mat-icon>Registrar {{ valor() ? moneda(valor()) : 'pago' }}</button>
    </mat-dialog-actions>
  `,
})
export class PagoDialogComponent {
  readonly data = inject<{ id: number; numero: string; saldo: number }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<PagoDialogComponent, Factura>);
  private readonly service = inject(FacturaService);
  private readonly fb = inject(FormBuilder);
  readonly metodos = METODOS_PAGO;
  readonly moneda = moneda;
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.group({
    valor: [Number(this.data.saldo), [Validators.required, Validators.min(1), Validators.max(Number(this.data.saldo))]],
    metodo: ['TARJETA_CREDITO' as MetodoPago, Validators.required],
    referencia: [''],
  });
  readonly metodo = toSignal(this.form.controls.metodo.valueChanges, { initialValue: 'TARJETA_CREDITO' as MetodoPago | null });
  readonly valor = toSignal(this.form.controls.valor.valueChanges, { initialValue: Number(this.data.saldo) as number | null });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(`El valor debe estar entre 1 y ${moneda(this.data.saldo)}.`);
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.service.registrarPago(this.data.id, { valor: Number(v.valor), metodo: v.metodo!, referencia: v.referencia || null }).subscribe({
      next: (f) => this.ref.close(f),
      error: (e) => {
        this.guardando.set(false);
        this.error.set(extractApiErrorMessage(e));
      },
    });
  }
}

@Component({
  selector: 'app-factura-detalle',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, LogoHotelDirective],
  templateUrl: './factura-detalle.component.html',
  styleUrl: './factura-detalle.component.scss',
})
export class FacturaDetalleComponent implements OnInit {
  readonly logoHotel = inject(ConfiguracionService).logoUrl;
  /** Factura en 0 %: si el hotel cobra IVA es una exención (extranjero no residente); si no, no es responsable de IVA. */
  readonly cobraIva = inject(ConfiguracionService).cobraIva;
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(FacturaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  readonly hotel = toSignal(inject(HotelService).datos());
  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly etiqueta = etiquetaEstadoFactura;
  readonly clase = claseEstadoFactura;
  readonly factura = signal<Factura | null>(null);
  readonly cargando = signal(true);
  /** Anular es de administración o finanzas, no de quien cobra. */
  readonly puedeAnular = computed(() => this.auth.puede('ANULACIONES') && this.auth.puede('FACTURAS'));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.service.obtener(Number(this.route.snapshot.paramMap.get('id'))).subscribe({
      next: (f) => {
        this.factura.set(f);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  pagar(): void {
    const f = this.factura();
    if (!f) return;
    this.dialog
      .open(PagoDialogComponent, { ...roomixDialogConfig({ width: '480px' }), data: { id: f.id, numero: f.numero, saldo: f.saldo } })
      .afterClosed()
      .subscribe((actualizada?: Factura) => {
        if (actualizada) {
          this.factura.set(actualizada);
          this.snack.open(actualizada.estado === 'PAGADA' ? 'Factura pagada' : 'Abono registrado', 'OK', { duration: 2500 });
        }
      });
  }

  anular(): void {
    const f = this.factura();
    if (!f) return;
    this.dialog
      .open(MotivoDialogComponent, {
        ...roomixDialogConfig({ width: '460px' }),
        data: { title: `Anular ${f.numero}`, message: 'La factura y los ingresos de sus pagos quedarán anulados. Esta acción no se puede deshacer.', confirmLabel: 'Anular factura' },
      })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.service.anular(f.id, motivo).subscribe({
          next: (r) => {
            this.factura.set(r);
            this.snack.open('Factura anulada', 'OK', { duration: 2500 });
          },
          error: (e) => this.errorDialog.mostrarDesdeApi(e),
        });
      });
  }

  imprimir(): void {
    window.print();
  }
}
