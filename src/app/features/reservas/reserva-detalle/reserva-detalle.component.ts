import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReservaService } from '../../../core/services/reserva.service';
import { FacturaService, HotelService } from '../../../core/services/finanzas.service';
import { ServicioHotelService } from '../../../core/services/modulos.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { AuthService } from '../../../core/services/auth.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { CANALES_RESERVA, CanalReserva, Reserva, claseEstadoReserva, etiquetaEstadoReserva } from '../../../core/models/reserva.model';
import { CuentaReserva, etiquetaEstadoFactura } from '../../../core/models/finanzas.model';
import { TIPOS_HABITACION } from '../../../core/models/habitacion.model';
import { SolicitudServicio, etiquetaEstadoSolicitud } from '../../../core/models/servicio.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { fechaCorta, hoyIso, moneda } from '../../../core/utils/formato.util';
import { MotivoDialogComponent } from '../../../shared/dialogs/motivo-dialog/motivo-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { SolicitudDialogComponent } from '../../servicios/servicio-dialogs.component';

/** Editar fechas, canal y observaciones de una reserva confirmada o en curso. */
@Component({
  selector: 'app-editar-reserva-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>edit_calendar</mat-icon></div>
      <div class="header-text"><h2>Editar reserva #{{ data.id }}</h2><p>Habitación {{ data.habitacionNumero }} · {{ data.huesped.nombreCompleto }}</p></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Entrada</mat-label>
          <input matInput type="date" formControlName="fechaEntrada" [readonly]="enCurso" />
          @if (enCurso) { <mat-hint>El huésped ya hizo check-in</mat-hint> }
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Salida</mat-label><input matInput type="date" formControlName="fechaSalida" /></mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Canal</mat-label>
          <mat-select formControlName="canal" panelClass="roomix-select-panel">
            @for (c of canales; track c.value) { <mat-option [value]="c.value">{{ c.label }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full"><mat-label>Observaciones</mat-label><textarea matInput rows="3" formControlName="observaciones" maxlength="500"></textarea></mat-form-field>
      </form>
      <p class="rx-muted">El sistema valida que la habitación esté libre en las nuevas fechas y recalcula el total.</p>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.error { color: #c62828; font-size: 0.85rem; }`,
})
export class EditarReservaDialogComponent {
  readonly data = inject<Reserva>(MAT_DIALOG_DATA);
  private readonly service = inject(ReservaService);
  private readonly ref = inject(MatDialogRef<EditarReservaDialogComponent, Reserva>);
  readonly canales = CANALES_RESERVA;
  readonly enCurso = this.data.estadoReserva === 'EN_CURSO';
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).group({
    fechaEntrada: [this.data.fechaEntrada, Validators.required],
    fechaSalida: [this.data.fechaSalida, Validators.required],
    canal: [(this.data.canal ?? 'PRESENCIAL') as CanalReserva],
    observaciones: [this.data.observaciones ?? ''],
  });

  guardar(): void {
    const v = this.form.getRawValue();
    if (!v.fechaEntrada || !v.fechaSalida || v.fechaSalida <= v.fechaEntrada) {
      this.error.set('La salida debe ser posterior a la entrada.');
      return;
    }
    this.service
      .actualizar(this.data.id, { fechaEntrada: v.fechaEntrada, fechaSalida: v.fechaSalida, canal: v.canal, observaciones: v.observaciones || null })
      .subscribe({ next: (r) => this.ref.close(r), error: (e) => this.error.set(extractApiErrorMessage(e)) });
  }
}

@Component({
  selector: 'app-reserva-detalle',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule],
  template: `
    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (reserva(); as r) {
      <div class="page-header row no-imprimir">
        <div>
          <h1>Reserva #{{ r.id }} <span class="rx-chip {{ claseEstado(r.estadoReserva) }}">{{ etiquetaEstado(r.estadoReserva) }}</span></h1>
          <p>Habitación {{ r.habitacionNumero }} · {{ r.huesped.nombreCompleto }} · {{ fecha(r.fechaEntrada) }} → {{ fecha(r.fechaSalida) }}</p>
        </div>
        <div class="rx-acciones">
          <a mat-stroked-button routerLink="/reservas"><mat-icon>arrow_back</mat-icon>Reservas</a>
          <button mat-stroked-button (click)="imprimir()"><mat-icon>print</mat-icon>Comprobante</button>
          @if (puedeOperar()) {
            @if (r.estadoReserva === 'CONFIRMADA') {
              <button mat-flat-button color="primary" (click)="checkIn()" [disabled]="r.fechaEntrada > hoy"
                      [title]="r.fechaEntrada > hoy ? 'El check-in se habilita el día de llegada' : ''"><mat-icon>login</mat-icon>Check-in</button>
            }
            @if (r.estadoReserva === 'EN_CURSO') {
              <button mat-flat-button color="primary" (click)="checkOut()"><mat-icon>logout</mat-icon>Check-out</button>
            }
            @if (r.estadoReserva === 'CONFIRMADA' || r.estadoReserva === 'EN_CURSO') {
              <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Más acciones"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="editar()"><mat-icon>edit_calendar</mat-icon>Editar reserva</button>
                @if (r.estadoReserva === 'EN_CURSO') {
                  <button mat-menu-item (click)="nuevoServicio()"><mat-icon>room_service</mat-icon>Cargar servicio</button>
                }
                @if (r.estadoReserva === 'CONFIRMADA') {
                  <button mat-menu-item (click)="cancelar()"><mat-icon>event_busy</mat-icon>Cancelar reserva</button>
                }
              </mat-menu>
            }
          }
        </div>
      </div>

      <!-- Encabezado del comprobante impreso -->
      <div class="solo-imprimir comprobante-cabecera">
        @if (hotel(); as h) {
          <h2>{{ h.nombre }}</h2>
          <p>NIT {{ h.nit }} · {{ h.direccion }}, {{ h.ciudad }} · {{ h.telefono }}</p>
        }
        <h3>Comprobante de reserva #{{ r.id }}</h3>
        <p>Estado: {{ etiquetaEstado(r.estadoReserva) }} · Emitido {{ fecha(hoy) }}</p>
      </div>

      @if (r.motivoCancelacion) {
        <div class="aviso"><mat-icon>info</mat-icon>Cancelada el {{ fecha(r.fechaHoraCancelacion, true) }}: {{ r.motivoCancelacion }}</div>
      }

      <div class="rx-grid-2">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>event_note</mat-icon>Estancia</div>
          <div class="rx-datos">
            <div class="rx-dato"><span>Habitación</span><strong><a [routerLink]="['/habitaciones', r.habitacionId]">{{ r.habitacionNumero }}</a> · {{ tipoHab(r) }}</strong></div>
            <div class="rx-dato"><span>Entrada</span><strong>{{ fecha(r.fechaEntrada) }}</strong></div>
            <div class="rx-dato"><span>Salida</span><strong>{{ fecha(r.fechaSalida) }}</strong></div>
            <div class="rx-dato"><span>Noches</span><strong>{{ r.cantidadNoches }}</strong></div>
            <div class="rx-dato"><span>Tarifa por noche</span><strong>{{ moneda(r.tarifaNoche) }}</strong></div>
            <div class="rx-dato"><span>Total alojamiento</span><strong>{{ moneda(r.totalEstimado) }}</strong></div>
            <div class="rx-dato"><span>Check-in real</span><strong>{{ fecha(r.horaRealCheckIn, true) }}</strong></div>
            <div class="rx-dato"><span>Check-out real</span><strong>{{ fecha(r.horaRealCheckOut, true) }}</strong></div>
            <div class="rx-dato"><span>Canal</span><strong>{{ r.canalNombre ?? '—' }}</strong></div>
            <div class="rx-dato"><span>Registrada por</span><strong>{{ r.registradaPor ?? '—' }} · {{ fecha(r.fechaHoraCreacion, true) }}</strong></div>
          </div>
          @if (r.observaciones) { <p class="texto">Observaciones: {{ r.observaciones }}</p> }
        </section>

        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>person</mat-icon>Huésped</div>
          <div class="rx-datos">
            <div class="rx-dato"><span>Nombre</span><strong><a [routerLink]="['/huespedes', r.huesped.id]">{{ r.huesped.nombreCompleto }}</a></strong></div>
            <div class="rx-dato"><span>Documento</span><strong>{{ r.huesped.tipoDocumento }} {{ r.huesped.numeroDocumento }}</strong></div>
            <div class="rx-dato"><span>Correo</span><strong>{{ r.huesped.email }}</strong></div>
            <div class="rx-dato"><span>Teléfono</span><strong>{{ r.huesped.telefono }}</strong></div>
          </div>
        </section>
      </div>

      @if (cuenta(); as c) {
        <section class="rx-card">
          <div class="rx-card-titulo">
            <mat-icon>receipt</mat-icon>Cuenta del huésped
            <span class="spacer"></span>
            @if (puedeFacturar() && hayPendiente() && r.estadoReserva !== 'CANCELADA') {
              <button mat-stroked-button class="no-imprimir" (click)="facturar()"><mat-icon>receipt_long</mat-icon>Facturar</button>
            }
          </div>
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Concepto</th><th class="derecha">Cant.</th><th class="derecha">Valor unit.</th><th class="derecha">Total</th><th>Estado</th></tr></thead>
              <tbody>
                @for (l of c.lineas; track $index) {
                  <tr>
                    <td data-label="Concepto" class="ancho">{{ l.descripcion }}</td>
                    <td data-label="Cant." class="derecha">{{ l.cantidad }}</td>
                    <td data-label="Valor unit." class="derecha rx-num">{{ moneda(l.valorUnitario) }}</td>
                    <td data-label="Total" class="derecha rx-num">{{ moneda(l.total) }}</td>
                    <td data-label="Estado"><span class="rx-chip" [class.ok]="l.facturado" [class.neutro]="!l.facturado">{{ l.facturado ? 'Facturado' : 'Pendiente' }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="totales">
            <div><span>Subtotal</span><strong class="rx-num">{{ moneda(c.subtotal) }}</strong></div>
            <div><span>IVA {{ c.exentoIva ? '(exento, art. 481 E.T.)' : c.porcentajeImpuesto + ' %' }}</span><strong class="rx-num">{{ moneda(c.impuesto) }}</strong></div>
            <div class="total"><span>Total</span><strong class="rx-num">{{ moneda(c.total) }}</strong></div>
            <div><span>Pagado</span><strong class="rx-num">{{ moneda(c.totalPagado) }}</strong></div>
            <div class="saldo" [class.pendiente]="c.saldo > 0"><span>Saldo</span><strong class="rx-num">{{ moneda(c.saldo) }}</strong></div>
          </div>
          @if (c.facturas.length) {
            <div class="facturas no-imprimir">
              @for (f of c.facturas; track f.id) {
                <a mat-stroked-button [routerLink]="['/facturas', f.id]"><mat-icon>description</mat-icon>{{ f.numero }} · {{ etiquetaFactura(f.estado) }}</a>
              }
            </div>
          }
        </section>
      }

      @if (servicios().length) {
        <section class="rx-card no-imprimir">
          <div class="rx-card-titulo"><mat-icon>room_service</mat-icon>Servicios solicitados</div>
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Servicio</th><th>Fecha</th><th>Estado</th><th class="derecha">Total</th></tr></thead>
              <tbody>
                @for (s of servicios(); track s.id) {
                  <tr>
                    <td data-label="Servicio" class="ancho">{{ s.servicioNombre }} × {{ s.cantidad }}</td>
                    <td data-label="Fecha">{{ fecha(s.fechaHoraSolicitud, true) }}</td>
                    <td data-label="Estado">{{ etiquetaSolicitud(s.estado) }}</td>
                    <td data-label="Total" class="derecha rx-num">{{ moneda(s.total) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <p class="solo-imprimir pie">Datos personales tratados conforme a la Ley 1581 de 2012 y la política de tratamiento de datos del hotel.</p>
    } @else {
      <div class="rx-vacio"><mat-icon>error</mat-icon><p>{{ error() ?? 'Reserva no encontrada' }}</p></div>
    }
  `,
  styles: `
    h1 .rx-chip { vertical-align: middle; font-size: 0.75rem; }
    .rx-card-titulo { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .spacer { flex: 1; }
    .aviso { display: flex; gap: 0.5rem; align-items: center; padding: 0.7rem 1rem; margin-bottom: 1rem; border-radius: 12px; background: #fdecea; color: #8e1c1c; }
    .texto { margin: 0.75rem 0 0; font-size: 0.9rem; }
    .totales { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; margin-top: 0.75rem; }
    .totales div { display: flex; gap: 1.25rem; justify-content: space-between; min-width: min(320px, 100%); font-size: 0.9rem; }
    .totales .total { font-size: 1.05rem; border-top: 1px solid var(--bg-300); padding-top: 0.25rem; }
    .saldo.pendiente strong { color: #c62828; }
    .facturas { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
    .comprobante-cabecera h2 { margin: 0; }
    .comprobante-cabecera p { margin: 0.15rem 0; font-size: 0.85rem; }
    .pie { font-size: 0.75rem; margin-top: 1rem; }
  `,
})
export class ReservaDetalleComponent implements OnInit {
  private readonly service = inject(ReservaService);
  private readonly facturas = inject(FacturaService);
  private readonly serviciosService = inject(ServicioHotelService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly auth = inject(AuthService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly etiquetaEstado = etiquetaEstadoReserva;
  readonly claseEstado = claseEstadoReserva;
  readonly etiquetaFactura = etiquetaEstadoFactura;
  readonly etiquetaSolicitud = etiquetaEstadoSolicitud;
  readonly hoy = hoyIso();
  readonly hotel = toSignal(inject(HotelService).datos());

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly reserva = signal<Reserva | null>(null);
  readonly cuenta = signal<CuentaReserva | null>(null);
  readonly servicios = signal<SolicitudServicio[]>([]);
  readonly puedeOperar = computed(() => this.auth.tieneRol('ADMIN', 'RECEPCION'));
  readonly puedeFacturar = computed(() => this.auth.tieneRol('ADMIN', 'RECEPCION', 'FINANZAS'));
  readonly hayPendiente = computed(() => (this.cuenta()?.lineas ?? []).some((l) => !l.facturado));

  private get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.service.obtener(this.id).subscribe({
      next: (r) => {
        this.reserva.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(extractApiErrorMessage(e));
        this.cargando.set(false);
      },
    });
    this.cargarCuenta();
  }

  private cargarCuenta(): void {
    if (this.puedeFacturar()) {
      this.facturas.cuentaReserva(this.id).subscribe({ next: (c) => this.cuenta.set(c), error: () => this.cuenta.set(null) });
    }
    this.serviciosService.solicitudes({ reservaId: this.id }).subscribe({ next: (s) => this.servicios.set(s), error: () => this.servicios.set([]) });
  }

  private refrescar(r: Reserva): void {
    this.reserva.set(r);
    this.cargarCuenta();
  }

  editar(): void {
    this.dialog
      .open(EditarReservaDialogComponent, { ...roomixDialogConfig({ width: '520px' }), data: this.reserva() })
      .afterClosed()
      .subscribe((r?: Reserva) => {
        if (r) {
          this.refrescar(r);
          this.snack.open('Reserva actualizada', 'OK', { duration: 2500 });
        }
      });
  }

  cancelar(): void {
    const r = this.reserva()!;
    this.dialog
      .open(MotivoDialogComponent, {
        ...roomixDialogConfig({ width: '460px' }),
        data: { title: 'Cancelar reserva', message: `Reserva #${r.id} de ${r.huesped.nombreCompleto}, habitación ${r.habitacionNumero}.`, confirmLabel: 'Cancelar reserva', label: 'Motivo de la cancelación' },
      })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.service.cancelar(r.id, motivo).subscribe({
          next: (res) => {
            this.refrescar(res);
            this.snack.open('Reserva cancelada', 'OK', { duration: 2500 });
          },
          error: (e) => this.errorDialog.mostrarDesdeApi(e),
        });
      });
  }

  checkIn(): void {
    this.service.checkIn(this.reserva()!.id).subscribe({
      next: () => {
        this.snack.open('Check-in registrado', 'OK', { duration: 2500 });
        this.service.obtener(this.id).subscribe((r) => this.refrescar(r));
      },
      error: (e) => this.errorDialog.mostrarDesdeApi(e),
    });
  }

  checkOut(): void {
    const r = this.reserva()!;
    this.dialog
      .open(ConfirmDialogComponent, {
        ...roomixDialogConfig({ width: '440px' }),
        data: { title: 'Registrar check-out', message: `Se cerrará la estancia de ${r.huesped.nombreCompleto} y se generará la factura con los consumos pendientes.`, confirmLabel: 'Hacer check-out', icon: 'logout' },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.service.checkOut(r.id).subscribe({
          next: (res) => {
            this.refrescar(res.reserva);
            if (res.factura) {
              this.snack.open(`Check-out listo. Factura ${res.factura.numero} generada`, 'Ver factura', { duration: 6000 })
                .onAction()
                .subscribe(() => this.router.navigate(['/facturas', res.factura!.id]));
            } else {
              this.snack.open('Check-out registrado', 'OK', { duration: 2500 });
            }
          },
          error: (e) => this.errorDialog.mostrarDesdeApi(e),
        });
      });
  }

  nuevoServicio(): void {
    this.dialog
      .open(SolicitudDialogComponent, { ...roomixDialogConfig({ width: '600px' }), data: { reservaId: this.id } })
      .afterClosed()
      .subscribe((ok) => ok && this.cargarCuenta());
  }

  facturar(): void {
    this.facturas.facturarReserva(this.id).subscribe({
      next: (f) => {
        this.snack.open(`Factura ${f.numero} generada`, 'OK', { duration: 3000 });
        this.router.navigate(['/facturas', f.id]);
      },
      error: (e) => this.errorDialog.mostrarDesdeApi(e),
    });
  }

  tipoHab(r: Reserva): string {
    return TIPOS_HABITACION.find((t) => t.value === r.tipoHabitacion)?.label ?? r.tipoHabitacion;
  }

  imprimir(): void {
    window.print();
  }
}
