import { Directive, computed, inject, input, numberAttribute } from '@angular/core';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { LogoForma } from '../../core/models/configuracion.model';

/**
 * Muestra el logo del hotel con la forma que eligió el administrador: tal como viene, como ícono (esquinas redondeadas)
 * o como avatar (círculo). En las formas redondas el logo va completo dentro de un recuadro blanco del tamaño indicado.
 *
 * Uso: `<img [src]="logo" [rxLogoHotel]="48" />` (48 px de lado si la forma es ícono o avatar).
 * `[rxLogoForma]` fuerza una forma (vista previa o imágenes que no son el logo del hotel).
 */
@Directive({
  selector: 'img[rxLogoHotel]',
  host: {
    '[class.rx-logo-icono]': "forma() === 'ICONO'",
    '[class.rx-logo-avatar]': "forma() === 'AVATAR'",
    '[style.width.px]': "forma() === 'ORIGINAL' ? null : tamano()",
    '[style.height.px]': "forma() === 'ORIGINAL' ? null : tamano()",
  },
})
export class LogoHotelDirective {
  readonly tamano = input(48, { alias: 'rxLogoHotel', transform: (v: unknown) => numberAttribute(v, 48) });
  readonly formaForzada = input<LogoForma | null>(null, { alias: 'rxLogoForma' });
  private readonly configuracion = inject(ConfiguracionService);
  readonly forma = computed<LogoForma>(() => this.formaForzada() ?? this.configuracion.formaLogo());
}
