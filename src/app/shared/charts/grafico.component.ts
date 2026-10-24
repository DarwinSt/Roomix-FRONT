import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

export interface SerieGrafico {
  nombre: string;
  /** Color de la serie (paleta validada: ver COLORES_SERIE) */
  color: string;
  valores: number[];
}

/**
 * Paleta categórica validada para daltonismo (posiciones 1 y 2 de la paleta de referencia)
 * y el verde de la marca para series únicas.
 */
export const COLORES_SERIE = {
  ingresos: '#2a78d6',
  egresos: '#eb6834',
  marca: '#397d54',
};

interface Barra {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  color: string;
  ruta: string;
}

/**
 * Gráfico SVG de barras agrupadas o líneas, con eje Y, etiquetas X, leyenda (2+ series)
 * y tooltip por columna. Se adapta al ancho del contenedor.
 */
@Component({
  selector: 'rx-grafico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (series().length > 1) {
      <div class="leyenda">
        @for (s of series(); track s.nombre) {
          <span class="item"><span class="muestra" [style.background]="s.color"></span>{{ s.nombre }}</span>
        }
      </div>
    }
    <div class="lienzo" (mouseleave)="activo.set(-1)">
      <svg [attr.width]="ancho()" [attr.height]="alto()" role="img" [attr.aria-label]="descripcion()">
        @for (t of ticks(); track t.valor) {
          <line class="grid" [attr.x1]="margen.izq" [attr.x2]="ancho() - margen.der" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="eje" [attr.x]="margen.izq - 6" [attr.y]="t.y + 4" text-anchor="end">{{ t.etiqueta }}</text>
        }
        <line class="base" [attr.x1]="margen.izq" [attr.x2]="ancho() - margen.der" [attr.y1]="yBase()" [attr.y2]="yBase()" />

        @if (activo() >= 0) {
          <rect class="banda" [attr.x]="xBanda(activo())" [attr.y]="margen.sup" [attr.width]="anchoBanda()" [attr.height]="altoPlot()" />
        }

        @if (tipo() === 'barras') {
          @for (b of barras(); track $index) {
            <path [attr.d]="b.ruta" [attr.fill]="b.color" />
          }
        } @else {
          @for (l of lineas(); track l.color) {
            <path class="linea" [attr.d]="l.ruta" [attr.stroke]="l.color" />
          }
          @if (activo() >= 0) {
            @for (s of series(); track s.nombre) {
              <circle class="punto" [attr.cx]="xCentro(activo())" [attr.cy]="yValor(s.valores[activo()] || 0)" r="4.5" [attr.fill]="s.color" />
            }
          }
        }

        @for (e of etiquetasX(); track e.i) {
          <text class="eje" [attr.x]="xCentro(e.i)" [attr.y]="alto() - 6" text-anchor="middle">{{ e.texto }}</text>
        }

        @for (i of indices(); track i) {
          <rect class="hit" [attr.x]="xBanda(i)" [attr.y]="margen.sup" [attr.width]="anchoBanda()" [attr.height]="altoPlot()"
                (mouseenter)="activo.set(i)" (click)="activo.set(i)" />
        }
      </svg>

      @if (activo() >= 0) {
        <div class="tooltip" [style.left.px]="posTooltip()" [class.izquierda]="tooltipIzquierda()">
          <strong>{{ etiquetas()[activo()] }}</strong>
          @for (s of series(); track s.nombre) {
            <span class="fila">
              <span class="muestra" [style.background]="s.color"></span>
              <span class="nombre">{{ s.nombre }}</span>
              <span class="valor">{{ formato()(s.valores[activo()] || 0) }}</span>
            </span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; position: relative; }
    .leyenda { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; margin-bottom: 0.4rem; font-size: 0.8rem; color: var(--text-200); }
    .item { display: inline-flex; align-items: center; gap: 0.35rem; }
    .muestra { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex-shrink: 0; }
    .lienzo { position: relative; width: 100%; }
    svg { display: block; overflow: visible; }
    .grid { stroke: rgba(0, 0, 0, 0.07); stroke-width: 1; }
    .base { stroke: rgba(0, 0, 0, 0.25); stroke-width: 1; }
    .eje { font-size: 10.5px; fill: var(--text-200); font-variant-numeric: tabular-nums; }
    .banda { fill: rgba(0, 0, 0, 0.04); }
    .linea { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .punto { stroke: #ffffff; stroke-width: 2; }
    .hit { fill: transparent; cursor: crosshair; }
    .tooltip {
      position: absolute; top: 4px; transform: translateX(10px); pointer-events: none; z-index: 2;
      display: flex; flex-direction: column; gap: 0.2rem; min-width: 150px;
      padding: 0.5rem 0.65rem; background: #ffffff; border: 1px solid var(--bg-300); border-radius: 8px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12); font-size: 0.78rem; color: var(--text-100);
    }
    .tooltip.izquierda { transform: translateX(calc(-100% - 10px)); }
    .fila { display: flex; align-items: center; gap: 0.4rem; }
    .fila .nombre { color: var(--text-200); flex: 1; }
    .fila .valor { font-weight: 600; font-variant-numeric: tabular-nums; }
  `,
})
export class GraficoComponent implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: ResizeObserver;

  readonly tipo = input<'barras' | 'linea'>('barras');
  readonly etiquetas = input.required<string[]>();
  readonly series = input.required<SerieGrafico[]>();
  readonly formato = input<(v: number) => string>((v) => v.toLocaleString('es-CO'));
  readonly formatoEje = input<(v: number) => string>(compacto);
  readonly alto = input(240);
  readonly maximoFijo = input<number | null>(null);
  readonly descripcion = input('Gráfico');

  readonly ancho = signal(600);
  readonly activo = signal(-1);
  readonly margen = { sup: 10, der: 8, inf: 22, izq: 52 };

  readonly indices = computed(() => this.etiquetas().map((_, i) => i));
  readonly altoPlot = computed(() => this.alto() - this.margen.sup - this.margen.inf);
  readonly anchoPlot = computed(() => Math.max(this.ancho() - this.margen.izq - this.margen.der, 10));
  readonly anchoBanda = computed(() => this.anchoPlot() / Math.max(this.etiquetas().length, 1));
  readonly yBase = computed(() => this.margen.sup + this.altoPlot());

  readonly maximo = computed(() => {
    const fijo = this.maximoFijo();
    if (fijo !== null) return fijo;
    const max = Math.max(0, ...this.series().flatMap((s) => s.valores));
    return redondearArriba(max || 1);
  });

  readonly ticks = computed(() => {
    const max = this.maximo();
    return [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      valor: max * f,
      y: this.yValor(max * f),
      etiqueta: this.formatoEje()(max * f),
    }));
  });

  readonly barras = computed<Barra[]>(() => {
    const series = this.series();
    const banda = this.anchoBanda();
    const n = Math.max(series.length, 1);
    const grosor = Math.max(Math.min(24, (banda * 0.7 - 2 * (n - 1)) / n), 2);
    const grupo = grosor * n + 2 * (n - 1);
    const out: Barra[] = [];
    this.etiquetas().forEach((_, i) => {
      const inicio = this.xBanda(i) + (banda - grupo) / 2;
      series.forEach((s, k) => {
        const v = s.valores[i] ?? 0;
        const y = this.yValor(v);
        const x = inicio + k * (grosor + 2);
        const alto = this.yBase() - y;
        out.push({ x, y, ancho: grosor, alto, color: s.color, ruta: rutaBarra(x, y, grosor, alto) });
      });
    });
    return out;
  });

  readonly lineas = computed(() =>
    this.series().map((s) => ({
      color: s.color,
      ruta: s.valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${this.xCentro(i).toFixed(1)},${this.yValor(v).toFixed(1)}`).join(' '),
    })),
  );

  /** Etiquetas del eje X espaciadas para que no se encimen. */
  readonly etiquetasX = computed(() => {
    const etiquetas = this.etiquetas();
    const caben = Math.max(Math.floor(this.anchoPlot() / 56), 2);
    const paso = Math.max(Math.ceil(etiquetas.length / caben), 1);
    return etiquetas.map((texto, i) => ({ i, texto })).filter((e) => e.i % paso === 0);
  });

  readonly posTooltip = computed(() => this.xCentro(Math.max(this.activo(), 0)));
  readonly tooltipIzquierda = computed(() => this.posTooltip() > this.ancho() * 0.6);

  ngOnInit(): void {
    const el = this.host.nativeElement as HTMLElement;
    this.ancho.set(el.clientWidth || 600);
    this.observer = new ResizeObserver((entradas) => {
      const w = Math.floor(entradas[0].contentRect.width);
      if (w > 0) this.ancho.set(w);
    });
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  xBanda(i: number): number {
    return this.margen.izq + i * this.anchoBanda();
  }

  xCentro(i: number): number {
    return this.xBanda(i) + this.anchoBanda() / 2;
  }

  yValor(v: number): number {
    const max = this.maximo() || 1;
    return this.margen.sup + this.altoPlot() * (1 - Math.min(Math.max(v, 0), max) / max);
  }
}

/** Barra con extremo superior redondeado (4px) y base recta. */
function rutaBarra(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

function redondearArriba(v: number): number {
  const potencia = Math.pow(10, Math.floor(Math.log10(v)));
  const escala = v / potencia;
  const paso = escala <= 1 ? 1 : escala <= 2 ? 2 : escala <= 2.5 ? 2.5 : escala <= 5 ? 5 : 10;
  return paso * potencia;
}

/** 1.200.000 → "1,2 M"; 45.000 → "45 mil". */
export function compacto(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} mil`;
  return v.toLocaleString('es-CO', { maximumFractionDigits: 1 });
}
