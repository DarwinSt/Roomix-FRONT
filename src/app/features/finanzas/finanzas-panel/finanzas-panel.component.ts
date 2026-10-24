import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import {
  CategoriaFinanciera,
  MovimientoFinanciero,
  ResumenFinanciero,
  TipoMovimiento,
  etiquetaMetodoPago,
} from '../../../core/models/finanzas.model';
import { descargarCsv, fechaCorta, moneda, porcentaje } from '../../../core/utils/formato.util';
import { GraficoComponent, COLORES_SERIE, SerieGrafico } from '../../../shared/charts/grafico.component';
import { BarrasHorizontalesComponent } from '../../../shared/charts/barras-horizontales.component';
import { Periodo, PeriodoSelectorComponent } from '../../../shared/periodo/periodo-selector.component';
import { MovimientoDialogComponent } from '../movimiento-dialog/movimiento-dialog.component';
import { MotivoDialogComponent } from '../../../shared/dialogs/motivo-dialog/motivo-dialog.component';

@Component({
  selector: 'app-finanzas-panel',
  imports: [
    RouterLink, FormsModule, MatButtonModule, MatButtonToggleModule, MatCheckboxModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatProgressSpinnerModule, MatSelectModule, MatTooltipModule, GraficoComponent, BarrasHorizontalesComponent,
    PeriodoSelectorComponent,
  ],
  templateUrl: './finanzas-panel.component.html',
  styles: `
    .vista { margin-bottom: 1rem; }
    .comparativo { margin: 0.35rem 0 0; font-size: 0.82rem; color: var(--text-200); }
    .tabla-serie { max-height: 320px; overflow: auto; margin-top: 0.75rem; }
    .positivo { color: #2e7d32; }
    .negativo { color: #c62828; }
  `,
})
export class FinanzasPanelComponent {
  private readonly finanzas = inject(FinanzasService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly moneda = moneda;
  readonly porcentaje = porcentaje;
  readonly fecha = fechaCorta;
  readonly metodo = etiquetaMetodoPago;
  readonly colores = COLORES_SERIE;

  readonly vista = signal<'resumen' | 'movimientos'>('resumen');
  readonly periodo = signal<Periodo | null>(null);
  readonly cargando = signal(true);
  readonly resumen = signal<ResumenFinanciero | null>(null);
  readonly verTabla = signal(false);

  readonly categorias = toSignal(this.finanzas.categorias(), { initialValue: [] });
  readonly movimientos = signal<MovimientoFinanciero[]>([]);
  readonly cargandoMov = signal(false);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly totalMov = signal(0);
  filtroTipo: TipoMovimiento | '' = '';
  filtroCategoria: CategoriaFinanciera | '' = '';
  filtroTexto = '';
  incluirAnulados = false;

  readonly etiquetas = computed(() => this.resumen()?.serie.map((p) => p.etiqueta) ?? []);
  readonly series = computed<SerieGrafico[]>(() => {
    const serie = this.resumen()?.serie ?? [];
    return [
      { nombre: 'Ingresos', color: COLORES_SERIE.ingresos, valores: serie.map((p) => Number(p.ingresos)) },
      { nombre: 'Egresos', color: COLORES_SERIE.egresos, valores: serie.map((p) => Number(p.egresos)) },
    ];
  });
  readonly ingresosCat = computed(() =>
    (this.resumen()?.ingresosPorCategoria ?? []).map((c) => ({ etiqueta: c.nombre, valor: Number(c.valor), detalle: `${c.porcentaje} %` })),
  );
  readonly egresosCat = computed(() =>
    (this.resumen()?.egresosPorCategoria ?? []).map((c) => ({ etiqueta: c.nombre, valor: Number(c.valor), detalle: `${c.porcentaje} %` })),
  );
  readonly categoriasFiltro = computed(() =>
    this.categorias().filter((c) => !this.filtroTipo || c.tipo === this.filtroTipo),
  );

  cambiarPeriodo(p: Periodo): void {
    this.periodo.set(p);
    this.cargarResumen();
    if (this.vista() === 'movimientos') this.cargarMovimientos(0);
  }

  cambiarVista(v: 'resumen' | 'movimientos'): void {
    this.vista.set(v);
    if (v === 'movimientos') this.cargarMovimientos(0);
  }

  cargarResumen(): void {
    const p = this.periodo();
    if (!p) return;
    this.cargando.set(true);
    this.finanzas.resumen(p.desde, p.hasta).subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  cargarMovimientos(pagina: number): void {
    const p = this.periodo();
    if (!p) return;
    this.cargandoMov.set(true);
    this.finanzas
      .movimientos({
        desde: p.desde, hasta: p.hasta, tipo: this.filtroTipo, categoria: this.filtroCategoria,
        texto: this.filtroTexto, incluirAnulados: this.incluirAnulados, pagina, tamano: 50,
      })
      .subscribe({
        next: (r) => {
          this.movimientos.set(r.contenido);
          this.pagina.set(r.pagina);
          this.totalPaginas.set(r.totalPaginas);
          this.totalMov.set(r.totalElementos);
          this.cargandoMov.set(false);
        },
        error: (e) => {
          this.cargandoMov.set(false);
          this.errorDialog.mostrarDesdeApi(e);
        },
      });
  }

  registrar(tipo: TipoMovimiento): void {
    this.dialog
      .open(MovimientoDialogComponent, { ...roomixDialogConfig({ width: '600px' }), data: tipo })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.snack.open('Movimiento registrado', 'OK', { duration: 2500 });
        this.cargarResumen();
        if (this.vista() === 'movimientos') this.cargarMovimientos(this.pagina());
      });
  }

  anular(m: MovimientoFinanciero): void {
    this.dialog
      .open(MotivoDialogComponent, {
        ...roomixDialogConfig({ width: '460px' }),
        data: { title: 'Anular movimiento', message: `${m.concepto} — ${moneda(m.valor)}. El registro se conserva marcado como anulado.`, confirmLabel: 'Anular' },
      })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.finanzas.anular(m.id, motivo).subscribe({
          next: () => {
            this.snack.open('Movimiento anulado', 'OK', { duration: 2500 });
            this.cargarMovimientos(this.pagina());
            this.cargarResumen();
          },
          error: (e) => this.errorDialog.mostrarDesdeApi(e),
        });
      });
  }

  variacion(v: number | null | undefined): string {
    if (v === null || v === undefined) return 'sin datos del periodo anterior';
    return `${v > 0 ? '+' : ''}${v.toLocaleString('es-CO')} % vs. periodo anterior`;
  }

  exportarMovimientos(): void {
    descargarCsv(
      `movimientos-${this.periodo()?.desde}-a-${this.periodo()?.hasta}.csv`,
      ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Valor', 'Método', 'Tercero', 'Referencia', 'Registrado por', 'Anulado'],
      this.movimientos().map((m) => [m.fecha, m.tipo, m.categoriaNombre, m.concepto, m.valor, this.metodo(m.metodoPago), m.tercero,
        m.referencia, m.registradoPor, m.anulado ? `Sí: ${m.motivoAnulacion}` : 'No']),
    );
  }

  exportarResumen(): void {
    const r = this.resumen();
    if (!r) return;
    descargarCsv(
      `estado-resultados-${r.desde}-a-${r.hasta}.csv`,
      ['Periodo', 'Ingresos', 'Egresos', 'Utilidad'],
      r.serie.map((p) => [p.etiqueta, p.ingresos, p.egresos, Number(p.ingresos) - Number(p.egresos)]),
    );
  }
}
