import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Anulacion, AuditoriaService } from '../../../core/services/modulos.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { fechaCorta, hoyIso, isoFecha, moneda, sumarDias } from '../../../core/utils/formato.util';
import { CampoFechaComponent } from '../../../shared/formularios/campo-fecha.component';

const TIPOS: Record<string, string> = { FACTURA: 'Factura', VENTA: 'Venta', INGRESO: 'Ingreso', EGRESO: 'Egreso' };

/**
 * Anulaciones para revisión: qué se anuló, por cuánto, por qué, quién lo registró y quién lo anuló. Se resaltan las que
 * anuló la misma persona que las registró.
 */
@Component({
  selector: 'app-anulaciones',
  imports: [CampoFechaComponent, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSlideToggleModule],
  template: `
    <div class="rx-toolbar">
      <rx-campo-fecha etiqueta="Desde" [ngModel]="desde" (ngModelChange)="desde = $event; cargar()" />
      <rx-campo-fecha etiqueta="Hasta" [ngModel]="hasta" (ngModelChange)="hasta = $event; cargar()" />
      <mat-slide-toggle [ngModel]="soloPropias()" (ngModelChange)="soloPropias.set($event)">Solo las que anuló quien las registró</mat-slide-toggle>
    </div>

    <div class="rx-kpis">
      <div class="rx-kpi">
        <span class="rx-kpi-etiqueta"><mat-icon>block</mat-icon>Anulaciones</span>
        <span class="rx-kpi-valor">{{ lista().length }}</span>
        <span class="rx-kpi-sub">{{ moneda(totalValor()) }} en total</span>
      </div>
      <div class="rx-kpi" [class.rx-kpi--alerta]="propias() > 0">
        <span class="rx-kpi-etiqueta"><mat-icon>warning</mat-icon>Anuló lo que registró</span>
        <span class="rx-kpi-valor">{{ propias() }}</span>
        <span class="rx-kpi-sub">Revise que tengan un motivo claro</span>
      </div>
    </div>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="40" /></div>
    } @else if (filtradas().length === 0) {
      <div class="rx-vacio"><mat-icon>verified</mat-icon><p>No hay anulaciones en ese periodo.</p></div>
    } @else {
      <div class="rx-tabla-wrap">
        <table class="rx-tabla">
          <thead>
            <tr><th>Fecha</th><th>Qué se anuló</th><th class="derecha">Valor</th><th>Motivo</th><th>Registró</th><th>Anuló</th></tr>
          </thead>
          <tbody>
            @for (a of filtradas(); track a.tipo + a.id) {
              <tr [class.propia]="a.mismaPersona">
                <td data-label="Fecha" class="rx-num">{{ fecha(a.fechaHora, true) }}</td>
                <td data-label="Qué se anuló" class="ancho">
                  <span class="rx-chip neutro">{{ tipo(a.tipo) }}</span> <strong>{{ a.referencia }}</strong>
                  <span class="sub">{{ a.descripcion }}</span>
                </td>
                <td data-label="Valor" class="derecha rx-num">{{ moneda(a.valor) }}</td>
                <td data-label="Motivo" class="ancho">{{ a.motivo || '—' }}</td>
                <td data-label="Registró">{{ a.registradoPor || '—' }}</td>
                <td data-label="Anuló">
                  {{ a.anuladoPor || '—' }}
                  @if (a.mismaPersona) { <span class="rx-chip alerta">La misma persona</span> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .rx-toolbar { align-items: center; }
    .sub { display: block; font-size: 0.78rem; color: var(--text-200); margin-top: 0.15rem; }
    .derecha { text-align: right; }
    tr.propia td { background: rgba(245, 196, 85, 0.12); }
  `,
})
export class AnulacionesComponent implements OnInit {
  private readonly service = inject(AuditoriaService);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  desde = isoFecha(sumarDias(new Date(), -30));
  hasta = hoyIso();
  readonly cargando = signal(true);
  readonly lista = signal<Anulacion[]>([]);
  readonly soloPropias = signal(false);

  readonly filtradas = computed(() => (this.soloPropias() ? this.lista().filter((a) => a.mismaPersona) : this.lista()));
  readonly propias = computed(() => this.lista().filter((a) => a.mismaPersona).length);
  readonly totalValor = computed(() => this.lista().reduce((t, a) => t + (a.valor ?? 0), 0));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.anulaciones(this.desde, this.hasta).subscribe({
      next: (l) => {
        this.lista.set(l);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  tipo(t: string): string {
    return TIPOS[t] ?? t;
  }
}
