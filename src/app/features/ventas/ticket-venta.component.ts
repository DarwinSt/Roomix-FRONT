import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VentaService } from '../../core/services/venta.service';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { HotelService } from '../../core/services/finanzas.service';
import { ErrorDialogService } from '../../core/services/error-dialog.service';
import { Venta } from '../../core/models/venta.model';
import { fechaCorta, moneda } from '../../core/utils/formato.util';

/**
 * Ticket de una venta de la tienda o el minibar para entregar al huésped. Es angosto a propósito: sale bien en una
 * impresora de recibos (80 mm) y en una hoja normal.
 */
@Component({
  selector: 'app-ticket-venta',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-header row no-imprimir">
      <div>
        <h1>Ticket de venta</h1>
        <p>Comprobante para entregar al huésped.</p>
      </div>
      <div class="rx-acciones">
        <a mat-stroked-button routerLink="/ventas"><mat-icon>arrow_back</mat-icon>Ventas</a>
        <button mat-flat-button color="primary" (click)="imprimir()" [disabled]="!venta()"><mat-icon>print</mat-icon>Imprimir</button>
      </div>
    </div>

    @if (!venta()) {
      <div class="rx-cargando"><mat-spinner diameter="40" /></div>
    } @else if (venta(); as v) {
      <article class="ticket" [class.anulada]="v.estado === 'ANULADA'">
        <header>
          @if (logo(); as src) { <img [src]="src" [alt]="nombre()" /> }
          <strong class="hotel">{{ nombre() }}</strong>
          @if (hotel(); as h) {
            @if (h.nit) { <span>NIT {{ h.nit }}</span> }
            @if (h.direccion) { <span>{{ h.direccion }}{{ h.ciudad ? ', ' + h.ciudad : '' }}</span> }
            @if (h.telefono) { <span>{{ h.telefono }}</span> }
          }
        </header>
        <div class="separador"></div>
        <div class="fila"><span>Venta</span><strong>#{{ v.id }}</strong></div>
        <div class="fila"><span>Fecha</span><span>{{ fecha(v.fechaHora, true) }}</span></div>
        @if (v.habitacion) { <div class="fila"><span>Habitación</span><span>{{ v.habitacion }}</span></div> }
        @if (v.cliente) { <div class="fila"><span>Cliente</span><span>{{ v.cliente }}</span></div> }
        <div class="separador"></div>
        <table>
          <tbody>
            @for (i of v.items; track i.id) {
              <tr>
                <td class="producto">{{ i.cantidad }} × {{ i.nombre }}<span>{{ moneda(i.precioUnitario) }} c/u</span></td>
                <td class="valor">{{ moneda(i.total) }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="separador"></div>
        <div class="fila total"><span>Total</span><strong>{{ moneda(v.total) }}</strong></div>
        <div class="fila"><span>Pago</span><span>{{ v.modo === 'CONTADO' ? v.metodoPagoNombre : 'Cargado a la habitación ' + v.habitacion }}</span></div>
        @if (v.estado === 'ANULADA') { <p class="sello">ANULADA — {{ v.motivoAnulacion }}</p> }
        <div class="separador"></div>
        <p class="pie">Atendido por {{ v.registradaPor }}<br />¡Gracias por su compra!</p>
      </article>
    }
  `,
  styles: `
    .ticket { max-width: 340px; margin: 0 auto; background: #fff; border: 1px solid var(--bg-200); border-radius: 12px; padding: 1.25rem 1.1rem;
      font-size: 0.86rem; color: #222; box-shadow: var(--roomix-shadow); }
    header { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.1rem; font-size: 0.78rem; color: #444; }
    header img { max-height: 56px; max-width: 160px; object-fit: contain; margin-bottom: 0.3rem; }
    .hotel { font-size: 1rem; color: #111; }
    .separador { border-top: 1px dashed #bbb; margin: 0.7rem 0; }
    .fila { display: flex; justify-content: space-between; gap: 1rem; padding: 0.1rem 0; }
    .fila span:first-child { color: #555; }
    .fila.total { font-size: 1.05rem; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 0.25rem 0; vertical-align: top; }
    .producto span { display: block; font-size: 0.74rem; color: #666; }
    .valor { text-align: right; white-space: nowrap; font-weight: 600; }
    .sello { text-align: center; font-weight: 800; color: #a52a2a; border: 2px solid #a52a2a; border-radius: 6px; padding: 0.3rem; margin: 0.7rem 0 0; }
    .anulada .valor, .anulada .total strong { text-decoration: line-through; }
    .pie { text-align: center; font-size: 0.78rem; color: #555; margin: 0; }
    @media print {
      .ticket { border: none; box-shadow: none; padding: 0; max-width: 72mm; }
    }
  `,
})
export class TicketVentaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(VentaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly configuracion = inject(ConfiguracionService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly venta = signal<Venta | null>(null);
  readonly logo = this.configuracion.logoUrl;
  readonly hotel = toSignal(inject(HotelService).datos(), { initialValue: null });
  readonly nombre = computed(() => this.hotel()?.nombre ?? this.configuracion.nombreHotel());

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.obtener(id).subscribe({
      next: (v) => {
        this.venta.set(v);
        if (this.route.snapshot.queryParamMap.get('imprimir') === '1') setTimeout(() => window.print(), 400);
      },
      error: (e) => this.errorDialog.mostrarDesdeApi(e),
    });
  }

  imprimir(): void {
    window.print();
  }
}
