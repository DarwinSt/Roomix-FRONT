import { Component, Injectable, computed, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDatepickerIntl, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule, SubscriptSizing } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { isoFecha } from '../../core/utils/formato.util';

/** "2026-11-22" → fecha local (sin desfase por zona horaria); null si no es válida. */
export function desdeIso(valor: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
  if (!m) return null;
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Textos del calendario en español (botones y lectores de pantalla). */
@Injectable()
export class DatepickerIntlEs extends MatDatepickerIntl {
  override calendarLabel = 'Calendario';
  override openCalendarLabel = 'Abrir calendario';
  override closeCalendarLabel = 'Cerrar calendario';
  override prevMonthLabel = 'Mes anterior';
  override nextMonthLabel = 'Mes siguiente';
  override prevYearLabel = 'Año anterior';
  override nextYearLabel = 'Año siguiente';
  override prevMultiYearLabel = 'Años anteriores';
  override nextMultiYearLabel = 'Años siguientes';
  override switchToMonthViewLabel = 'Elegir fecha';
  override switchToMultiYearViewLabel = 'Elegir mes y año';
  override startDateLabel = 'Fecha inicial';
  override endDateLabel = 'Fecha final';
}

/**
 * Campo de fecha con calendario, siempre en formato colombiano (dd/mm/aaaa) sin importar el idioma del navegador.
 * Recibe y entrega la fecha como texto "aaaa-mm-dd", igual que el backend. Funciona con ngModel y formControlName.
 *
 * Uso: `<rx-campo-fecha etiqueta="Desde" [(ngModel)]="desde" />`
 */
@Component({
  selector: 'rx-campo-fecha',
  imports: [MatDatepickerModule, MatFormFieldModule, MatInputModule],
  // Aquí y no en toda la app: así el calendario no entra en la carga inicial
  providers: [{ provide: MatDatepickerIntl, useClass: DatepickerIntlEs }],
  template: `
    <mat-form-field appearance="outline" [subscriptSizing]="ayuda() || mensajeError() ? 'fixed' : subscript()">
      <mat-label>{{ etiqueta() }}</mat-label>
      <input matInput [matDatepicker]="calendario" [value]="fecha()" [min]="minimo()" [max]="maximo()" [disabled]="deshabilitado()"
             [readonly]="soloLectura()" [errorStateMatcher]="errores" placeholder="dd/mm/aaaa" autocomplete="off"
             (dateChange)="elegir($event.value)" (blur)="alTocar()" />
      <mat-datepicker-toggle matIconSuffix [for]="calendario" [disabled]="soloLectura() || deshabilitado()" />
      <mat-datepicker #calendario />
      @if (ayuda()) { <mat-hint>{{ ayuda() }}</mat-hint> }
      @if (mensajeError()) { <mat-error>{{ mensajeError() }}</mat-error> }
    </mat-form-field>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    mat-form-field { width: 100%; }
  `,
})
export class CampoFechaComponent implements ControlValueAccessor {
  readonly etiqueta = input('Fecha');
  /** Límites en "aaaa-mm-dd". */
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);
  readonly ayuda = input<string | null>(null);
  readonly mensajeError = input<string | null>(null);
  readonly soloLectura = input(false);
  readonly subscript = input<SubscriptSizing>('dynamic');

  readonly fecha = signal<Date | null>(null);
  readonly deshabilitado = signal(false);
  readonly minimo = computed(() => desdeIso(this.min()));
  readonly maximo = computed(() => desdeIso(this.max()));

  private readonly control = inject(NgControl, { self: true, optional: true });
  /** El campo se pinta en rojo según el control externo (formControlName / ngModel). */
  readonly errores: ErrorStateMatcher = { isErrorState: () => !!this.control?.invalid && !!(this.control.touched || this.control.dirty) };

  private alCambiar: (v: string | null) => void = () => {};
  alTocar: () => void = () => {};

  constructor() {
    if (this.control) this.control.valueAccessor = this;
  }

  elegir(fecha: Date | null): void {
    this.fecha.set(fecha);
    this.alCambiar(fecha ? isoFecha(fecha) : null);
  }

  writeValue(valor: string | null): void {
    this.fecha.set(desdeIso(valor));
  }

  registerOnChange(fn: (v: string | null) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(d: boolean): void {
    this.deshabilitado.set(d);
  }
}
