import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CajaService } from '../../core/services/caja.service';
import { ErrorDialogService } from '../../core/services/error-dialog.service';
import { DetalleTurno, claseTipoMovimientoTurno, etiquetaTipoMovimientoTurno } from '../../core/models/caja.model';
import { fechaCorta, moneda } from '../../core/utils/formato.util';

/** Acta del turno de caja: resumen, arqueo, conteo, movimientos y firmas de entrega (imprimible). */
@Component({
  selector: 'app-turno-detalle',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (!detalle()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (detalle(); as d) {
      @let t = d.turno;
      <div class="page-header row no-imprimir">
        <div>
          <h1>Turno de caja #{{ t.id }}</h1>
          <p>{{ t.estado === 'ABIERTO' ? 'Turno abierto: los totales se actualizan con cada movimiento.' : 'Acta de arqueo y entrega de la caja.' }}</p>
        </div>
        <div class="rx-acciones">
          <a mat-stroked-button routerLink="/caja"><mat-icon>arrow_back</mat-icon>Volver a Caja</a>
          <button mat-flat-button color="primary" (click)="imprimir()"><mat-icon>print</mat-icon>Imprimir / PDF</button>
        </div>
      </div>
      <h1 class="solo-imprimir">Acta de cierre de caja — Turno #{{ t.id }}</h1>

      <section class="rx-card">
        <div class="rx-card-titulo"><mat-icon>badge</mat-icon>Turno</div>
        <div class="rx-datos">
          <div class="rx-dato"><span>Cajero</span><strong>{{ t.cajeroNombre }} ({{ t.cajero }})</strong></div>
          <div class="rx-dato"><span>Apertura</span><strong>{{ fecha(t.fechaHoraApertura, true) }}</strong></div>
          <div class="rx-dato"><span>Cierre</span><strong>{{ t.fechaHoraCierre ? fecha(t.fechaHoraCierre, true) : 'Abierto' }}</strong></div>
          <div class="rx-dato"><span>Cerró</span><strong>{{ t.cerradoPor ?? '—' }}</strong></div>
          <div class="rx-dato"><span>Recibe</span><strong>{{ t.recibidoPor ?? '—' }}</strong></div>
          <div class="rx-dato"><span>Movimientos</span><strong>{{ t.cantidadMovimientos }}</strong></div>
        </div>
        @if (t.observacionApertura) { <p class="obs"><strong>Observación de apertura:</strong> {{ t.observacionApertura }}</p> }
      </section>

      <section class="rx-card">
        <div class="rx-card-titulo"><mat-icon>payments</mat-icon>Arqueo del efectivo</div>
        <table class="rx-tabla arqueo">
          <tbody>
            <tr><td>Base recibida</td><td class="derecha rx-num">{{ moneda(t.baseInicial) }}</td></tr>
            @if (t.baseEsperada !== null && t.baseEsperada !== t.baseInicial) {
              <tr class="nota"><td>Base que dejó el turno anterior</td><td class="derecha rx-num">{{ moneda(t.baseEsperada) }}</td></tr>
            }
            <tr><td>+ Ingresos en efectivo</td><td class="derecha rx-num">{{ moneda(t.ingresosEfectivo) }}</td></tr>
            <tr><td>− Egresos en efectivo</td><td class="derecha rx-num">{{ moneda(t.egresosEfectivo) }}</td></tr>
            <tr><td>+ Aportes</td><td class="derecha rx-num">{{ moneda(t.aportes) }}</td></tr>
            <tr><td>− Retiros</td><td class="derecha rx-num">{{ moneda(t.retiros) }}</td></tr>
            <tr class="total"><td>Efectivo esperado</td><td class="derecha rx-num">{{ moneda(t.efectivoEsperado) }}</td></tr>
            @if (t.estado === 'CERRADO') {
              <tr class="total"><td>Efectivo contado</td><td class="derecha rx-num">{{ moneda(t.efectivoContado) }}</td></tr>
              <tr [class.negativo]="(t.diferencia ?? 0) < 0"><td>{{ (t.diferencia ?? 0) < 0 ? 'Faltante' : (t.diferencia ?? 0) > 0 ? 'Sobrante' : 'Diferencia' }}</td>
                <td class="derecha rx-num">{{ moneda(t.diferencia) }}</td></tr>
              <tr><td>Base que queda para el siguiente turno</td><td class="derecha rx-num">{{ moneda(t.baseSiguiente) }}</td></tr>
              <tr class="total"><td>Valor entregado</td><td class="derecha rx-num">{{ moneda(t.valorEntregado) }}</td></tr>
            }
          </tbody>
        </table>
        @if (t.observacionCierre) { <p class="obs"><strong>Observación del cierre:</strong> {{ t.observacionCierre }}</p> }
      </section>

      <div class="columnas">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>credit_card</mat-icon>Totales por medio de pago</div>
          @if (t.totalesPorMedio.length === 0) { <p class="rx-muted">Sin pagos.</p> } @else {
            <table class="rx-tabla">
              <thead><tr><th>Medio</th><th class="derecha">Ingresos</th><th class="derecha">Egresos</th><th class="derecha">Neto</th></tr></thead>
              <tbody>
                @for (m of t.totalesPorMedio; track m.metodo) {
                  <tr><td data-label="Medio">{{ m.nombre }}</td><td data-label="Ingresos" class="derecha rx-num">{{ moneda(m.ingresos) }}</td>
                    <td data-label="Egresos" class="derecha rx-num">{{ moneda(m.egresos) }}</td><td data-label="Neto" class="derecha rx-num"><strong>{{ moneda(m.neto) }}</strong></td></tr>
                }
                <tr class="total"><td>Total</td><td class="derecha rx-num">{{ moneda(t.totalIngresos) }}</td><td class="derecha rx-num">{{ moneda(t.totalEgresos) }}</td>
                  <td class="derecha rx-num">{{ moneda(t.totalIngresos - t.totalEgresos) }}</td></tr>
              </tbody>
            </table>
          }
        </section>
        @if (t.conteo.length > 0) {
          <section class="rx-card">
            <div class="rx-card-titulo"><mat-icon>grid_view</mat-icon>Conteo de billetes y monedas</div>
            <table class="rx-tabla">
              <thead><tr><th>Denominación</th><th class="derecha">Cantidad</th><th class="derecha">Subtotal</th></tr></thead>
              <tbody>
                @for (c of t.conteo; track c.denominacion) {
                  <tr><td>{{ moneda(c.denominacion) }}</td><td class="derecha rx-num">{{ c.cantidad }}</td><td class="derecha rx-num">{{ moneda(c.denominacion * c.cantidad) }}</td></tr>
                }
                <tr class="total"><td>Total contado</td><td></td><td class="derecha rx-num">{{ moneda(t.efectivoContado) }}</td></tr>
              </tbody>
            </table>
          </section>
        }
      </div>

      <section class="rx-card">
        <div class="rx-card-titulo"><mat-icon>list</mat-icon>Movimientos ({{ d.movimientos.length }})</div>
        @if (d.movimientos.length === 0) { <p class="rx-muted">Sin movimientos.</p> } @else {
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Concepto</th><th>Medio</th><th class="derecha">Valor</th><th>Registró</th></tr></thead>
              <tbody>
                @for (m of d.movimientos; track m.origen + m.id) {
                  <tr [class.anulado]="m.anulado">
                    <td data-label="Fecha">{{ fecha(m.fechaHora, true) }}</td>
                    <td data-label="Tipo"><span class="rx-chip {{ claseTipo(m.tipo) }}">{{ etiquetaTipo(m.tipo) }}</span></td>
                    <td data-label="Concepto">{{ m.concepto }}@if (m.anulado) { (anulado) }</td>
                    <td data-label="Medio">{{ m.metodoNombre }}</td>
                    <td data-label="Valor" class="derecha rx-num">{{ m.tipo === 'EGRESO' || m.tipo === 'RETIRO' ? '−' : '' }}{{ moneda(m.valor) }}</td>
                    <td data-label="Registró">{{ m.registradoPor }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <div class="firmas solo-imprimir">
        <div><span></span>Entrega: {{ t.cajeroNombre }}</div>
        <div><span></span>Recibe: {{ t.recibidoPor ?? '' }}</div>
      </div>
    }
  `,
  styles: `
    .obs { margin: 0.75rem 0 0; font-size: 0.9rem; }
    .arqueo { max-width: 560px; }
    .arqueo tr.total td { font-weight: 700; border-top: 1px solid #c5ccc8; }
    .arqueo tr.nota td { color: #8a948f; font-size: 0.85rem; }
    .negativo td { color: #c62828; font-weight: 600; }
    .columnas { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 1rem; }
    tr.total td { font-weight: 700; }
    tr.anulado td { text-decoration: line-through; color: #8a948f; }
    .firmas { margin-top: 3rem; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; }
    .firmas div { border-top: 1px solid #333; padding-top: 0.4rem; font-size: 0.9rem; }
  `,
})
export class TurnoDetalleComponent implements OnInit {
  private readonly caja = inject(CajaService);
  private readonly route = inject(ActivatedRoute);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly etiquetaTipo = etiquetaTipoMovimientoTurno;
  readonly claseTipo = claseTipoMovimientoTurno;
  readonly detalle = signal<DetalleTurno | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.caja.detalle(id).subscribe({
      next: (d) => this.detalle.set(d),
      error: (e) => this.errorDialog.mostrarDesdeApi(e),
    });
  }

  imprimir(): void {
    window.print();
  }
}
