import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventoService, ReporteService } from '../../core/services/modulos.service';
import { ErrorDialogService } from '../../core/services/error-dialog.service';
import { AuthService } from '../../core/services/auth.service';
import { GrupoReporte, ReporteOcupacion } from '../../core/models/dashboard.model';
import { TIPOS_HABITACION } from '../../core/models/habitacion.model';
import { ReporteEventos, etiquetaEstadoEvento, ESTADOS_EVENTO } from '../../core/models/evento.model';
import { descargarCsv, fechaCorta, moneda, porcentaje } from '../../core/utils/formato.util';
import { COLORES_SERIE, GraficoComponent } from '../../shared/charts/grafico.component';
import { BarrasHorizontalesComponent, ItemBarra } from '../../shared/charts/barras-horizontales.component';
import { Periodo, PeriodoSelectorComponent } from '../../shared/periodo/periodo-selector.component';

type Metrica = 'ocupacion' | 'ingreso';

@Component({
  selector: 'app-reportes',
  imports: [MatButtonModule, MatButtonToggleModule, MatIconModule, MatProgressSpinnerModule, GraficoComponent, BarrasHorizontalesComponent, PeriodoSelectorComponent],
  template: `
    <div class="page-header row">
      <div>
        <h1>Reportes y analítica</h1>
        <p>Indicadores hoteleros del periodo: ocupación, tarifa promedio (ADR), ingreso por habitación disponible (RevPAR), canales y eventos.</p>
      </div>
      <div class="rx-acciones no-imprimir">
        <button mat-stroked-button (click)="exportar()" [disabled]="!reporte()"><mat-icon>download</mat-icon>CSV</button>
        <button mat-stroked-button (click)="imprimir()"><mat-icon>print</mat-icon>Imprimir</button>
      </div>
    </div>

    <div class="rx-toolbar no-imprimir">
      <rx-periodo inicial="30" (cambio)="cambiarPeriodo($event)" />
    </div>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (reporte(); as r) {
      <p class="solo-imprimir">Periodo {{ fecha(r.desde) }} – {{ fecha(r.hasta) }}</p>
      <div class="rx-kpis">
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>hotel</mat-icon>Ocupación</span><span class="rx-kpi-valor">{{ pct(r.ocupacionPct) }}</span>
          <span class="rx-kpi-sub">{{ r.nochesVendidas }} de {{ r.nochesDisponibles }} noches</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>sell</mat-icon>ADR</span><span class="rx-kpi-valor">{{ moneda(r.adr) }}</span>
          <span class="rx-kpi-sub">Tarifa promedio por noche vendida</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>query_stats</mat-icon>RevPAR</span><span class="rx-kpi-valor">{{ moneda(r.revpar) }}</span>
          <span class="rx-kpi-sub">Ingreso por habitación disponible</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>payments</mat-icon>Alojamiento</span><span class="rx-kpi-valor">{{ moneda(r.ingresoAlojamiento) }}</span>
          <span class="rx-kpi-sub">{{ r.reservas }} reservas · {{ r.estanciaPromedioNoches }} noches prom.</span></div>
        <div class="rx-kpi" [class.rx-kpi--alerta]="r.tasaCancelacionPct > 15"><span class="rx-kpi-etiqueta"><mat-icon>event_busy</mat-icon>Cancelaciones</span>
          <span class="rx-kpi-valor">{{ pct(r.tasaCancelacionPct) }}</span><span class="rx-kpi-sub">{{ r.cancelaciones }} reservas canceladas</span></div>
      </div>

      <section class="rx-card">
        <div class="rx-card-titulo">
          <mat-icon>show_chart</mat-icon>{{ metrica() === 'ocupacion' ? 'Ocupación diaria' : 'Ingreso diario por alojamiento' }}
          <span class="spacer"></span>
          <mat-button-toggle-group class="no-imprimir" [value]="metrica()" (change)="metrica.set($event.value)">
            <mat-button-toggle value="ocupacion">Ocupación</mat-button-toggle>
            <mat-button-toggle value="ingreso">Ingreso</mat-button-toggle>
          </mat-button-toggle-group>
        </div>
        <rx-grafico [tipo]="metrica() === 'ocupacion' ? 'linea' : 'barras'" [etiquetas]="etiquetas()" [series]="series()"
                    [formato]="metrica() === 'ocupacion' ? pctFmt : moneda" [maximoFijo]="metrica() === 'ocupacion' ? 100 : null"
                    [alto]="250" [descripcion]="metrica() === 'ocupacion' ? 'Porcentaje de ocupación por día' : 'Ingreso de alojamiento por día'" />
      </section>

      <div class="rx-grid-2">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>alt_route</mat-icon>Reservas por canal</div>
          <rx-barras-horizontales [items]="barras(r.porCanal, 'reservas')" [color]="colores.marca" [formato]="moneda" />
        </section>
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>bed</mat-icon>Ingreso por tipo de habitación</div>
          <rx-barras-horizontales [items]="barras(tiposLegibles(r.porTipoHabitacion), 'reservas')" [color]="colores.marca" [formato]="moneda" />
        </section>
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>public</mat-icon>Procedencia de huéspedes</div>
          <rx-barras-horizontales [items]="cantidades(r.porProcedencia, 'huéspedes')" [color]="colores.ingresos" />
        </section>
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>room_service</mat-icon>Servicios más vendidos</div>
          <rx-barras-horizontales [items]="barras(r.serviciosMasVendidos, 'unid.')" [color]="colores.ingresos" [formato]="moneda" />
        </section>
      </div>

      @if (eventos(); as ev) {
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>celebration</mat-icon>Eventos del periodo</div>
          <div class="rx-kpis compactos">
            <div class="rx-kpi"><span class="rx-kpi-etiqueta">Eventos</span><span class="rx-kpi-valor">{{ ev.totalEventos }}</span></div>
            <div class="rx-kpi"><span class="rx-kpi-etiqueta">Inscritos / asistentes</span><span class="rx-kpi-valor">{{ ev.totalInscritos }} / {{ ev.totalAsistentes }}</span></div>
            <div class="rx-kpi"><span class="rx-kpi-etiqueta">Valor contratado</span><span class="rx-kpi-valor">{{ moneda(ev.valorTotal) }}</span></div>
            <div class="rx-kpi"><span class="rx-kpi-etiqueta">Facturado / recaudado</span><span class="rx-kpi-valor">{{ moneda(ev.facturado) }} / {{ moneda(ev.recaudado) }}</span></div>
          </div>
          <div class="estados">
            @for (e of estadosEvento; track e.value) {
              <span class="rx-chip neutro">{{ etiquetaEvento(e.value) }}: {{ ev.porEstado[e.value] ?? 0 }}</span>
            }
          </div>
          @if (ev.porSalon.length > 0) {
            <div class="rx-tabla-wrap">
              <table class="rx-tabla">
                <thead><tr><th>Salón</th><th class="derecha">Eventos</th><th class="derecha">Participantes</th><th class="derecha">Valor</th></tr></thead>
                <tbody>
                  @for (s of ev.porSalon; track s.salon) {
                    <tr>
                      <td data-label="Salón" class="ancho">{{ s.salon }}</td>
                      <td data-label="Eventos" class="derecha">{{ s.eventos }}</td>
                      <td data-label="Participantes" class="derecha">{{ s.participantes }}</td>
                      <td data-label="Valor" class="derecha rx-num">{{ moneda(s.valor) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    }
  `,
  styles: `
    .rx-card-titulo { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .spacer { flex: 1; }
    .compactos { margin-bottom: 0.75rem; }
    .estados { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
  `,
})
export class ReportesComponent {
  private readonly reportes = inject(ReporteService);
  private readonly eventosService = inject(EventoService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly auth = inject(AuthService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly pct = (v: number) => porcentaje(v);
  readonly pctFmt = (v: number) => porcentaje(v, 0);
  readonly colores = COLORES_SERIE;
  readonly estadosEvento = ESTADOS_EVENTO;
  readonly etiquetaEvento = etiquetaEstadoEvento;

  readonly cargando = signal(true);
  readonly reporte = signal<ReporteOcupacion | null>(null);
  readonly eventos = signal<ReporteEventos | null>(null);
  readonly metrica = signal<Metrica>('ocupacion');
  private periodo: Periodo | null = null;

  readonly etiquetas = computed(() => (this.reporte()?.serie ?? []).map((p) => fechaCorta(p.fecha).slice(0, 5)));
  readonly series = computed(() => {
    const serie = this.reporte()?.serie ?? [];
    return this.metrica() === 'ocupacion'
      ? [{ nombre: 'Ocupación', color: COLORES_SERIE.marca, valores: serie.map((p) => p.ocupacionPct) }]
      : [{ nombre: 'Ingreso', color: COLORES_SERIE.ingresos, valores: serie.map((p) => p.ingreso) }];
  });

  cambiarPeriodo(p: Periodo): void {
    this.periodo = p;
    this.cargando.set(true);
    const verEventos = this.auth.tieneRol('ADMIN', 'FINANZAS');
    forkJoin({
      ocupacion: this.reportes.ocupacion(p.desde, p.hasta),
      ...(verEventos ? { eventos: this.eventosService.reporte(p.desde, p.hasta) } : {}),
    }).subscribe({
      next: (r: { ocupacion: ReporteOcupacion; eventos?: ReporteEventos }) => {
        this.reporte.set(r.ocupacion);
        this.eventos.set(r.eventos ?? null);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  barras(grupos: GrupoReporte[], unidad: string): ItemBarra[] {
    return grupos.map((g) => ({ etiqueta: g.nombre, valor: Number(g.valor), detalle: `${g.cantidad} ${unidad}` }));
  }

  tiposLegibles(grupos: GrupoReporte[]): GrupoReporte[] {
    return grupos.map((g) => ({ ...g, nombre: TIPOS_HABITACION.find((t) => t.value === g.nombre)?.label ?? g.nombre }));
  }

  cantidades(grupos: GrupoReporte[], unidad: string): ItemBarra[] {
    return grupos.map((g) => ({ etiqueta: g.nombre, valor: g.cantidad, detalle: unidad }));
  }

  imprimir(): void {
    window.print();
  }

  exportar(): void {
    const r = this.reporte();
    if (!r) return;
    const filas: (string | number)[][] = [
      ['Indicador', 'Ocupación %', r.ocupacionPct],
      ['Indicador', 'ADR', r.adr],
      ['Indicador', 'RevPAR', r.revpar],
      ['Indicador', 'Ingreso alojamiento', r.ingresoAlojamiento],
      ['Indicador', 'Reservas', r.reservas],
      ['Indicador', 'Cancelaciones', r.cancelaciones],
      ...r.serie.map((p) => ['Día ' + p.fecha, 'Ocupación % / Ingreso', `${p.ocupacionPct} / ${p.ingreso}`]),
      ...r.porCanal.map((g) => ['Canal', g.nombre, g.valor]),
      ...r.porTipoHabitacion.map((g) => ['Tipo de habitación', g.nombre, g.valor]),
      ...r.porProcedencia.map((g) => ['Procedencia', g.nombre, g.cantidad]),
      ...r.serviciosMasVendidos.map((g) => ['Servicio', g.nombre, g.valor]),
    ];
    descargarCsv(`reporte-${this.periodo?.desde}-${this.periodo?.hasta}.csv`, ['Sección', 'Concepto', 'Valor'], filas);
  }
}
