import { Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { hoyIso, isoFecha, sumarDias } from '../../core/utils/formato.util';

export interface Periodo {
  desde: string;
  hasta: string;
}

type Opcion = 'mes' | 'mes-anterior' | '7' | '30' | '90' | 'anio' | 'personalizado';

/** Selector de periodo (rango de fechas) para reportes y finanzas, en una sola fila. */
@Component({
  selector: 'rx-periodo',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>Periodo</mat-label>
      <mat-select [(ngModel)]="opcion" (selectionChange)="aplicar()" panelClass="roomix-select-panel">
        <mat-option value="mes">Este mes</mat-option>
        <mat-option value="mes-anterior">Mes anterior</mat-option>
        <mat-option value="7">Últimos 7 días</mat-option>
        <mat-option value="30">Últimos 30 días</mat-option>
        <mat-option value="90">Últimos 90 días</mat-option>
        <mat-option value="anio">Este año</mat-option>
        <mat-option value="personalizado">Personalizado…</mat-option>
      </mat-select>
    </mat-form-field>
    @if (opcion === 'personalizado') {
      <mat-form-field appearance="outline">
        <mat-label>Desde</mat-label>
        <input matInput type="date" [(ngModel)]="desde" (change)="emitir()" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Hasta</mat-label>
        <input matInput type="date" [(ngModel)]="hasta" (change)="emitir()" />
      </mat-form-field>
    }
  `,
  styles: `:host { display: contents; }`,
})
export class PeriodoSelectorComponent implements OnInit {
  readonly inicial = input<Opcion>('mes');
  readonly cambio = output<Periodo>();
  readonly etiqueta = signal('');

  opcion: Opcion = 'mes';
  desde = hoyIso();
  hasta = hoyIso();

  ngOnInit(): void {
    this.opcion = this.inicial();
    this.aplicar();
  }

  aplicar(): void {
    const hoy = new Date();
    switch (this.opcion) {
      case 'mes':
        this.desde = isoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        this.hasta = hoyIso();
        break;
      case 'mes-anterior':
        this.desde = isoFecha(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
        this.hasta = isoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 0));
        break;
      case '7':
      case '30':
      case '90':
        this.desde = isoFecha(sumarDias(hoy, -(Number(this.opcion) - 1)));
        this.hasta = hoyIso();
        break;
      case 'anio':
        this.desde = isoFecha(new Date(hoy.getFullYear(), 0, 1));
        this.hasta = hoyIso();
        break;
      default:
        break;
    }
    this.emitir();
  }

  emitir(): void {
    if (this.desde && this.hasta) {
      this.cambio.emit({ desde: this.desde, hasta: this.hasta });
    }
  }
}
