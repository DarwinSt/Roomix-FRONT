import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { CajaService } from '../../core/services/caja.service';
import { ErrorDialogService } from '../../core/services/error-dialog.service';
import { roomixDialogConfig } from '../../core/config/dialog.config';
import {
  EstadoCaja,
  MovimientoTurno,
  TurnoCaja,
  claseTipoMovimientoTurno,
  etiquetaTipoMovimientoTurno,
} from '../../core/models/caja.model';
import { TipoMovimiento } from '../../core/models/finanzas.model';
import { fechaCorta, hoyIso, isoFecha, moneda, sumarDias } from '../../core/utils/formato.util';
import {
  AbrirTurnoDialogComponent,
  CerrarTurnoDialogComponent,
  MovimientoCajaDialogComponent,
  RetiroAporteDialogComponent,
} from './caja-dialogs.component';

/** Caja de la recepción: turno abierto con sus totales y movimientos, acciones del cajero e historial de turnos. */
@Component({
  selector: 'app-caja',
  imports: [FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div class="page-header row">
      <div>
        <h1>Caja</h1>
        <p>Turno de la recepción: base recibida, pagos, ingresos y egresos del turno, arqueo y entrega de la caja.</p>
      </div>
      @if (estado()?.turnoAbierto && puedeOperar()) {
        <div class="rx-acciones">
          <button mat-stroked-button (click)="movimiento('INGRESO')"><mat-icon>trending_up</mat-icon>Ingreso</button>
          <button mat-stroked-button (click)="movimiento('EGRESO')"><mat-icon>trending_down</mat-icon>Egreso</button>
          <button mat-stroked-button (click)="retiroAporte()"><mat-icon>swap_vert</mat-icon>Retiro / aporte</button>
          <button mat-flat-button color="primary" (click)="cerrar()"><mat-icon>lock</mat-icon>Cerrar turno</button>
        </div>
      }
    </div>

    @if (cargando() && !estado()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (estado(); as e) {
      @if (!e.turnoAbierto) {
        <section class="rx-card cerrada">
          <mat-icon class="icono-estado">lock</mat-icon>
          <div class="texto">
            <h2>La caja está cerrada</h2>
            @if (e.ultimoCierre) {
              <p>Último cierre: {{ e.ultimoCajero }}, {{ fecha(e.ultimoCierre, true) }}. Dejó una base de <strong>{{ moneda(e.baseSugerida) }}</strong>.</p>
            } @else {
              <p>Aún no se ha abierto ningún turno.</p>
            }
            @if (esRecepcion()) { <p class="aviso">Para registrar reservas con pago, abonos, pagos de facturas o movimientos debe abrir su turno.</p> }
          </div>
          @if (puedeAbrir()) {
            <button mat-flat-button color="primary" (click)="abrir()"><mat-icon>lock_open</mat-icon>Abrir turno</button>
          }
        </section>
      } @else if (e.turnoAbierto; as t) {
        @if (!e.esMio) {
          <div class="banner"><mat-icon>person</mat-icon>
            <span>La caja está a cargo de <strong>{{ t.cajeroNombre }}</strong> desde {{ fecha(t.fechaHoraApertura, true) }}.
              @if (esRecepcion()) { Para cobrar, esa persona debe cerrar su turno y entregarle la caja. }
              @if (esAdmin()) { Como administrador puede registrar retiros o aportes y cerrar el turno si es necesario. }
            </span>
          </div>
        }
        @if (e.esMio || !esRecepcion()) {
          <div class="rx-kpis">
            <div class="rx-kpi">
              <span class="rx-kpi-etiqueta"><mat-icon>account_balance_wallet</mat-icon>Base inicial</span>
              <span class="rx-kpi-valor">{{ moneda(t.baseInicial) }}</span>
              <span class="rx-kpi-sub">Turno #{{ t.id }} · {{ t.cajeroNombre }} · desde {{ fecha(t.fechaHoraApertura, true) }}</span>
            </div>
            <div class="rx-kpi">
              <span class="rx-kpi-etiqueta"><mat-icon>trending_up</mat-icon>Ingresos</span>
              <span class="rx-kpi-valor">{{ moneda(t.totalIngresos) }}</span>
              <span class="rx-kpi-sub">En efectivo {{ moneda(t.ingresosEfectivo) }}</span>
            </div>
            <div class="rx-kpi">
              <span class="rx-kpi-etiqueta"><mat-icon>trending_down</mat-icon>Egresos</span>
              <span class="rx-kpi-valor">{{ moneda(t.totalEgresos) }}</span>
              <span class="rx-kpi-sub">En efectivo {{ moneda(t.egresosEfectivo) }}</span>
            </div>
            <div class="rx-kpi destacado">
              <span class="rx-kpi-etiqueta"><mat-icon>payments</mat-icon>Efectivo en caja</span>
              <span class="rx-kpi-valor">{{ moneda(t.efectivoEsperado) }}</span>
              <span class="rx-kpi-sub">Retiros {{ moneda(t.retiros) }} · aportes {{ moneda(t.aportes) }}</span>
            </div>
          </div>

          <div class="columnas">
            <section class="rx-card">
              <div class="rx-card-titulo"><mat-icon>credit_card</mat-icon>Por medio de pago</div>
              @if (t.totalesPorMedio.length === 0) {
                <p class="rx-muted">Sin pagos todavía.</p>
              } @else {
                <div class="rx-tabla-wrap">
                <table class="rx-tabla">
                  <thead><tr><th>Medio</th><th class="derecha">Ingresos</th><th class="derecha">Egresos</th><th class="derecha">Neto</th></tr></thead>
                  <tbody>
                    @for (m of t.totalesPorMedio; track m.metodo) {
                      <tr>
                        <td data-label="Medio">{{ m.nombre }}</td>
                        <td data-label="Ingresos" class="derecha rx-num">{{ moneda(m.ingresos) }}</td>
                        <td data-label="Egresos" class="derecha rx-num">{{ moneda(m.egresos) }}</td>
                        <td data-label="Neto" class="derecha rx-num"><strong>{{ moneda(m.neto) }}</strong></td>
                      </tr>
                    }
                  </tbody>
                </table>
                </div>
              }
            </section>
            <section class="rx-card">
              <div class="rx-card-titulo"><mat-icon>bolt</mat-icon>Cobros del turno</div>
              <p class="rx-muted">Los pagos que registre en reservas (abonos) y facturas entran solos a este turno.</p>
              <div class="enlaces">
                <a mat-stroked-button routerLink="/facturas" [queryParams]="{ estado: 'PENDIENTE' }"><mat-icon>receipt_long</mat-icon>Facturas por cobrar</a>
                <a mat-stroked-button routerLink="/reservas"><mat-icon>event_note</mat-icon>Reservas</a>
                <a mat-stroked-button [routerLink]="['/caja/turnos', t.id]"><mat-icon>print</mat-icon>Ver o imprimir el turno</a>
              </div>
            </section>
          </div>

          <section class="rx-card">
            <div class="rx-card-titulo"><mat-icon>list</mat-icon>Movimientos del turno ({{ movimientos().length }})</div>
            @if (movimientos().length === 0) {
              <p class="rx-muted">Todavía no hay movimientos en este turno.</p>
            } @else {
              <div class="rx-tabla-wrap">
                <table class="rx-tabla">
                  <thead><tr><th>Hora</th><th>Tipo</th><th>Concepto</th><th>Medio</th><th class="derecha">Valor</th><th>Registró</th></tr></thead>
                  <tbody>
                    @for (m of movimientos(); track m.origen + m.id) {
                      <tr [class.anulado]="m.anulado">
                        <td data-label="Hora">{{ hora(m.fechaHora) }}</td>
                        <td data-label="Tipo"><span class="rx-chip {{ claseTipo(m.tipo) }}">{{ etiquetaTipo(m.tipo) }}</span></td>
                        <td data-label="Concepto" class="ancho">{{ m.concepto }}<span class="sub">{{ m.categoria }}@if (m.referencia) { · {{ m.referencia }} }@if (m.anulado) { · anulado }</span></td>
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
        }
      }

      <section class="rx-card">
        <div class="rx-card-titulo"><mat-icon>history</mat-icon>{{ esRecepcion() ? 'Mis turnos' : 'Historial de turnos' }}</div>
        <div class="rx-toolbar">
          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput type="date" [(ngModel)]="desde" (change)="cargarHistorial(0)" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput type="date" [(ngModel)]="hasta" (change)="cargarHistorial(0)" />
          </mat-form-field>
        </div>
        @if (historial().length === 0) {
          <p class="rx-muted">No hay turnos en ese periodo.</p>
        } @else {
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Turno</th><th>Cajero</th><th>Apertura</th><th>Cierre</th><th class="derecha">Ingresos</th><th class="derecha">Entregado</th><th>Arqueo</th></tr></thead>
              <tbody>
                @for (h of historial(); track h.id) {
                  <tr class="clicable" (click)="verTurno(h)">
                    <td data-label="Turno"><strong>#{{ h.id }}</strong></td>
                    <td data-label="Cajero">{{ h.cajeroNombre }}</td>
                    <td data-label="Apertura">{{ fecha(h.fechaHoraApertura, true) }}</td>
                    <td data-label="Cierre">{{ h.fechaHoraCierre ? fecha(h.fechaHoraCierre, true) : 'Abierto' }}</td>
                    <td data-label="Ingresos" class="derecha rx-num">{{ moneda(h.totalIngresos) }}</td>
                    <td data-label="Entregado" class="derecha rx-num">{{ h.valorEntregado !== null ? moneda(h.valorEntregado) : '—' }}</td>
                    <td data-label="Arqueo">
                      @if (h.estado === 'ABIERTO') { <span class="rx-chip info">Abierto</span> }
                      @else if (h.diferencia === 0) { <span class="rx-chip ok">Cuadrado</span> }
                      @else if ((h.diferencia ?? 0) < 0) { <span class="rx-chip critico">Faltante {{ moneda(-(h.diferencia ?? 0)) }}</span> }
                      @else { <span class="rx-chip alerta">Sobrante {{ moneda(h.diferencia) }}</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="rx-paginacion">
              <span>{{ totalHistorial() }} turno(s) · página {{ pagina() + 1 }} de {{ totalPaginas() || 1 }}</span>
              <button mat-icon-button (click)="cargarHistorial(pagina() - 1)" [disabled]="pagina() === 0" aria-label="Anterior"><mat-icon>chevron_left</mat-icon></button>
              <button mat-icon-button (click)="cargarHistorial(pagina() + 1)" [disabled]="pagina() + 1 >= totalPaginas()" aria-label="Siguiente"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      </section>
    }
  `,
  styles: `
    .cerrada { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .cerrada .texto { flex: 1; min-width: 220px; }
    .cerrada h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .cerrada p { margin: 0.15rem 0; }
    .icono-estado { font-size: 2.4rem; width: 2.4rem; height: 2.4rem; color: #5b6660; }
    .aviso { color: #b26a00; font-size: 0.9rem; }
    .banner { display: flex; gap: 0.6rem; align-items: flex-start; background: #fff4e0; color: #6d4a00; border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1rem; }
    .destacado { border: 2px solid #2f6b4f; }
    .columnas { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 1rem; }
    .enlaces { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .sub { display: block; font-size: 0.78rem; color: #5b6660; }
    tr.anulado td { text-decoration: line-through; color: #8a948f; }
    .ancho { min-width: 200px; }
  `,
})
export class CajaComponent implements OnInit {
  private readonly caja = inject(CajaService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly router = inject(Router);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly etiquetaTipo = etiquetaTipoMovimientoTurno;
  readonly claseTipo = claseTipoMovimientoTurno;

  readonly cargando = signal(true);
  readonly estado = signal<EstadoCaja | null>(null);
  readonly movimientos = signal<MovimientoTurno[]>([]);
  readonly historial = signal<TurnoCaja[]>([]);
  readonly pagina = signal(0);
  readonly totalHistorial = signal(0);
  readonly totalPaginas = signal(0);
  desde = isoFecha(sumarDias(new Date(), -30));
  hasta = hoyIso();

  readonly esRecepcion = computed(() => this.auth.rol() === 'RECEPCION');
  readonly esAdmin = computed(() => this.auth.rol() === 'ADMIN');
  readonly puedeAbrir = computed(() => this.esRecepcion() || this.esAdmin());
  /** El cajero opera su turno; el administrador puede registrar retiros/aportes y cerrar cualquier turno. */
  readonly puedeOperar = computed(() => !!this.estado()?.esMio || this.esAdmin());

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.caja.estado().subscribe({
      next: (e) => {
        this.estado.set(e);
        this.cargando.set(false);
        const t = e.turnoAbierto;
        if (t && (e.esMio || !this.esRecepcion())) {
          this.caja.detalle(t.id).subscribe({ next: (d) => this.movimientos.set([...d.movimientos].reverse()) });
        } else {
          this.movimientos.set([]);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
    this.cargarHistorial(0);
  }

  cargarHistorial(pagina: number): void {
    this.caja.turnos({ desde: this.desde, hasta: this.hasta, pagina, tamano: 10 }).subscribe({
      next: (p) => {
        this.historial.set(p.contenido);
        this.pagina.set(p.pagina);
        this.totalHistorial.set(p.totalElementos);
        this.totalPaginas.set(p.totalPaginas);
      },
    });
  }

  abrir(): void {
    const e = this.estado();
    this.dialog
      .open(AbrirTurnoDialogComponent, { ...roomixDialogConfig({ width: '460px' }), data: { baseSugerida: e?.baseSugerida ?? null, ultimoCajero: e?.ultimoCajero ?? null } })
      .afterClosed()
      .subscribe((ok) => ok && this.cargar());
  }

  movimiento(tipo: TipoMovimiento): void {
    this.dialog
      .open(MovimientoCajaDialogComponent, { ...roomixDialogConfig({ width: '520px' }), data: tipo })
      .afterClosed()
      .subscribe((ok) => ok && this.cargar());
  }

  retiroAporte(): void {
    const t = this.estado()?.turnoAbierto;
    if (!t) return;
    this.dialog
      .open(RetiroAporteDialogComponent, { ...roomixDialogConfig({ width: '460px' }), data: t })
      .afterClosed()
      .subscribe((ok) => ok && this.cargar());
  }

  cerrar(): void {
    const e = this.estado();
    if (!e?.turnoAbierto) return;
    // Totales actualizados justo antes del arqueo
    this.caja.estado().subscribe((actual) => {
      if (!actual.turnoAbierto) return this.cargar();
      this.dialog
        .open(CerrarTurnoDialogComponent, {
          ...roomixDialogConfig({ width: '640px' }),
          data: { turno: actual.turnoAbierto, porAdministrador: !actual.esMio },
        })
        .afterClosed()
        .subscribe((turno?: TurnoCaja) => {
          if (turno) this.router.navigate(['/caja/turnos', turno.id]);
        });
    });
  }

  verTurno(t: TurnoCaja): void {
    this.router.navigate(['/caja/turnos', t.id]);
  }

  hora(valor: string): string {
    return new Date(valor).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }
}
