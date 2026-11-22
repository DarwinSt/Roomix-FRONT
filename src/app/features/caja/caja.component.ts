import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
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
import { Periodo, PeriodoSelectorComponent } from '../../shared/periodo/periodo-selector.component';
import {
  AbrirTurnoDialogComponent,
  CerrarTurnoDialogComponent,
  MovimientoCajaDialogComponent,
  RetiroAporteDialogComponent,
} from './caja-dialogs.component';
import { VentaDialogComponent } from '../ventas/venta-dialog.component';

const ICONO_TIPO: Record<MovimientoTurno['tipo'], string> = {
  INGRESO: 'trending_up', EGRESO: 'trending_down', RETIRO: 'outbox', APORTE: 'move_to_inbox',
};

/** Caja de la recepción: turno abierto con su efectivo y movimientos, acciones del cajero e historial de turnos. */
@Component({
  selector: 'app-caja',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, PeriodoSelectorComponent],
  template: `
    <div class="page-header row">
      <div>
        <h1>Caja</h1>
        <p>Base, cobros, ingresos y egresos del turno; arqueo y entrega de la caja al cerrar.</p>
      </div>
      @if (estado()?.turnoAbierto && puedeOperar()) {
        <button mat-stroked-button (click)="cerrar()"><mat-icon>lock</mat-icon>Cerrar turno</button>
      }
    </div>

    @if (cargando() && !estado()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (estado(); as e) {
      @if (!e.turnoAbierto) {
        <!-- Caja cerrada -->
        <section class="turno cerrado">
          <span class="sello"><mat-icon>lock</mat-icon></span>
          <div class="texto">
            <span class="rx-chip neutro">Caja cerrada</span>
            <h2>{{ puedeAbrir() ? 'Abra su turno para empezar a cobrar' : 'No hay un turno abierto' }}</h2>
            @if (e.ultimoCierre) {
              <p>Último cierre: <strong>{{ e.ultimoCajero }}</strong>, {{ fecha(e.ultimoCierre, true) }}. Dejó una base de
                <strong>{{ moneda(e.baseSugerida) }}</strong>.</p>
            } @else {
              <p>Aún no se ha abierto ningún turno en este hotel.</p>
            }
            @if (esRecepcion()) {
              <p class="nota"><mat-icon>info</mat-icon>Las reservas con pago, los abonos, los pagos de facturas y las ventas necesitan un turno abierto.</p>
            }
          </div>
          @if (puedeAbrir()) {
            <button mat-flat-button color="primary" class="boton-grande" (click)="abrir()"><mat-icon>lock_open</mat-icon>Abrir turno</button>
          }
        </section>
      } @else if (e.turnoAbierto; as t) {
        @if (!e.esMio) {
          <div class="aviso"><mat-icon>person</mat-icon>
            <span>La caja está a cargo de <strong>{{ t.cajeroNombre }}</strong> desde {{ fecha(t.fechaHoraApertura, true) }}.
              @if (esRecepcion()) { Para cobrar, esa persona debe cerrar su turno y entregarle la caja. }
              @if (esAdmin()) { Como administrador puede registrar retiros o aportes y cerrar el turno si es necesario. }
            </span>
          </div>
        }
        @if (e.esMio || !esRecepcion()) {
          <!-- Turno abierto: el efectivo es el dato principal -->
          <section class="turno abierto">
            <div class="cabecera">
              <div class="cajero">
                <span class="avatar">{{ iniciales(t.cajeroNombre) }}</span>
                <div>
                  <span class="rx-chip ok"><span class="punto"></span>Turno #{{ t.id }} abierto</span>
                  <strong>{{ t.cajeroNombre }}</strong>
                  <span class="desde">Desde {{ fecha(t.fechaHoraApertura, true) }} · {{ duracion(t.fechaHoraApertura) }}</span>
                </div>
              </div>
              <div class="efectivo">
                <span>Efectivo que debe haber en caja</span>
                <strong>{{ moneda(t.efectivoEsperado) }}</strong>
              </div>
            </div>

            <div class="cifras">
              <div><span>Base inicial</span><strong>{{ moneda(t.baseInicial) }}</strong></div>
              <div><span>Ingresos</span><strong [class.positivo]="t.totalIngresos > 0">{{ t.totalIngresos > 0 ? '+' : '' }}{{ moneda(t.totalIngresos) }}</strong><small>En efectivo {{ moneda(t.ingresosEfectivo) }}</small></div>
              <div><span>Egresos</span><strong [class.negativo]="t.totalEgresos > 0">{{ t.totalEgresos > 0 ? '−' : '' }}{{ moneda(t.totalEgresos) }}</strong><small>En efectivo {{ moneda(t.egresosEfectivo) }}</small></div>
              <div><span>Retiros · aportes</span><strong>{{ moneda(t.retiros) }} · {{ moneda(t.aportes) }}</strong><small>Efectivo que salió o entró</small></div>
            </div>

            @if (puedeOperar()) {
              <div class="acciones">
                @if (puedeVender()) {
                  <button type="button" class="accion principal" (click)="vender()">
                    <mat-icon>storefront</mat-icon><span>Vender productos</span><small>Tienda y minibar</small>
                  </button>
                }
                <button type="button" class="accion" (click)="movimiento('INGRESO')">
                  <mat-icon>add_card</mat-icon><span>Registrar ingreso</span><small>Dinero que entra</small>
                </button>
                <button type="button" class="accion" (click)="movimiento('EGRESO')">
                  <mat-icon>money_off</mat-icon><span>Registrar egreso</span><small>Un pago o gasto</small>
                </button>
                <button type="button" class="accion" (click)="retiroAporte()">
                  <mat-icon>swap_vert</mat-icon><span>Retiro o aporte</span><small>Sacar o meter efectivo</small>
                </button>
              </div>
            }
          </section>

          <div class="columnas">
            <section class="rx-card">
              <div class="rx-card-cabecera">
                <mat-icon>receipt_long</mat-icon>
                <div class="rx-titulos">
                  <h2>Movimientos del turno</h2>
                  <p>{{ movimientos().length }} {{ movimientos().length === 1 ? 'registro' : 'registros' }} · lo más reciente arriba</p>
                </div>
                <div class="rx-card-acciones">
                  <a mat-button [routerLink]="['/caja/turnos', t.id]"><mat-icon>print</mat-icon>Ver o imprimir</a>
                </div>
              </div>
              @if (movimientos().length === 0) {
                <div class="rx-vacio-seccion">
                  <mat-icon>receipt</mat-icon>
                  <strong>Todavía no hay movimientos</strong>
                  Los abonos de reservas, los pagos de facturas y las ventas entran solos a este turno.
                </div>
              } @else {
                <ul class="movimientos">
                  @for (m of movimientos(); track m.origen + m.id) {
                    <li [class.anulado]="m.anulado">
                      <span class="icono" [class]="claseTipo(m.tipo)"><mat-icon>{{ iconoTipo(m.tipo) }}</mat-icon></span>
                      <div class="texto">
                        <strong>{{ m.concepto }}</strong>
                        <span>{{ etiquetaTipo(m.tipo) }} · {{ m.categoria }} · {{ m.metodoNombre }}@if (m.referencia) { · {{ m.referencia }} }</span>
                        <span>{{ m.registradoPor }}@if (m.anulado) { · <b>Anulado</b> }</span>
                      </div>
                      <div class="valor">
                        <strong [class]="sale(m.tipo) ? 'negativo' : 'positivo'">{{ sale(m.tipo) ? '−' : '+' }}{{ moneda(m.valor) }}</strong>
                        <span>{{ hora(m.fechaHora) }}</span>
                      </div>
                    </li>
                  }
                </ul>
              }
            </section>

            <div class="lateral">
              <section class="rx-card">
                <div class="rx-card-cabecera">
                  <mat-icon>credit_card</mat-icon>
                  <div class="rx-titulos"><h2>Por medio de pago</h2><p>Lo que entró y salió en el turno</p></div>
                </div>
                @if (t.totalesPorMedio.length === 0) {
                  <p class="rx-muted">Sin pagos todavía.</p>
                } @else {
                  <ul class="medios">
                    @for (m of t.totalesPorMedio; track m.metodo) {
                      <li>
                        <div class="fila"><span>{{ m.nombre }}</span><strong>{{ moneda(m.neto) }}</strong></div>
                        <div class="barra"><span [style.width.%]="proporcion(m.neto, t)"></span></div>
                        <small>Entró {{ moneda(m.ingresos) }} · salió {{ moneda(m.egresos) }}</small>
                      </li>
                    }
                  </ul>
                }
              </section>
              <section class="rx-card">
                <div class="rx-card-cabecera">
                  <mat-icon>bolt</mat-icon>
                  <div class="rx-titulos"><h2>Cobrar</h2><p>Los pagos registrados allí entran a este turno</p></div>
                </div>
                <nav class="accesos">
                  <a routerLink="/facturas" [queryParams]="{ estado: 'PENDIENTE' }"><mat-icon>receipt_long</mat-icon>Facturas por cobrar<mat-icon class="flecha">chevron_right</mat-icon></a>
                  <a routerLink="/reservas"><mat-icon>event_note</mat-icon>Reservas y abonos<mat-icon class="flecha">chevron_right</mat-icon></a>
                  @if (puedeVender()) {
                    <a routerLink="/ventas"><mat-icon>storefront</mat-icon>Ventas del día<mat-icon class="flecha">chevron_right</mat-icon></a>
                  }
                </nav>
              </section>
            </div>
          </div>
        }
      }

      <!-- Historial -->
      <section class="rx-card">
        <div class="rx-card-cabecera">
          <mat-icon>history</mat-icon>
          <div class="rx-titulos">
            <h2>{{ esRecepcion() ? 'Mis turnos' : 'Historial de turnos' }}</h2>
            <p>Toque un turno para ver su arqueo, sus movimientos o imprimirlo.</p>
          </div>
          <div class="rx-card-acciones periodo"><rx-periodo inicial="30" (cambio)="cambiarPeriodo($event)" /></div>
        </div>
        @if (errorHistorial()) {
          <div class="rx-vacio-seccion error">
            <mat-icon>error_outline</mat-icon>
            <strong>No se pudo cargar el historial</strong>
            {{ errorHistorial() }}
            <button mat-stroked-button (click)="cargarHistorial(pagina())"><mat-icon>refresh</mat-icon>Reintentar</button>
          </div>
        } @else if (cargandoHistorial() && historial().length === 0) {
          <div class="rx-cargando"><mat-spinner diameter="32" /></div>
        } @else if (historial().length === 0) {
          <div class="rx-vacio-seccion">
            <mat-icon>event_busy</mat-icon>
            <strong>No hay turnos en ese periodo</strong>
            Pruebe con otro rango de fechas.
          </div>
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
              <span>{{ totalHistorial() }} {{ totalHistorial() === 1 ? 'turno' : 'turnos' }} · página {{ pagina() + 1 }} de {{ totalPaginas() || 1 }}</span>
              <button mat-icon-button (click)="cargarHistorial(pagina() - 1)" [disabled]="pagina() === 0" aria-label="Anterior"><mat-icon>chevron_left</mat-icon></button>
              <button mat-icon-button (click)="cargarHistorial(pagina() + 1)" [disabled]="pagina() + 1 >= totalPaginas()" aria-label="Siguiente"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      </section>
    }
  `,
  styles: `
    .page-header button mat-icon, .boton-grande mat-icon { margin-right: 0.25rem; }

    // ---------------------------------------------------------- Tarjeta del turno
    .turno {
      background: #fff; border: 1px solid var(--bg-300); border-radius: 16px; box-shadow: var(--roomix-shadow);
      padding: 1.25rem 1.4rem; margin-bottom: 1.25rem;
    }
    .turno.cerrado { display: flex; align-items: center; gap: 1.1rem; flex-wrap: wrap; }
    .turno.cerrado .texto { flex: 1 1 280px; min-width: 0; }
    .turno.cerrado h2 { margin: 0.4rem 0 0.25rem; font-size: 1.2rem; color: var(--text-strong); }
    .turno.cerrado p { margin: 0.15rem 0; color: var(--text-100); font-size: 0.9rem; }
    .sello { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; background: var(--bg-200); color: var(--text-200); flex-shrink: 0; }
    .sello mat-icon { font-size: 1.8rem; width: 1.8rem; height: 1.8rem; }
    .nota { display: flex; align-items: center; gap: 0.35rem; color: #8a5a00 !important; font-size: 0.85rem !important; }
    .nota mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; flex-shrink: 0; }
    .boton-grande { min-height: 48px; padding: 0 1.4rem; font-size: 1rem; }

    .turno.abierto { background: linear-gradient(135deg, rgba(var(--primary-100-rgb), 0.38), #fff 58%); }
    .cabecera { display: flex; justify-content: space-between; align-items: center; gap: 1rem 2rem; flex-wrap: wrap; }
    .cajero { display: flex; align-items: center; gap: 0.85rem; min-width: 0; }
    .cajero > div { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; min-width: 0; }
    .cajero strong { font-size: 1.08rem; color: var(--text-strong); }
    .desde { font-size: 0.82rem; color: var(--text-200); }
    .avatar {
      display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
      background: var(--roomix-gradient-toolbar); color: #fff; font-weight: 700; letter-spacing: 0.02em;
    }
    .punto { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: latido 1.8s ease-in-out infinite; }
    @keyframes latido { 50% { opacity: 0.35; } }
    .efectivo { display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
    .efectivo span { font-size: 0.8rem; font-weight: 600; color: var(--text-200); text-transform: uppercase; letter-spacing: 0.04em; }
    .efectivo strong { font-size: clamp(1.7rem, 1.2rem + 1.3vw, 2.35rem); font-weight: 800; color: var(--text-strong); line-height: 1.1;
      font-variant-numeric: tabular-nums; }

    .cifras { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem 1.25rem; margin-top: 1.15rem; padding-top: 1rem;
      border-top: 1px solid rgba(var(--primary-300-rgb), 0.14); }
    .cifras > div { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .cifras span { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-200); }
    .cifras strong { font-size: 1.08rem; color: var(--text-strong); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .cifras small { font-size: 0.76rem; color: var(--text-200); }
    .positivo { color: #2e7d32 !important; }
    .negativo { color: #b3261e !important; }

    .acciones { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(170px, 100%), 1fr)); gap: 0.65rem; margin-top: 1.15rem; }
    .accion {
      display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 0.65rem; align-items: center;
      padding: 0.75rem 0.9rem; border: 1.5px solid var(--bg-300); border-radius: 14px; background: #fff; color: var(--text-strong);
      font: inherit; text-align: left; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    }
    .accion mat-icon { grid-row: 1 / 3; display: grid; place-items: center; box-sizing: content-box; padding: 0.45rem; border-radius: 11px;
      background: rgba(var(--primary-100-rgb), 0.45); color: var(--primary-400); }
    .accion span { font-weight: 600; font-size: 0.92rem; }
    .accion small { font-size: 0.76rem; color: var(--text-200); }
    .accion:hover { border-color: rgba(var(--primary-300-rgb), 0.55); box-shadow: var(--roomix-shadow-hover); transform: translateY(-1px); }
    .accion:focus-visible { outline: 2px solid var(--primary-300); outline-offset: 2px; }
    .accion.principal { background: var(--primary-300); border-color: var(--primary-300); color: #fff; }
    .accion.principal mat-icon { background: rgba(255, 255, 255, 0.18); color: #fff; }
    .accion.principal small { color: rgba(255, 255, 255, 0.82); }

    .aviso { display: flex; gap: 0.6rem; align-items: flex-start; background: #fff4e0; color: #6d4a00; border: 1px solid rgba(178, 106, 0, 0.2);
      border-radius: 12px; padding: 0.8rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; }

    // ---------------------------------------------------------- Movimientos y medios
    .columnas { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(280px, 1fr); gap: 1.25rem; align-items: start; }
    .columnas > .rx-card, .lateral > .rx-card:last-child { margin-bottom: 1.25rem; }
    .lateral { display: flex; flex-direction: column; min-width: 0; }

    .movimientos { list-style: none; margin: 0; padding: 0; }
    .movimientos li { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.7rem 0; border-bottom: 1px solid var(--bg-200); }
    .movimientos li:last-child { border-bottom: 0; padding-bottom: 0; }
    .movimientos li.anulado { opacity: 0.55; }
    .movimientos li.anulado .texto strong, .movimientos li.anulado .valor strong { text-decoration: line-through; }
    .movimientos .icono { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; background: var(--bg-200); }
    .movimientos .icono mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
    .movimientos .icono.ok { background: rgba(46, 125, 50, 0.1); color: #2e7d32; }
    .movimientos .icono.critico { background: rgba(179, 38, 30, 0.08); color: #b3261e; }
    .movimientos .icono.alerta { background: rgba(245, 196, 85, 0.3); color: #7a5600; }
    .movimientos .icono.info { background: rgba(42, 120, 214, 0.12); color: #1d4f8c; }
    .movimientos .texto { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.05rem; }
    .movimientos .texto strong { font-size: 0.9rem; color: var(--text-strong); overflow-wrap: anywhere; }
    .movimientos .texto span { font-size: 0.78rem; color: var(--text-200); overflow-wrap: anywhere; }
    .movimientos .valor { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
    .movimientos .valor strong { font-size: 0.95rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .movimientos .valor span { font-size: 0.76rem; color: var(--text-200); }

    .medios { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.85rem; }
    .medios .fila { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.9rem; }
    .medios .fila strong { font-variant-numeric: tabular-nums; color: var(--text-strong); }
    .medios .barra { height: 6px; border-radius: 999px; background: var(--bg-200); overflow: hidden; margin: 0.3rem 0 0.2rem; }
    .medios .barra span { display: block; height: 100%; border-radius: 999px; background: var(--primary-300); }
    .medios small { font-size: 0.76rem; color: var(--text-200); }

    .accesos { display: flex; flex-direction: column; }
    .accesos a { display: flex; align-items: center; gap: 0.65rem; padding: 0.65rem 0.4rem; border-radius: 10px; color: var(--text-strong);
      text-decoration: none; font-size: 0.9rem; font-weight: 500; }
    .accesos a + a { border-top: 1px solid var(--bg-200); }
    .accesos a:hover { background: rgba(var(--primary-100-rgb), 0.25); }
    .accesos mat-icon { color: var(--primary-300); }
    .accesos .flecha { margin-left: auto; color: var(--text-200); }

    .periodo { flex: 0 1 auto; }
    .rx-vacio-seccion button { margin-top: 0.5rem; }

    @media (max-width: 960px) {
      .columnas { grid-template-columns: minmax(0, 1fr); gap: 0; }
    }
    @media (max-width: 640px) {
      .turno { padding: 1rem; }
      .efectivo { align-items: flex-start; text-align: left; }
      .cifras { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .page-header button { width: 100%; }
      .acciones { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .accion { grid-template-columns: 1fr; row-gap: 0.35rem; }
      .accion mat-icon { grid-row: auto; justify-self: start; }
      .accion.principal { grid-column: 1 / -1; }
    }
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
  readonly cargandoHistorial = signal(false);
  readonly errorHistorial = signal<string | null>(null);
  readonly pagina = signal(0);
  readonly totalHistorial = signal(0);
  readonly totalPaginas = signal(0);
  private desde = isoFecha(sumarDias(new Date(), -29));
  private hasta = hoyIso();

  readonly esRecepcion = computed(() => this.auth.rol() === 'RECEPCION');
  readonly esAdmin = computed(() => this.auth.rol() === 'ADMIN');
  readonly puedeAbrir = computed(() => this.auth.puede('CAJA_OPERAR'));
  /** El cajero opera su turno; el administrador puede registrar retiros/aportes y cerrar cualquier turno. */
  readonly puedeOperar = computed(() => !!this.estado()?.esMio || this.esAdmin());
  readonly puedeVender = computed(() => this.auth.puede('VENTAS'));

  ngOnInit(): void {
    // El historial lo pide el selector de periodo al aparecer
    this.cargar(false);
  }

  cargar(conHistorial = true): void {
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
    if (conHistorial) this.cargarHistorial(0);
  }

  cambiarPeriodo(p: Periodo): void {
    this.desde = p.desde;
    this.hasta = p.hasta;
    this.cargarHistorial(0);
  }

  cargarHistorial(pagina: number): void {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set(null);
    this.caja.turnos({ desde: this.desde, hasta: this.hasta, pagina, tamano: 10 }).subscribe({
      next: (p) => {
        this.historial.set(p.contenido);
        this.pagina.set(p.pagina);
        this.totalHistorial.set(p.totalElementos);
        this.totalPaginas.set(p.totalPaginas);
        this.cargandoHistorial.set(false);
      },
      // Antes un error se veía como «No hay turnos»; ahora se dice que falló y se puede reintentar
      error: () => {
        this.cargandoHistorial.set(false);
        this.errorHistorial.set('Revise la conexión e intente de nuevo. Si sigue fallando, avise al administrador.');
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
      .open(MovimientoCajaDialogComponent, { ...roomixDialogConfig({ width: '560px' }), data: tipo })
      .afterClosed()
      .subscribe((r?: boolean | 'vender') => {
        if (r === 'vender') this.vender();
        else if (r) this.cargar();
      });
  }

  /** Venta de productos del inventario: de contado entra a este turno. */
  vender(): void {
    this.dialog
      .open(VentaDialogComponent, { ...roomixDialogConfig({ width: '980px' }), data: null })
      .afterClosed()
      .subscribe((v) => v && this.cargar());
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

  iconoTipo(tipo: MovimientoTurno['tipo']): string {
    return ICONO_TIPO[tipo];
  }

  /** Egresos y retiros restan del efectivo. */
  sale(tipo: MovimientoTurno['tipo']): boolean {
    return tipo === 'EGRESO' || tipo === 'RETIRO';
  }

  /** Ancho de la barra de un medio de pago respecto al mayor neto del turno. */
  proporcion(neto: number, t: TurnoCaja): number {
    const mayor = Math.max(...t.totalesPorMedio.map((m) => Math.abs(m.neto)), 1);
    return Math.max(2, Math.round((Math.max(neto, 0) / mayor) * 100));
  }

  iniciales(nombre: string): string {
    return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  }

  /** «hace 3 h 20 min» desde la apertura. */
  duracion(desde: string): string {
    const minutos = Math.max(0, Math.round((Date.now() - new Date(desde).getTime()) / 60_000));
    if (minutos < 1) return 'recién abierto';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h${minutos % 60 ? ' ' + (minutos % 60) + ' min' : ''}`;
    const dias = Math.floor(horas / 24);
    return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  hora(valor: string): string {
    return new Date(valor).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }
}
