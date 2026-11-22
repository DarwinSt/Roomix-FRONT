import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MonedaDirective, formatearMiles } from './moneda.directive';

@Component({
  imports: [ReactiveFormsModule, MonedaDirective],
  template: `<input rxMoneda [formControl]="valor" />`,
})
class CampoDineroComponent {
  readonly valor = new FormControl<number | null>(250000);
}

describe('Campos de dinero con puntos de miles (rxMoneda)', () => {
  it('formatea valores en pesos', () => {
    expect(formatearMiles(300000)).toBe('300.000');
    expect(formatearMiles('1250000')).toBe('1.250.000');
    expect(formatearMiles(999)).toBe('999');
    expect(formatearMiles(null)).toBe('');
    expect(formatearMiles('')).toBe('');
    expect(formatearMiles('abc')).toBe('');
  });

  it('muestra el valor del formulario con puntos y entrega el número limpio al escribir', () => {
    const fixture = TestBed.createComponent(CampoDineroComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.value).toBe('250.000');

    input.value = '1234567';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('1.234.567');
    expect(fixture.componentInstance.valor.value).toBe(1234567);
  });

  it('ignora letras y deja el campo vacío como null', () => {
    const fixture = TestBed.createComponent(CampoDineroComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = '12a3';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.valor.value).toBe(123);
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.valor.value).toBeNull();
  });
});
