import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface ItemBarra {
  etiqueta: string;
  valor: number;
  /** Texto secundario (ej. "12 reservas") */
  detalle?: string;
}

/**
 * Ranking o desglose de una sola serie con barras horizontales y etiquetas directas.
 */
@Component({
  selector: 'rx-barras-horizontales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length === 0) {
      <p class="vacio">Sin datos en el periodo.</p>
    }
    @for (item of filas(); track item.etiqueta) {
      <div class="fila" [attr.title]="item.etiqueta + ': ' + formato()(item.valor)">
        <div class="cabecera">
          <span class="etiqueta">{{ item.etiqueta }}</span>
          <span class="valor">{{ formato()(item.valor) }}@if (item.detalle) {<small> · {{ item.detalle }}</small>}</span>
        </div>
        <div class="pista"><div class="barra" [style.width.%]="item.pct" [style.background]="color()"></div></div>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 0.6rem; }
    .vacio { margin: 0; color: var(--text-200); font-size: 0.85rem; }
    .cabecera { display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.84rem; margin-bottom: 0.2rem; }
    .etiqueta { color: var(--text-100); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .valor { font-weight: 600; color: var(--text-strong); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .valor small { font-weight: 400; color: var(--text-200); }
    .pista { height: 10px; background: rgba(0, 0, 0, 0.05); border-radius: 0 4px 4px 0; }
    .barra { height: 100%; border-radius: 0 4px 4px 0; min-width: 2px; }
  `,
})
export class BarrasHorizontalesComponent {
  readonly items = input.required<ItemBarra[]>();
  readonly color = input('#397d54');
  readonly formato = input<(v: number) => string>((v) => v.toLocaleString('es-CO'));
  readonly limite = input(8);

  readonly filas = computed(() => {
    const lista = this.items().slice(0, this.limite());
    const max = Math.max(...lista.map((i) => i.valor), 1);
    return lista.map((i) => ({ ...i, pct: (i.valor / max) * 100 }));
  });
}
