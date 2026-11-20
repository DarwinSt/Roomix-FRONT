import { Component, HostListener, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface VisorFotoData {
  urls: string[];
  indice: number;
  titulo: string;
}

/** Foto de la habitación ampliada, con flechas (también del teclado) para recorrer la galería. */
@Component({
  selector: 'app-visor-foto',
  imports: [MatDialogModule, MatIconModule],
  template: `
    <div class="visor">
      <img [src]="data.urls[i()]" [alt]="data.titulo + ', foto ' + (i() + 1) + ' de ' + data.urls.length" />
      <button type="button" class="cerrar" (click)="ref.close()" aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      @if (data.urls.length > 1) {
        <button type="button" class="nav anterior" (click)="mover(-1)" aria-label="Foto anterior"><mat-icon>chevron_left</mat-icon></button>
        <button type="button" class="nav siguiente" (click)="mover(1)" aria-label="Foto siguiente"><mat-icon>chevron_right</mat-icon></button>
        <span class="contador">{{ i() + 1 }} / {{ data.urls.length }}</span>
      }
    </div>
  `,
  styles: `
    .visor { position: relative; display: grid; place-items: center; }
    img { display: block; max-width: 92vw; max-height: 86vh; border-radius: 10px; }
    button { position: absolute; border: none; border-radius: 50%; width: 44px; height: 44px; display: grid; place-items: center;
      background: rgba(0, 0, 0, 0.45); color: #fff; cursor: pointer; }
    .cerrar { top: 0.5rem; right: 0.5rem; }
    .nav { top: 50%; transform: translateY(-50%); }
    .anterior { left: 0.5rem; }
    .siguiente { right: 0.5rem; }
    .contador { position: absolute; bottom: 0.6rem; left: 50%; transform: translateX(-50%); color: #fff; background: rgba(0, 0, 0, 0.45);
      padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.8rem; }
  `,
})
export class VisorFotoComponent {
  readonly data = inject<VisorFotoData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<VisorFotoComponent>);
  readonly i = signal(this.data.indice);

  mover(paso: number): void {
    const n = this.data.urls.length;
    this.i.set((this.i() + paso + n) % n);
  }

  @HostListener('document:keydown.arrowleft')
  anterior(): void {
    this.mover(-1);
  }

  @HostListener('document:keydown.arrowright')
  siguiente(): void {
    this.mover(1);
  }
}
