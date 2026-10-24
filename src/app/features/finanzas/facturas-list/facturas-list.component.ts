import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FacturaService } from '../../../core/services/finanzas.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { ESTADOS_FACTURA, EstadoFactura, Factura, etiquetaEstadoFactura } from '../../../core/models/finanzas.model';
import { descargarCsv, fechaCorta, moneda } from '../../../core/utils/formato.util';

export function claseEstadoFactura(e: EstadoFactura): string {
  return { PENDIENTE: 'alerta', PAGADA_PARCIAL: 'info', PAGADA: 'ok', ANULADA: 'critico' }[e];
}

@Component({
  selector: 'app-facturas-list',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule],
  template: `
    <div class="page-header row">
      <div>
        <h1>Facturas</h1>
        <p>Facturación de estadías (se emite al hacer check-out) y de eventos. Registre aquí los pagos.</p>
      </div>
      <button mat-stroked-button (click)="exportar()" [disabled]="facturas().length === 0"><mat-icon>download</mat-icon>Exportar CSV</button>
    </div>

    <div class="rx-toolbar">
      <mat-form-field appearance="outline">
        <mat-label>Estado</mat-label>
        <mat-select [(ngModel)]="estado" (selectionChange)="cargar(0)" panelClass="roomix-select-panel">
          <mat-option value="">Todos</mat-option>
          @for (e of estados; track e.value) { <mat-option [value]="e.value">{{ e.label }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Número, cliente o documento</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [(ngModel)]="texto" (keyup.enter)="cargar(0)" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Desde</mat-label>
        <input matInput type="date" [(ngModel)]="desde" (change)="cargar(0)" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Hasta</mat-label>
        <input matInput type="date" [(ngModel)]="hasta" (change)="cargar(0)" />
      </mat-form-field>
    </div>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (facturas().length === 0) {
      <div class="rx-vacio"><mat-icon>receipt_long</mat-icon><p>No hay facturas con esos filtros.</p></div>
    } @else {
      <div class="rx-tabla-wrap">
        <table class="rx-tabla">
          <thead>
            <tr><th>Factura</th><th>Cliente</th><th>Origen</th><th class="derecha">Total</th><th class="derecha">Saldo</th><th>Estado</th></tr>
          </thead>
          <tbody>
            @for (f of facturas(); track f.id) {
              <tr class="clicable" (click)="abrir(f)">
                <td data-label="Factura"><strong>{{ f.numero }}</strong><span class="sub">{{ fecha(f.fechaEmision, true) }}</span></td>
                <td data-label="Cliente" class="ancho">{{ f.clienteNombre }}<span class="sub">{{ f.clienteDocumento }}</span></td>
                <td data-label="Origen">
                  @if (f.reservaId) { Hab. {{ f.habitacionNumero }} } @else if (f.eventoId) { Evento } @else { — }
                </td>
                <td data-label="Total" class="derecha rx-num">{{ moneda(f.total) }}</td>
                <td data-label="Saldo" class="derecha rx-num">{{ moneda(f.saldo) }}</td>
                <td data-label="Estado"><span class="rx-chip {{ clase(f.estado) }}">{{ etiqueta(f.estado) }}</span></td>
              </tr>
            }
          </tbody>
        </table>
        <div class="rx-paginacion">
          <span>{{ total() }} factura(s) · página {{ pagina() + 1 }} de {{ totalPaginas() || 1 }}</span>
          <button mat-icon-button (click)="cargar(pagina() - 1)" [disabled]="pagina() === 0" aria-label="Anterior"><mat-icon>chevron_left</mat-icon></button>
          <button mat-icon-button (click)="cargar(pagina() + 1)" [disabled]="pagina() + 1 >= totalPaginas()" aria-label="Siguiente"><mat-icon>chevron_right</mat-icon></button>
        </div>
      </div>
    }
  `,
})
export class FacturasListComponent implements OnInit {
  private readonly service = inject(FacturaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly router = inject(Router);

  readonly estados = ESTADOS_FACTURA;
  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly etiqueta = etiquetaEstadoFactura;
  readonly clase = claseEstadoFactura;
  readonly cargando = signal(true);
  readonly facturas = signal<Factura[]>([]);
  readonly pagina = signal(0);
  readonly total = signal(0);
  readonly totalPaginas = signal(0);

  estado: EstadoFactura | '' = (inject(ActivatedRoute).snapshot.queryParamMap.get('estado') as EstadoFactura) ?? '';
  texto = '';
  desde = '';
  hasta = '';

  ngOnInit(): void {
    this.cargar(0);
  }

  cargar(pagina: number): void {
    this.cargando.set(true);
    this.service.listar({ estado: this.estado, texto: this.texto, desde: this.desde, hasta: this.hasta, pagina, tamano: 25 }).subscribe({
      next: (p) => {
        this.facturas.set(p.contenido);
        this.pagina.set(p.pagina);
        this.total.set(p.totalElementos);
        this.totalPaginas.set(p.totalPaginas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  abrir(f: Factura): void {
    this.router.navigate(['/facturas', f.id]);
  }

  exportar(): void {
    descargarCsv('facturas.csv', ['Número', 'Fecha', 'Cliente', 'Documento', 'Subtotal', 'IVA', 'Total', 'Pagado', 'Saldo', 'Estado'],
      this.facturas().map((f) => [f.numero, f.fechaEmision, f.clienteNombre, f.clienteDocumento, f.subtotal, f.impuesto, f.total,
        f.totalPagado, f.saldo, this.etiqueta(f.estado)]));
  }
}
