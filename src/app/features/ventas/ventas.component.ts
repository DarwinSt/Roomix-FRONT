import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VentaService } from '../../core/services/venta.service';
import { AuthService } from '../../core/services/auth.service';
import { ErrorDialogService } from '../../core/services/error-dialog.service';
import { roomixDialogConfig } from '../../core/config/dialog.config';
import { Venta } from '../../core/models/venta.model';
import { hoyIso, moneda } from '../../core/utils/formato.util';
import { MotivoDialogComponent } from '../../shared/dialogs/motivo-dialog/motivo-dialog.component';
import { VentaDialogComponent } from './venta-dialog.component';

/** Tienda y minibar: ventas del día (de contado y cargadas a habitaciones), nueva venta y anulación. */
@Component({
  selector: 'app-ventas',
  imports: [FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div class="page-header row">
      <div>
        <h1>Tienda y minibar</h1>
        <p>Venta de productos del inventario a los huéspedes: se cobran en el momento o se cargan a la habitación.</p>
      </div>
      <div class="rx-acciones">
        <button mat-flat-button color="primary" (click)="nueva()"><mat-icon>add_shopping_cart</mat-icon>Nueva venta</button>
      </div>
    </div>

    <div class="rx-kpis">
      <div class="rx-kpi">
        <span class="rx-kpi-etiqueta"><mat-icon>payments</mat-icon>De contado</span>
        <span class="rx-kpi-valor">{{ moneda(totales().contado) }}</span>
        <span class="rx-kpi-sub">Efectivo, tarjeta o transferencia</span>
      </div>
      <div class="rx-kpi">
        <span class="rx-kpi-etiqueta"><mat-icon>bed</mat-icon>A habitaciones</span>
        <span class="rx-kpi-valor">{{ moneda(totales().cargado) }}</span>
        <span class="rx-kpi-sub">Se cobra en el check-out</span>
      </div>
      <div class="rx-kpi">
        <span class="rx-kpi-etiqueta"><mat-icon>receipt</mat-icon>Ventas</span>
        <span class="rx-kpi-valor">{{ totales().cantidad }}</span>
        <span class="rx-kpi-sub">{{ totales().unidades }} productos</span>
      </div>
    </div>

    <section class="rx-card">
      <div class="encabezado">
        <div class="rx-card-titulo"><mat-icon>history</mat-icon>Ventas del día</div>
        <mat-form-field appearance="outline" class="fecha" subscriptSizing="dynamic">
          <mat-label>Fecha</mat-label>
          <input matInput type="date" [max]="hoy" [ngModel]="fecha()" (ngModelChange)="cambiarFecha($event)" />
        </mat-form-field>
      </div>

      @if (cargando()) {
        <div class="rx-cargando"><mat-spinner diameter="36" /></div>
      } @else if (ventas().length === 0) {
        <div class="rx-vacio">
          <mat-icon>storefront</mat-icon>
          <p>No hay ventas este día.</p>
          @if (puedeInventario) {
            <p class="rx-muted">Para vender un producto, póngale precio de venta en <a routerLink="/inventario">Inventario</a>.</p>
          }
        </div>
      } @else {
        <div class="rx-tabla-wrap">
          <table class="rx-tabla">
            <thead>
              <tr><th>Hora</th><th>Venta</th><th>Productos</th><th>Pago</th><th class="derecha">Total</th><th></th></tr>
            </thead>
            <tbody>
              @for (v of ventas(); track v.id) {
                <tr [class.anulada]="v.estado === 'ANULADA'">
                  <td data-label="Hora">{{ hora(v.fechaHora) }}</td>
                  <td data-label="Venta">#{{ v.id }}<span class="sub">{{ v.registradaPor }}</span></td>
                  <td data-label="Productos" class="ancho">
                    {{ resumen(v) }}
                    @if (v.estado === 'ANULADA') { <span class="sub">Anulada: {{ v.motivoAnulacion }}</span> }
                  </td>
                  <td data-label="Pago">
                    @if (v.modo === 'CONTADO') {
                      <span class="rx-chip ok">{{ v.metodoPagoNombre }}</span>
                      @if (v.cliente) { <span class="sub">{{ v.cliente }}</span> }
                    } @else {
                      <span class="rx-chip info">Hab. {{ v.habitacion }}</span><span class="sub">{{ v.cliente }}</span>
                    }
                  </td>
                  <td data-label="Total" class="derecha rx-num"><strong>{{ moneda(v.total) }}</strong></td>
                  <td class="derecha acciones">
                    <a mat-icon-button [routerLink]="['/ventas', v.id, 'ticket']" aria-label="Ver ticket" title="Ticket"><mat-icon>receipt</mat-icon></a>
                    @if (v.estado === 'VIGENTE' && puedeAnular) {
                      <button mat-button type="button" class="anular" (click)="anular(v)"><mat-icon>undo</mat-icon>Anular</button>
                    } @else if (v.estado === 'ANULADA') {
                      <span class="rx-chip neutro">Anulada</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .encabezado { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .encabezado .rx-card-titulo { margin: 0; }
    .fecha { width: 180px; }
    .sub { display: block; font-size: 0.75rem; color: var(--text-200); }
    .ancho { min-width: 220px; }
    .derecha { text-align: right; }
    tr.anulada td { color: var(--text-200); }
    tr.anulada .rx-num strong { text-decoration: line-through; }
    .anular { color: #a52a2a; }
    .acciones { white-space: nowrap; }
  `,
})
export class VentasComponent implements OnInit {
  private readonly service = inject(VentaService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly router = inject(Router);

  readonly moneda = moneda;
  readonly hoy = hoyIso();
  private readonly auth = inject(AuthService);
  readonly puedeInventario = this.auth.puede('INVENTARIO_GESTIONAR');
  /** Anular una venta es de administración o finanzas: quien vende no anula. */
  readonly puedeAnular = this.auth.puede('ANULACIONES');
  readonly fecha = signal(this.hoy);
  readonly cargando = signal(true);
  readonly ventas = signal<Venta[]>([]);

  readonly totales = computed(() => {
    const vigentes = this.ventas().filter((v) => v.estado === 'VIGENTE');
    return {
      contado: vigentes.filter((v) => v.modo === 'CONTADO').reduce((t, v) => t + v.total, 0),
      cargado: vigentes.filter((v) => v.modo === 'CARGO_HABITACION').reduce((t, v) => t + v.total, 0),
      cantidad: vigentes.length,
      unidades: vigentes.reduce((t, v) => t + v.items.reduce((u, i) => u + i.cantidad, 0), 0),
    };
  });

  ngOnInit(): void {
    this.cargar();
  }

  cambiarFecha(f: string): void {
    if (!f) return;
    this.fecha.set(f);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar({ fecha: this.fecha() }).subscribe({
      next: (v) => {
        this.ventas.set(v);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  nueva(): void {
    this.dialog
      .open(VentaDialogComponent, { ...roomixDialogConfig({ width: '980px' }), data: null })
      .afterClosed()
      .subscribe((v?: Venta | null) => {
        if (!v) return;
        this.snack
          .open(v.modo === 'CONTADO' ? `Venta #${v.id} cobrada · ${moneda(v.total)}` : `Venta #${v.id} cargada a la habitación ${v.habitacion}`,
            'Imprimir ticket', { duration: 6000 })
          .onAction()
          .subscribe(() => this.router.navigate(['/ventas', v.id, 'ticket'], { queryParams: { imprimir: 1 } }));
        this.fecha.set(this.hoy);
        this.cargar();
      });
  }

  anular(v: Venta): void {
    this.dialog
      .open(MotivoDialogComponent, {
        ...roomixDialogConfig({ width: '460px' }),
        data: {
          title: `Anular venta #${v.id}`,
          message: `${this.resumen(v)}. Los productos vuelven al inventario` +
            (v.modo === 'CONTADO' ? ' y el ingreso sale de la caja.' : ' y el cargo sale de la cuenta de la habitación.'),
          confirmLabel: 'Anular venta',
        },
      })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.service.anular(v.id, motivo).subscribe({
          next: () => {
            this.snack.open(`Venta #${v.id} anulada`, 'OK', { duration: 3000 });
            this.cargar();
          },
          error: (e) => this.errorDialog.mostrarDesdeApi(e),
        });
      });
  }

  resumen(v: Venta): string {
    return v.items.map((i) => `${i.nombre} ×${i.cantidad}`).join(', ');
  }

  hora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }
}
