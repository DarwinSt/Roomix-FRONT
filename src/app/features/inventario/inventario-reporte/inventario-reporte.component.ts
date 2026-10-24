import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventarioService } from '../../../core/services/inventario.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { MovimientoInventario, ResumenInventario, TipoMovimientoStock } from '../../../core/models/inventario.model';
import { descargarCsv, fechaCorta, isoFecha, moneda, sumarDias } from '../../../core/utils/formato.util';
import { COLORES_SERIE } from '../../../shared/charts/grafico.component';
import { BarrasHorizontalesComponent, ItemBarra } from '../../../shared/charts/barras-horizontales.component';

/** Valorización del inventario, artículos críticos, más usados y movimientos recientes. */
@Component({
  selector: 'app-inventario-reporte',
  imports: [RouterLink, MatButtonModule, MatButtonToggleModule, MatIconModule, MatProgressSpinnerModule, BarrasHorizontalesComponent],
  template: `
    <div class="page-header row">
      <div>
        <h1>Reporte de inventario</h1>
        <p>Valor del inventario, artículos bajo el mínimo y consumo del periodo.</p>
      </div>
      <div class="rx-acciones">
        <a mat-stroked-button routerLink="/inventario"><mat-icon>arrow_back</mat-icon>Inventario</a>
        <button mat-stroked-button (click)="exportar()" [disabled]="movimientos().length === 0"><mat-icon>download</mat-icon>Movimientos CSV</button>
      </div>
    </div>

    <div class="rx-toolbar">
      <mat-button-toggle-group [value]="dias()" (change)="cambiarDias($event.value)">
        <mat-button-toggle [value]="7">7 días</mat-button-toggle>
        <mat-button-toggle [value]="30">30 días</mat-button-toggle>
        <mat-button-toggle [value]="90">90 días</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (resumen(); as r) {
      <div class="rx-kpis">
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>savings</mat-icon>Valor del inventario</span><span class="rx-kpi-valor">{{ moneda(r.valorTotal) }}</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>inventory_2</mat-icon>Artículos activos</span><span class="rx-kpi-valor">{{ r.articulosActivos }}</span></div>
        <div class="rx-kpi" [class.rx-kpi--alerta]="r.totalCriticos > 0"><span class="rx-kpi-etiqueta"><mat-icon>warning</mat-icon>Bajo el mínimo</span><span class="rx-kpi-valor">{{ r.totalCriticos }}</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>shopping_cart</mat-icon>Compras del periodo</span><span class="rx-kpi-valor">{{ moneda(totalCompras()) }}</span></div>
      </div>
      @if (r.articulosSinPrecio > 0) {
        <p class="rx-muted">{{ r.articulosSinPrecio }} artículo(s) sin precio unitario no suman a la valorización.</p>
      }

      <div class="rx-grid-2">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>category</mat-icon>Valor por categoría</div>
          <rx-barras-horizontales [items]="porCategoria()" [color]="colores.marca" [formato]="moneda" />
        </section>
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>trending_down</mat-icon>Más usados (últimos {{ r.diasAnalizados }} días)</div>
          <rx-barras-horizontales [items]="masUsados()" [color]="colores.egresos" [formato]="unidades" />
        </section>
      </div>

      <section class="rx-card">
        <div class="rx-card-titulo"><mat-icon>report</mat-icon>Artículos críticos</div>
        @if (r.criticos.length === 0) {
          <p class="rx-muted">Todos los artículos están por encima de su stock mínimo.</p>
        } @else {
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Artículo</th><th>Categoría</th><th class="derecha">Stock</th><th class="derecha">Mínimo</th><th>Proveedor</th></tr></thead>
              <tbody>
                @for (a of r.criticos; track a.id) {
                  <tr>
                    <td data-label="Artículo" class="ancho"><strong>{{ a.nombre }}</strong></td>
                    <td data-label="Categoría">{{ a.categoria.nombre }}</td>
                    <td data-label="Stock" class="derecha"><span class="rx-chip critico">{{ a.cantidad }}</span></td>
                    <td data-label="Mínimo" class="derecha">{{ a.cantidadMinima }}</td>
                    <td data-label="Proveedor">{{ a.proveedor ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <section class="rx-card">
        <div class="rx-card-titulo"><mat-icon>swap_vert</mat-icon>Movimientos del periodo ({{ totalMovimientos() }})</div>
        @if (movimientos().length === 0) {
          <p class="rx-muted">Sin movimientos.</p>
        } @else {
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Fecha</th><th>Artículo</th><th>Tipo</th><th class="derecha">Cantidad</th><th class="derecha">Stock</th><th>Detalle</th><th>Usuario</th></tr></thead>
              <tbody>
                @for (m of movimientos(); track m.id) {
                  <tr>
                    <td data-label="Fecha">{{ fecha(m.fechaHora, true) }}</td>
                    <td data-label="Artículo" class="ancho">{{ m.articuloNombre }}</td>
                    <td data-label="Tipo"><span class="rx-chip {{ claseTipo(m.tipo) }}">{{ etiquetaTipo(m.tipo) }}</span></td>
                    <td data-label="Cantidad" class="derecha">{{ m.cantidad }}</td>
                    <td data-label="Stock" class="derecha">{{ m.stockAnterior }} → {{ m.stockResultante }}</td>
                    <td data-label="Detalle">{{ m.motivo ?? '' }}@if (m.proveedor) { · {{ m.proveedor }} }@if (m.costoUnitario) { · {{ moneda(m.costoUnitario) }} c/u }</td>
                    <td data-label="Usuario">{{ m.registradoPor }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalMovimientos() > movimientos().length) {
            <p class="rx-muted">Se muestran los {{ movimientos().length }} más recientes.</p>
          }
        }
      </section>
    }
  `,
})
export class InventarioReporteComponent implements OnInit {
  private readonly service = inject(InventarioService);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly colores = COLORES_SERIE;
  readonly unidades = (v: number) => `${v.toLocaleString('es-CO')} und.`;

  readonly dias = signal(30);
  readonly cargando = signal(true);
  readonly resumen = signal<ResumenInventario | null>(null);
  readonly movimientos = signal<MovimientoInventario[]>([]);
  readonly totalMovimientos = signal(0);

  readonly porCategoria = computed<ItemBarra[]>(() =>
    (this.resumen()?.valorPorCategoria ?? []).map((c) => ({ etiqueta: c.categoria, valor: Number(c.valor), detalle: `${c.articulos} artículos` })),
  );
  readonly masUsados = computed<ItemBarra[]>(() =>
    (this.resumen()?.masUsados ?? []).map((m) => ({
      etiqueta: m.nombre,
      valor: m.unidadesSalida,
      detalle: m.valorConsumido ? moneda(m.valorConsumido) : undefined,
    })),
  );
  readonly totalCompras = computed(() =>
    this.movimientos()
      .filter((m) => m.tipo === 'ENTRADA' && m.costoUnitario)
      .reduce((t, m) => t + m.cantidad * Number(m.costoUnitario), 0),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cambiarDias(d: number): void {
    this.dias.set(d);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    const hoy = new Date();
    this.service.resumen(this.dias()).subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
    this.service.movimientos({ desde: isoFecha(sumarDias(hoy, -this.dias())), hasta: isoFecha(hoy), tamano: 200 }).subscribe({
      next: (p) => {
        this.movimientos.set(p.contenido);
        this.totalMovimientos.set(p.totalElementos);
      },
      error: () => this.movimientos.set([]),
    });
  }

  etiquetaTipo(t: TipoMovimientoStock): string {
    return { ENTRADA: 'Entrada', SALIDA: 'Salida', AJUSTE: 'Ajuste' }[t];
  }

  claseTipo(t: TipoMovimientoStock): string {
    return { ENTRADA: 'ok', SALIDA: 'alerta', AJUSTE: 'neutro' }[t];
  }

  exportar(): void {
    descargarCsv(
      `movimientos-inventario-${this.dias()}d.csv`,
      ['Fecha', 'Artículo', 'Tipo', 'Cantidad', 'Stock anterior', 'Stock resultante', 'Costo unitario', 'Proveedor', 'Motivo', 'Usuario'],
      this.movimientos().map((m) => [m.fechaHora, m.articuloNombre, this.etiquetaTipo(m.tipo), m.cantidad, m.stockAnterior, m.stockResultante, m.costoUnitario, m.proveedor, m.motivo, m.registradoPor]),
    );
  }
}
