import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Paginador de listados: «Mostrando X–Y de N», tamaño de página y botones numerados con elipsis.
 * La página es base 0.
 */
@Component({
  selector: 'rx-paginador',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (total() > 0) {
      <nav class="paginador" aria-label="Paginación">
        <span class="resumen">Mostrando <strong>{{ desde() }}–{{ hasta() }}</strong> de <strong>{{ total() }}</strong></span>

        <label class="tamano">
          Filas
          <select [value]="tamano()" (change)="cambiarTamano($any($event.target).value)" aria-label="Filas por página">
            @for (t of opciones(); track t) { <option [value]="t" [selected]="t === tamano()">{{ t }}</option> }
          </select>
        </label>

        <div class="paginas">
          <button mat-icon-button type="button" (click)="ir(0)" [disabled]="pagina() === 0" aria-label="Primera página">
            <mat-icon>first_page</mat-icon>
          </button>
          <button mat-icon-button type="button" (click)="ir(pagina() - 1)" [disabled]="pagina() === 0" aria-label="Página anterior">
            <mat-icon>chevron_left</mat-icon>
          </button>
          @for (p of botones(); track $index) {
            @if (p === -1) {
              <span class="elipsis">…</span>
            } @else {
              <button type="button" class="num" [class.activa]="p === pagina()" (click)="ir(p)"
                      [attr.aria-current]="p === pagina() ? 'page' : null">{{ p + 1 }}</button>
            }
          }
          <button mat-icon-button type="button" (click)="ir(pagina() + 1)" [disabled]="pagina() >= paginas() - 1" aria-label="Página siguiente">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <button mat-icon-button type="button" (click)="ir(paginas() - 1)" [disabled]="pagina() >= paginas() - 1" aria-label="Última página">
            <mat-icon>last_page</mat-icon>
          </button>
        </div>
      </nav>
    }
  `,
  styles: `
    .paginador { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.6rem 1rem;
      padding: 0.6rem 0.25rem; font-size: 0.86rem; color: var(--text-200); }
    .resumen strong { color: var(--text-strong); font-variant-numeric: tabular-nums; }
    .tamano { display: inline-flex; align-items: center; gap: 0.4rem; }
    .tamano select { font: inherit; padding: 0.25rem 0.4rem; border: 1px solid var(--bg-300); border-radius: 8px; background: #fff; color: var(--text-strong); }
    .paginas { display: flex; align-items: center; gap: 0.15rem; margin-left: auto; }
    .num { min-width: 34px; height: 34px; padding: 0 0.4rem; border: 1px solid transparent; border-radius: 10px; background: none;
      font: inherit; color: var(--text-100); cursor: pointer; font-variant-numeric: tabular-nums; }
    .num:hover { background: rgba(57, 125, 84, 0.08); }
    .num.activa { background: var(--primary-300, #397d54); color: #fff; font-weight: 700; }
    .elipsis { padding: 0 0.25rem; }
    @media (max-width: 600px) { .paginas { margin-left: 0; width: 100%; justify-content: center; } .tamano { display: none; } }
  `,
})
export class PaginadorComponent {
  readonly total = input.required<number>();
  readonly pagina = input.required<number>();
  readonly tamano = input(10);
  readonly opciones = input([10, 25, 50]);
  readonly paginaChange = output<number>();
  readonly tamanoChange = output<number>();

  readonly paginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));
  readonly desde = computed(() => (this.total() === 0 ? 0 : this.pagina() * this.tamano() + 1));
  readonly hasta = computed(() => Math.min(this.total(), (this.pagina() + 1) * this.tamano()));

  /** Números de página visibles: primera, última y vecinas de la actual (-1 = elipsis). */
  readonly botones = computed(() => {
    const n = this.paginas();
    const actual = this.pagina();
    const set = new Set([0, n - 1, actual - 1, actual, actual + 1].filter((p) => p >= 0 && p < n));
    const orden = [...set].sort((a, b) => a - b);
    const res: number[] = [];
    orden.forEach((p, i) => {
      if (i > 0 && p - orden[i - 1] > 1) res.push(-1);
      res.push(p);
    });
    return res;
  });

  ir(p: number): void {
    const destino = Math.min(Math.max(0, p), this.paginas() - 1);
    if (destino !== this.pagina()) this.paginaChange.emit(destino);
  }

  cambiarTamano(v: string): void {
    this.tamanoChange.emit(Number(v));
  }
}
