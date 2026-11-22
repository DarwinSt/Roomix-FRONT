import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface OpcionTarjeta<T = string> {
  value: T;
  label: string;
  icon?: string;
}

/**
 * Opciones en tarjetas que se tocan (medio de pago, categoría…), en lugar de una lista desplegable: se ven todas a la
 * vez, no se corta el texto y en el celular basta un toque. Funciona con formControlName como cualquier campo.
 *
 * Uso: `<rx-selector-opciones formControlName="metodo" [opciones]="metodos" etiqueta="Medio de pago" />`
 */
@Component({
  selector: 'rx-selector-opciones',
  imports: [MatIconModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectorOpcionesComponent), multi: true }],
  template: `
    @if (etiqueta()) { <span class="rx-etiqueta">{{ etiqueta() }}</span> }
    <div class="rx-opciones" [class.compactas]="compacto()" role="radiogroup" [attr.aria-label]="etiqueta() || null">
      @for (o of opciones(); track o.value) {
        <button type="button" class="rx-opcion" role="radio" [attr.aria-checked]="valor() === o.value" [class.activa]="valor() === o.value"
                [disabled]="deshabilitado()" (click)="elegir(o.value)">
          @if (o.icon) { <mat-icon>{{ o.icon }}</mat-icon> }{{ o.label }}
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .rx-opcion:disabled { opacity: 0.5; cursor: not-allowed; }
  `,
})
export class SelectorOpcionesComponent<T = string> implements ControlValueAccessor {
  readonly opciones = input.required<OpcionTarjeta<T>[]>();
  readonly etiqueta = input<string>('');
  readonly compacto = input(true);

  readonly valor = signal<T | null>(null);
  readonly deshabilitado = signal(false);
  private alCambiar: (v: T | null) => void = () => {};
  private alTocar: () => void = () => {};

  elegir(v: T): void {
    this.valor.set(v);
    this.alCambiar(v);
    this.alTocar();
  }

  writeValue(v: T | null): void {
    this.valor.set(v);
  }

  registerOnChange(fn: (v: T | null) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(d: boolean): void {
    this.deshabilitado.set(d);
  }
}
