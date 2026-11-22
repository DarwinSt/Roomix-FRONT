import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { Pixeles, quitarFondo } from '../../../shared/imagen/quitar-fondo';

/** Lado máximo del logo procesado: suficiente para el menú, las facturas y la impresión, y liviano de guardar. */
const LADO_MAXIMO = 640;

/**
 * Quita el fondo del logo en el navegador: detecta el color que lo rodea y lo vuelve transparente. Se ve el resultado
 * sobre blanco, sobre el color del hotel y sobre una cuadrícula (donde se nota lo transparente) antes de guardarlo.
 * El logo original queda guardado para volver a él.
 */
@Component({
  selector: 'app-logo-fondo-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatProgressSpinnerModule, MatSliderModule],
  template: `
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>auto_fix_high</mat-icon></div>
      <div class="header-text"><h2>Quitar el fondo del logo</h2>
        <p>Funciona mejor con logos sobre un fondo de un solo color (blanco, por ejemplo).</p></div>
    </div>
    <mat-dialog-content>
      @if (!original()) {
        <div class="cargando">
          @if (error()) { <p class="rx-error-dialogo"><mat-icon>error_outline</mat-icon>{{ error() }}</p> } @else { <mat-spinner diameter="36" /> }
        </div>
      } @else {
        <div class="vistas">
          <figure><div class="lienzo cuadricula"><img [src]="vista()" alt="Logo sin fondo sobre cuadrícula" /></div><figcaption>Transparencia</figcaption></figure>
          <figure><div class="lienzo blanco"><img [src]="vista()" alt="Logo sin fondo sobre blanco" /></div><figcaption>Sobre blanco</figcaption></figure>
          <figure><div class="lienzo marca"><img [src]="vista()" alt="Logo sin fondo sobre el color del hotel" /></div><figcaption>Sobre el color del hotel</figcaption></figure>
        </div>

        <div class="control">
          <span class="rx-etiqueta">Sensibilidad · {{ tolerancia() }}</span>
          <mat-slider min="0" max="100" step="1" discrete class="deslizador">
            <input matSliderThumb [ngModel]="tolerancia()" (ngModelChange)="tolerancia.set($event)" aria-label="Sensibilidad" />
          </mat-slider>
          <p class="ayuda">Súbala si quedan restos del fondo; bájela si se borra parte del logo.</p>
        </div>
        <mat-checkbox [ngModel]="interior()" (ngModelChange)="interior.set($event)">
          Quitar también ese color dentro del logo (por ejemplo, el hueco de las letras)
        </mat-checkbox>
        @if (error()) { <p class="rx-error-dialogo"><mat-icon>error_outline</mat-icon>{{ error() }}</p> }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="!original() || guardando()">
        <mat-icon>check</mat-icon>Usar sin fondo
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .cargando { display: grid; place-items: center; min-height: 180px; }
    .vistas { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; margin-bottom: 1rem; }
    figure { margin: 0; }
    figcaption { text-align: center; font-size: 0.75rem; color: var(--text-200); margin-top: 0.3rem; }
    .lienzo { height: 120px; box-sizing: border-box; border-radius: 12px; border: 1px solid var(--bg-200); display: flex; align-items: center;
      justify-content: center; padding: 0.6rem; overflow: hidden; }
    .lienzo img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
    .cuadricula { background-color: #fff; background-image: linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%);
      background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0; }
    .blanco { background: #fff; }
    .marca { background: var(--roomix-gradient-toolbar); }
    .control { margin-bottom: 0.5rem; }
    .deslizador { width: 100%; }
    .ayuda { margin: -0.4rem 0 0.25rem; font-size: 0.8rem; color: var(--text-200); }
    @media (max-width: 520px) { .vistas { grid-template-columns: 1fr; } .lienzo { height: 96px; } }
  `,
})
export class LogoFondoDialogComponent implements OnDestroy {
  private readonly data = inject<{ url: string }>(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly ref = inject(MatDialogRef<LogoFondoDialogComponent, boolean>);

  readonly original = signal<Pixeles | null>(null);
  readonly tolerancia = signal(25);
  readonly interior = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  private readonly lienzo = document.createElement('canvas');

  /** Resultado con la sensibilidad actual (se recalcula al mover el control). */
  private readonly resultado = computed(() => {
    const o = this.original();
    return o ? quitarFondo(o, { tolerancia: this.tolerancia(), incluirInterior: this.interior(), recortar: true }) : null;
  });
  readonly vista = computed(() => {
    const r = this.resultado();
    if (!r) return '';
    this.lienzo.width = r.width;
    this.lienzo.height = r.height;
    this.lienzo.getContext('2d')!.putImageData(new ImageData(r.data as Uint8ClampedArray<ArrayBuffer>, r.width, r.height), 0, 0);
    return this.lienzo.toDataURL('image/png');
  });

  constructor() {
    // Se descarga como archivo (no con <img>) para poder leer sus píxeles aunque el servidor esté en otro dominio
    this.http.get(this.data.url, { responseType: 'blob' }).subscribe({
      next: (blob) => this.cargar(blob),
      error: () => this.error.set('No se pudo cargar el logo actual.'),
    });
  }

  ngOnDestroy(): void {
    this.lienzo.width = 0;
  }

  private async cargar(blob: Blob): Promise<void> {
    try {
      const imagen = await createImageBitmap(blob);
      const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
      const w = Math.max(1, Math.round(imagen.width * escala));
      const h = Math.max(1, Math.round(imagen.height * escala));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(imagen, 0, 0, w, h);
      const datos = ctx.getImageData(0, 0, w, h);
      this.original.set({ data: datos.data, width: w, height: h });
    } catch {
      this.error.set('El formato del logo no se pudo procesar en este navegador.');
    }
  }

  guardar(): void {
    if (!this.resultado()) return;
    this.guardando.set(true);
    this.error.set(null);
    this.vista();
    this.lienzo.toBlob((blob) => {
      if (!blob) {
        this.guardando.set(false);
        this.error.set('No se pudo generar la imagen.');
        return;
      }
      if (blob.size > 1_048_576) {
        this.guardando.set(false);
        this.error.set('El logo sin fondo pesa más de 1 MB. Pruebe con una imagen más pequeña.');
        return;
      }
      this.configuracion.subirLogo(new File([blob], 'logo-sin-fondo.png', { type: 'image/png' }), true).subscribe({
        next: () => this.ref.close(true),
        error: (e) => {
          this.guardando.set(false);
          this.error.set(extractApiErrorMessage(e));
        },
      });
    }, 'image/png');
  }
}
