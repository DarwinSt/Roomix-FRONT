import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ROOMIX_LOGO_URL } from '../../core/config/brand.config';
import { roomixDialogConfig } from '../../core/config/dialog.config';
import { DashboardService } from '../../core/services/modulos.service';
import { ReservaService } from '../../core/services/reserva.service';
import { ErrorDialogService } from '../../core/services/error-dialog.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertaDashboard, Dashboard, MovimientoHuespedDia } from '../../core/models/dashboard.model';
import { EstadoHabitacion } from '../../core/models/habitacion.model';
import { etiquetaRol } from '../../core/models/auth.model';
import { metaEstado } from '../../core/utils/habitacion-estado.util';
import { etiquetaUltimaActualizacion, programarAutoRefresh } from '../../core/utils/auto-refresh.util';
import { fechaCorta, moneda, porcentaje } from '../../core/utils/formato.util';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog/confirm-dialog.component';

interface KpiHabitacion {
  etiqueta: string;
  valor: number;
  icon: string;
  cssClass: string;
  estado: EstadoHabitacion | null;
}

/** Panel del día: indicadores, llegadas/salidas con check-in/out rápido, alertas y finanzas según el rol. */
@Component({
  selector: 'app-home',
  imports: [RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly reservaService = inject(ReservaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  readonly logoUrl = ROOMIX_LOGO_URL;
  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly pct = (v: number) => porcentaje(v, 0);

  readonly loading = signal(true);
  readonly procesando = signal<number | null>(null);
  readonly dashboard = signal<Dashboard | null>(null);
  readonly ultimaActualizacion = signal<Date | null>(null);
  readonly etiquetaSync = computed(() => etiquetaUltimaActualizacion(this.ultimaActualizacion()));
  readonly primerNombre = computed(() => this.auth.usuario()?.nombreCompleto?.split(' ')[0] ?? '');
  readonly rolNombre = computed(() => etiquetaRol(this.auth.rol()));
  readonly puedeOperar = computed(() => this.auth.tieneRol('ADMIN', 'RECEPCION'));

  readonly saludo = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  readonly kpisHabitaciones = computed<KpiHabitacion[]>(() => {
    const h = this.dashboard()?.habitaciones;
    if (!h) return [];
    const m = (e: EstadoHabitacion) => metaEstado(e);
    return [
      { etiqueta: 'Disponibles', valor: h.libres, icon: m('LIBRE').icon, cssClass: m('LIBRE').cssClass, estado: 'LIBRE' },
      { etiqueta: 'Reservadas', valor: h.reservadas, icon: m('RESERVADO').icon, cssClass: m('RESERVADO').cssClass, estado: 'RESERVADO' },
      { etiqueta: 'Ocupadas', valor: h.ocupadas, icon: m('OCUPADO').icon, cssClass: m('OCUPADO').cssClass, estado: 'OCUPADO' },
      { etiqueta: 'En limpieza', valor: h.enLimpieza, icon: 'cleaning_services', cssClass: 'estado-limpieza', estado: 'INHABILITADO' },
      { etiqueta: 'En mantenimiento', valor: h.enMantenimiento, icon: 'build', cssClass: m('INHABILITADO').cssClass, estado: 'INHABILITADO' },
    ];
  });

  ngOnInit(): void {
    this.cargar(true);
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cargar(mostrar: boolean): void {
    if (mostrar) this.loading.set(true);
    this.dashboardService.obtener().subscribe({
      next: (d) => {
        this.dashboard.set(d);
        this.ultimaActualizacion.set(new Date());
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (mostrar) this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }

  irAHabitaciones(estado: EstadoHabitacion | null): void {
    void this.router.navigate(['/habitaciones'], { queryParams: estado ? { estado } : {} });
  }

  irAlerta(a: AlertaDashboard): void {
    if (a.ruta) void this.router.navigateByUrl(a.ruta);
  }

  iconoAlerta(a: AlertaDashboard): string {
    return a.nivel === 'CRITICA' ? 'error' : a.nivel === 'ADVERTENCIA' ? 'warning' : 'info';
  }

  checkIn(m: MovimientoHuespedDia): void {
    this.procesando.set(m.reservaId);
    this.reservaService.checkIn(m.reservaId).subscribe({
      next: () => {
        this.procesando.set(null);
        this.snack.open(`Check-in de ${m.huespedNombre} en la habitación ${m.habitacionNumero}`, 'OK', { duration: 3000 });
        this.cargar(false);
      },
      error: (err) => {
        this.procesando.set(null);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }

  checkOut(m: MovimientoHuespedDia): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        ...roomixDialogConfig({ width: '440px' }),
        data: {
          title: 'Registrar check-out',
          message: `${m.huespedNombre} · habitación ${m.habitacionNumero}. Se generará la factura con los consumos pendientes.`,
          confirmLabel: 'Hacer check-out',
          icon: 'logout',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.procesando.set(m.reservaId);
        this.reservaService.checkOut(m.reservaId).subscribe({
          next: (res) => {
            this.procesando.set(null);
            this.cargar(false);
            if (res.factura) {
              this.snack
                .open(`Check-out listo. Factura ${res.factura.numero}`, 'Ver factura', { duration: 6000 })
                .onAction()
                .subscribe(() => this.router.navigate(['/facturas', res.factura!.id]));
            } else {
              this.snack.open('Check-out registrado', 'OK', { duration: 3000 });
            }
          },
          error: (err) => {
            this.procesando.set(null);
            this.errorDialog.mostrarDesdeApi(err);
          },
        });
      });
  }

  hora(v: string): string {
    return v.slice(11, 16);
  }
}
