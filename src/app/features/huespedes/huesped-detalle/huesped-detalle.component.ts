import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HuespedService } from '../../../core/services/huesped.service';
import { ReservaService } from '../../../core/services/reserva.service';
import { FacturaService } from '../../../core/services/finanzas.service';
import { ServicioHotelService } from '../../../core/services/modulos.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { AuthService } from '../../../core/services/auth.service';
import { Huesped } from '../../../core/models/huesped.model';
import { Reserva, claseEstadoReserva, etiquetaEstadoReserva } from '../../../core/models/reserva.model';
import { Factura, etiquetaEstadoFactura } from '../../../core/models/finanzas.model';
import { SolicitudServicio, etiquetaEstadoSolicitud } from '../../../core/models/servicio.model';
import { fechaCorta, moneda } from '../../../core/utils/formato.util';
import { claseEstadoFactura } from '../../finanzas/facturas-list/facturas-list.component';

@Component({
  selector: 'app-huesped-detalle',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (huesped(); as h) {
      <div class="page-header row">
        <div>
          <h1>{{ h.nombreCompleto }}</h1>
          <p>{{ h.tipoDocumento }} {{ h.numeroDocumento }} · {{ h.nacionalidad ?? 'Nacionalidad no registrada' }}</p>
        </div>
        <div class="rx-acciones">
          <a mat-stroked-button routerLink="/huespedes"><mat-icon>arrow_back</mat-icon>Huéspedes</a>
          @if (puedeEditar()) {
            <a mat-flat-button color="primary" [routerLink]="['/huespedes', h.id, 'editar']"><mat-icon>edit</mat-icon>Editar</a>
          }
        </div>
      </div>

      <div class="rx-kpis">
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>event_note</mat-icon>Estancias</span><span class="rx-kpi-valor">{{ resumen().estancias }}</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>bedtime</mat-icon>Noches</span><span class="rx-kpi-valor">{{ resumen().noches }}</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>payments</mat-icon>Facturado</span><span class="rx-kpi-valor">{{ moneda(resumen().facturado) }}</span></div>
        <div class="rx-kpi" [class.rx-kpi--alerta]="resumen().saldo > 0"><span class="rx-kpi-etiqueta"><mat-icon>account_balance_wallet</mat-icon>Saldo pendiente</span><span class="rx-kpi-valor">{{ moneda(resumen().saldo) }}</span></div>
      </div>

      <section class="rx-card">
        <div class="rx-card-titulo"><mat-icon>badge</mat-icon>Datos personales</div>
        <div class="rx-datos">
          <div class="rx-dato"><span>Correo</span><strong>{{ h.email }}</strong></div>
          <div class="rx-dato"><span>Teléfono</span><strong>{{ h.telefono }}</strong></div>
          <div class="rx-dato"><span>Fecha de nacimiento</span><strong>{{ fecha(h.fechaNacimiento) }}</strong></div>
          <div class="rx-dato"><span>Habitación actual</span><strong>{{ h.habitacionActualNumero ?? '—' }}</strong></div>
          <div class="rx-dato"><span>Estado</span><strong>{{ h.activo ? 'Activo' : 'Inactivo' }}</strong></div>
          <div class="rx-dato">
            <span>Tratamiento de datos (Ley 1581)</span>
            <strong>
              @if (h.autorizaTratamientoDatos) { <span class="rx-chip ok">Autorizado {{ fecha(h.fechaHoraAutorizacion, true) }}</span> }
              @else { <span class="rx-chip alerta">Sin autorización</span> }
            </strong>
          </div>
        </div>
        @if (h.notas) { <p class="texto">Notas: {{ h.notas }}</p> }
      </section>

      <section class="rx-card">
        <div class="rx-card-titulo"><mat-icon>history</mat-icon>Historial de reservas ({{ reservas().length }})</div>
        @if (reservas().length === 0) {
          <p class="rx-muted">Sin reservas registradas.</p>
        } @else {
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Reserva</th><th>Habitación</th><th>Fechas</th><th>Estado</th><th class="derecha">Total</th></tr></thead>
              <tbody>
                @for (r of reservas(); track r.id) {
                  <tr>
                    <td data-label="Reserva"><a [routerLink]="['/reservas', r.id]">#{{ r.id }}</a></td>
                    <td data-label="Habitación">{{ r.habitacionNumero }}</td>
                    <td data-label="Fechas" class="ancho">{{ fecha(r.fechaEntrada) }} → {{ fecha(r.fechaSalida) }} ({{ r.cantidadNoches }} n.)</td>
                    <td data-label="Estado"><span class="rx-chip {{ claseReserva(r.estadoReserva) }}">{{ etiquetaReserva(r.estadoReserva) }}</span></td>
                    <td data-label="Total" class="derecha rx-num">{{ moneda(r.totalEstimado) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <div class="rx-grid-2">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>room_service</mat-icon>Servicios consumidos ({{ servicios().length }})</div>
          @for (s of servicios(); track s.id) {
            <div class="linea">
              <span>{{ s.servicioNombre }} × {{ s.cantidad }} <small class="rx-muted">{{ fecha(s.fechaHoraSolicitud) }} · {{ etiquetaSolicitud(s.estado) }}</small></span>
              <strong class="rx-num">{{ moneda(s.total) }}</strong>
            </div>
          } @empty {
            <p class="rx-muted">Sin servicios.</p>
          }
        </section>
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>receipt_long</mat-icon>Facturas ({{ facturas().length }})</div>
          @for (f of facturas(); track f.id) {
            <div class="linea">
              <span><a [routerLink]="['/facturas', f.id]">{{ f.numero }}</a> <small class="rx-muted">{{ fecha(f.fechaEmision) }}</small>
                <span class="rx-chip {{ claseFactura(f.estado) }}">{{ etiquetaFactura(f.estado) }}</span></span>
              <strong class="rx-num">{{ moneda(f.total) }}</strong>
            </div>
          } @empty {
            <p class="rx-muted">{{ verFacturas() ? 'Sin facturas.' : 'Tu rol no tiene acceso a facturas.' }}</p>
          }
        </section>
      </div>
    }
  `,
  styles: `
    .texto { margin: 0.75rem 0 0; font-size: 0.9rem; }
    .linea { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.45rem 0; border-bottom: 1px dashed var(--bg-300); font-size: 0.88rem; }
    .linea small { margin-left: 0.25rem; }
    .linea .rx-chip { margin-left: 0.35rem; }
  `,
})
export class HuespedDetalleComponent implements OnInit {
  private readonly huespedes = inject(HuespedService);
  private readonly reservasService = inject(ReservaService);
  private readonly facturasService = inject(FacturaService);
  private readonly serviciosService = inject(ServicioHotelService);
  private readonly route = inject(ActivatedRoute);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly auth = inject(AuthService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly etiquetaReserva = etiquetaEstadoReserva;
  readonly claseReserva = claseEstadoReserva;
  readonly etiquetaFactura = etiquetaEstadoFactura;
  readonly claseFactura = claseEstadoFactura;
  readonly etiquetaSolicitud = etiquetaEstadoSolicitud;

  readonly cargando = signal(true);
  readonly huesped = signal<Huesped | null>(null);
  readonly reservas = signal<Reserva[]>([]);
  readonly facturas = signal<Factura[]>([]);
  readonly servicios = signal<SolicitudServicio[]>([]);
  readonly puedeEditar = computed(() => this.auth.tieneRol('ADMIN', 'RECEPCION'));
  readonly verFacturas = computed(() => this.auth.tieneRol('ADMIN', 'RECEPCION', 'FINANZAS'));
  readonly resumen = computed(() => {
    const validas = this.reservas().filter((r) => r.estadoReserva !== 'CANCELADA');
    const facturas = this.facturas().filter((f) => f.estado !== 'ANULADA');
    return {
      estancias: validas.length,
      noches: validas.reduce((t, r) => t + r.cantidadNoches, 0),
      facturado: facturas.reduce((t, f) => t + Number(f.total), 0),
      saldo: facturas.reduce((t, f) => t + Number(f.saldo), 0),
    };
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.huespedes.obtener(id).subscribe({
      next: (h) => {
        this.huesped.set(h);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
    this.reservasService.historialHuesped(id).subscribe((r) => this.reservas.set(r));
    this.serviciosService.solicitudes({ huespedId: id }).subscribe({ next: (s) => this.servicios.set(s), error: () => this.servicios.set([]) });
    if (this.verFacturas()) {
      this.facturasService.deHuesped(id).subscribe({ next: (f) => this.facturas.set(f), error: () => this.facturas.set([]) });
    }
  }
}
