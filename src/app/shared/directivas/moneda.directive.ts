import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Formatea un valor en pesos con separador de miles: 300000 → «300.000». */
export function formatearMiles(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('es-CO', { maximumFractionDigits: 0 }) : '';
}

/**
 * Campo de dinero con puntos de miles mientras se escribe («300.000»). El formulario recibe el número limpio
 * (300000) o null si está vacío, igual que un campo numérico. Uso: `<input matInput rxMoneda formControlName="valor" />`.
 */
@Directive({
  selector: 'input[rxMoneda]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MonedaDirective), multi: true }],
  host: {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    '(input)': 'alEscribir()',
    '(blur)': 'alSalir()',
  },
})
export class MonedaDirective implements ControlValueAccessor {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private alCambiar: (v: number | null) => void = () => {};
  private alTocar: () => void = () => {};

  writeValue(valor: number | string | null): void {
    this.el.nativeElement.value = formatearMiles(valor);
  }

  registerOnChange(fn: (v: number | null) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.el.nativeElement.disabled = deshabilitado;
  }

  alEscribir(): void {
    const input = this.el.nativeElement;
    const texto = input.value;
    // Dígitos a la izquierda del cursor, para dejarlo en el mismo lugar después de poner los puntos
    const digitosAntes = texto.slice(0, input.selectionStart ?? texto.length).replace(/\D/g, '').length;
    const digitos = texto.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);
    const valor = digitos ? Number(digitos) : null;
    const formateado = formatearMiles(valor);
    input.value = formateado;
    let pos = 0;
    let vistos = 0;
    while (pos < formateado.length && vistos < digitosAntes) {
      if (/\d/.test(formateado[pos])) vistos++;
      pos++;
    }
    if (document.activeElement === input) input.setSelectionRange(pos, pos);
    this.alCambiar(valor);
  }

  alSalir(): void {
    this.alTocar();
  }
}
