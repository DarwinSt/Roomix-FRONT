import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectorOpcionesComponent } from './selector-opciones.component';
import { METODOS_PAGO, MetodoPago } from '../../core/models/finanzas.model';

@Component({
  imports: [ReactiveFormsModule, SelectorOpcionesComponent],
  template: `<rx-selector-opciones [formControl]="metodo" [opciones]="metodos" etiqueta="Medio de pago" />`,
})
class FormularioPagoComponent {
  readonly metodos = METODOS_PAGO;
  readonly metodo = new FormControl<MetodoPago | null>('EFECTIVO');
}

describe('Opciones en tarjetas (rx-selector-opciones)', () => {
  function crear() {
    const fixture = TestBed.createComponent(FormularioPagoComponent);
    fixture.detectChanges();
    const botones = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('button.rx-opcion'));
    return { fixture, botones };
  }

  it('muestra todas las opciones y marca la del formulario', () => {
    const { botones } = crear();
    expect(botones().length).toBe(METODOS_PAGO.length);
    const activa = botones().find((b) => b.classList.contains('activa'));
    expect(activa?.textContent).toContain('Efectivo');
    expect(activa?.getAttribute('aria-checked')).toBe('true');
  });

  it('al tocar una tarjeta cambia el valor del formulario', () => {
    const { fixture, botones } = crear();
    botones().find((b) => b.textContent?.includes('Transferencia'))!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.metodo.value).toBe('TRANSFERENCIA');
    expect(botones().filter((b) => b.classList.contains('activa')).length).toBe(1);
  });

  it('respeta el campo deshabilitado', () => {
    const { fixture, botones } = crear();
    fixture.componentInstance.metodo.disable();
    fixture.detectChanges();
    expect(botones().every((b) => b.disabled)).toBe(true);
  });
});
