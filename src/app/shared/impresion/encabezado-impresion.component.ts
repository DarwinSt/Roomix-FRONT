import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { HotelService } from '../../core/services/finanzas.service';
import { LogoHotelDirective } from '../../shared/directivas/logo-hotel.directive';

/**
 * Encabezado de los documentos impresos (acta de caja, comprobante, reportes): logo, nombre y datos del hotel a la
 * izquierda y el título del documento a la derecha. Solo se ve al imprimir.
 */
@Component({
  selector: 'rx-encabezado-impresion',
  host: { class: 'solo-imprimir rx-encabezado-impresion' },
  imports: [LogoHotelDirective],
  template: `
    <div class="hotel">
      @if (logo(); as src) { <img [src]="src" [alt]="nombre()" [rxLogoHotel]="60" /> }
      <div class="datos">
        <strong>{{ nombre() }}</strong>
        @if (hotel(); as h) {
          @if (h.nit) { <span>NIT {{ h.nit }}</span> }
          @if (linea([h.direccion, h.ciudad])) { <span>{{ linea([h.direccion, h.ciudad]) }}</span> }
          @if (linea([h.telefono, h.email])) { <span>{{ linea([h.telefono, h.email]) }}</span> }
        }
      </div>
    </div>
    <div class="documento">
      <h1>{{ titulo() }}</h1>
      @if (subtitulo()) { <span>{{ subtitulo() }}</span> }
    </div>
  `,
  styles: `
    :host { margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #333; }
    :host.solo-imprimir { display: none; }
    @media print { :host.solo-imprimir { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; } }
    .hotel { display: flex; gap: 0.8rem; align-items: center; min-width: 0; }
    img { max-height: 64px; max-width: 150px; object-fit: contain; }
    .datos { display: flex; flex-direction: column; font-size: 0.8rem; color: #444; line-height: 1.35; }
    .datos strong { font-size: 1.05rem; color: #111; }
    .documento { text-align: right; }
    .documento h1 { margin: 0; font-size: 1.25rem; color: #111; }
    .documento span { font-size: 0.8rem; color: #444; }
  `,
})
export class EncabezadoImpresionComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string | null>(null);

  private readonly configuracion = inject(ConfiguracionService);
  readonly logo = this.configuracion.logoUrl;
  readonly hotel = toSignal(inject(HotelService).datos(), { initialValue: null });
  readonly nombre = computed(() => this.hotel()?.nombre ?? this.configuracion.nombreHotel());

  linea(partes: (string | null | undefined)[]): string {
    return partes.filter((p) => !!p && p.trim()).join(' · ');
  }
}
