import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReservaService } from '../../../core/services/reserva.service';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { AuthService } from '../../../core/services/auth.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import {
  ESTADOS_RESERVA_FILTRO,
  Reserva,
  claseEstadoReserva,
  etiquetaEstadoReserva,
  formatearMoneda,
} from '../../../core/models/reserva.model';
import { Habitacion, TIPOS_HABITACION } from '../../../core/models/habitacion.model';
import type { EstadoReserva } from '../../../core/models/habitacion.model';
import { etiquetaUltimaActualizacion, programarAutoRefresh } from '../../../core/utils/auto-refresh.util';
import { fechaCorta, hoyIso, isoFecha, sumarDias } from '../../../core/utils/formato.util';
import { PaginadorComponent } from '../../../shared/paginador/paginador.component';
import { MotivoDialogComponent } from '../../../shared/dialogs/motivo-dialog/motivo-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { EditarReservaDialogComponent } from '../reserva-detalle/reserva-detalle.component';

type VistaReservas = 'listado' | 'calendario';
type VistaCalendario = 'mes' | 'semana' | 'dia';

interface DiaMes {
  iso: string;
  numero: number;
  enMes: boolean;
  esHoy: boolean;
  llegadas: number;
  salidas: number;
  ocupadas: number;
}

interface BarraSemana {
  reserva: Reserva;
  inicio: number; // columna 0..6
  fin: number; // columna exclusiva 1..7
  continuaAntes: boolean;
  continuaDespues: boolean;
}

interface FilaSemana {
  habitacion: string;
  tipo: string;
  barras: BarraSemana[];
}

const ACTIVAS: EstadoReserva[] = ['CONFIRMADA', 'EN_CURSO', 'FINALIZADA'];

@Component({
  selector: 'app-reservas-list',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PaginadorComponent,
  ],
  templateUrl: './reservas-list.component.html',
  styleUrl: './reservas-list.component.scss',
})
export class ReservasListComponent implements OnInit {
  private readonly reservaService = inject(ReservaService);
  private readonly habitacionService = inject(HabitacionService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly puedeOperar = computed(() => this.auth.tieneRol('ADMIN', 'RECEPCION'));
  readonly estadosFiltro = ESTADOS_RESERVA_FILTRO;
  readonly etiquetaEstado = etiquetaEstadoReserva;
  readonly claseEstado = claseEstadoReserva;
  readonly moneda = formatearMoneda;
  readonly fecha = fechaCorta;
  readonly hoy = hoyIso();
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly loading = signal(true);
  readonly reservas = signal<Reserva[]>([]);
  readonly habitaciones = signal<Habitacion[]>([]);
  readonly ultimaActualizacion = signal<Date | null>(null);
  readonly etiquetaSync = computed(() => etiquetaUltimaActualizacion(this.ultimaActualizacion()));

  // ---------------------------------------------------------------- Listado
  readonly vista = signal<VistaReservas>('listado');
  readonly filtroEstado = signal<EstadoReserva | ''>('');
  readonly busqueda = signal('');
  readonly pagina = signal(0);
  readonly tamano = signal(10);

  readonly resumen = computed(() => {
    const l = this.reservas();
    return {
      total: l.length,
      activas: l.filter((r) => r.estadoReserva === 'CONFIRMADA' || r.estadoReserva === 'EN_CURSO').length,
      llegadasHoy: l.filter((r) => r.estadoReserva === 'CONFIRMADA' && r.fechaEntrada === this.hoy).length,
      salidasHoy: l.filter((r) => r.estadoReserva === 'EN_CURSO' && r.fechaSalida <= this.hoy).length,
    };
  });

  readonly filtradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const est = this.filtroEstado();
    return this.reservas()
      .filter((r) => !est || r.estadoReserva === est)
      .filter(
        (r) =>
          !q ||
          r.habitacionNumero.toLowerCase().includes(q) ||
          r.huesped.nombreCompleto.toLowerCase().includes(q) ||
          r.huesped.numeroDocumento.toLowerCase().includes(q) ||
          String(r.id) === q.replace('#', ''),
      )
      .sort((a, b) => b.fechaEntrada.localeCompare(a.fechaEntrada) || b.id - a.id);
  });

  readonly paginaActual = computed(() => {
    const i = this.pagina() * this.tamano();
    return this.filtradas().slice(i, i + this.tamano());
  });

  // ---------------------------------------------------------------- Calendario
  readonly vistaCal = signal<VistaCalendario>('mes');
  /** Día de referencia del calendario (ISO). */
  readonly referencia = signal(hoyIso());

  private readonly vigentes = computed(() => this.reservas().filter((r) => ACTIVAS.includes(r.estadoReserva)));

  readonly tituloCal = computed(() => {
    const ref = this.aFecha(this.referencia());
    if (this.vistaCal() === 'mes') return ref.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    if (this.vistaCal() === 'dia') {
      return ref.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    const ini = this.inicioSemana(ref);
    const fin = sumarDias(ini, 6);
    const f = (d: Date, mes: boolean) => d.toLocaleDateString('es-CO', mes ? { day: 'numeric', month: 'short' } : { day: 'numeric' });
    return `${f(ini, ini.getMonth() !== fin.getMonth())} – ${f(fin, true)} ${fin.getFullYear()}`;
  });

  readonly diasMes = computed((): DiaMes[] => {
    const ref = this.aFecha(this.referencia());
    const primero = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const inicio = this.inicioSemana(primero);
    const totalHab = this.habitaciones().length || 1;
    const dias: DiaMes[] = [];
    for (let i = 0; i < 42; i++) {
      const d = sumarDias(inicio, i);
      if (i >= 35 && d.getMonth() !== ref.getMonth()) break;
      const iso = isoFecha(d);
      const vig = this.vigentes();
      dias.push({
        iso,
        numero: d.getDate(),
        enMes: d.getMonth() === ref.getMonth(),
        esHoy: iso === this.hoy,
        llegadas: vig.filter((r) => r.fechaEntrada === iso).length,
        salidas: vig.filter((r) => r.fechaSalida === iso).length,
        ocupadas: Math.min(totalHab, vig.filter((r) => r.fechaEntrada <= iso && iso < r.fechaSalida).length),
      });
    }
    return dias;
  });

  readonly totalHabitaciones = computed(() => this.habitaciones().length);

  readonly diasDeSemana = computed(() => {
    const ini = this.inicioSemana(this.aFecha(this.referencia()));
    return Array.from({ length: 7 }, (_, i) => {
      const d = sumarDias(ini, i);
      return { iso: isoFecha(d), etiqueta: this.diasSemana[i], numero: d.getDate(), esHoy: isoFecha(d) === this.hoy };
    });
  });

  readonly filasSemana = computed((): FilaSemana[] => {
    const dias = this.diasDeSemana();
    const ini = dias[0].iso;
    const finExcl = isoFecha(sumarDias(this.aFecha(dias[6].iso), 1));
    const idx = (iso: string) => dias.findIndex((d) => d.iso === iso);
    const habs = [...this.habitaciones()].sort((a, b) => a.numero.localeCompare(b.numero, 'es', { numeric: true }));
    return habs.map((h) => ({
      habitacion: h.numero,
      tipo: TIPOS_HABITACION.find((t) => t.value === h.tipoHabitacion)?.label ?? h.tipoHabitacion,
      barras: this.vigentes()
        .filter((r) => r.habitacionNumero === h.numero && r.fechaEntrada < finExcl && r.fechaSalida > ini)
        .map((r) => ({
          reserva: r,
          inicio: r.fechaEntrada < ini ? 0 : idx(r.fechaEntrada),
          fin: r.fechaSalida >= finExcl ? 7 : idx(r.fechaSalida),
          continuaAntes: r.fechaEntrada < ini,
          continuaDespues: r.fechaSalida > finExcl,
        }))
        .filter((b) => b.fin > b.inicio),
    }));
  });

  readonly agendaDia = computed(() => {
    const iso = this.referencia();
    const vig = this.vigentes();
    return {
      llegadas: vig.filter((r) => r.fechaEntrada === iso),
      salidas: vig.filter((r) => r.fechaSalida === iso),
      hospedados: vig.filter((r) => r.fechaEntrada < iso && iso < r.fechaSalida),
    };
  });

  ngOnInit(): void {
    this.cargar(true);
    this.habitacionService.listar().subscribe({ next: (h) => this.habitaciones.set(h), error: () => this.habitaciones.set([]) });
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cargar(mostrar: boolean): void {
    if (mostrar) this.loading.set(true);
    this.reservaService.listar().subscribe({
      next: (data) => {
        this.reservas.set(data);
        this.ultimaActualizacion.set(new Date());
        this.loading.set(false);
        const maxPag = Math.max(0, Math.ceil(this.filtradas().length / this.tamano()) - 1);
        if (this.pagina() > maxPag) this.pagina.set(maxPag);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }

  // ---------------------------------------------------------------- Filtros y paginación
  cambiarFiltro(estado: EstadoReserva | ''): void {
    this.filtroEstado.set(estado);
    this.pagina.set(0);
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(0);
  }

  cambiarTamano(t: number): void {
    this.tamano.set(t);
    this.pagina.set(0);
  }

  abrir(r: Reserva): void {
    void this.router.navigate(['/reservas', r.id]);
  }

  // ---------------------------------------------------------------- Acciones (CRUD)
  editar(r: Reserva): void {
    this.dialog
      .open(EditarReservaDialogComponent, { ...roomixDialogConfig({ width: '520px' }), data: r })
      .afterClosed()
      .subscribe((res?: Reserva) => {
        if (res) {
          this.snack.open('Reserva actualizada', 'OK', { duration: 2500 });
          this.cargar(false);
        }
      });
  }

  cancelar(r: Reserva): void {
    this.dialog
      .open(MotivoDialogComponent, {
        ...roomixDialogConfig({ width: '460px' }),
        data: {
          title: 'Cancelar reserva',
          message: `Reserva #${r.id} de ${r.huesped.nombreCompleto}, habitación ${r.habitacionNumero}. La reserva queda en el historial como cancelada y la habitación se libera.`,
          confirmLabel: 'Cancelar reserva',
          label: 'Motivo de la cancelación',
        },
      })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.reservaService.cancelar(r.id, motivo).subscribe({
          next: () => {
            this.snack.open('Reserva cancelada', 'OK', { duration: 2500 });
            this.cargar(false);
          },
          error: (e) => this.errorDialog.mostrarDesdeApi(e),
        });
      });
  }

  checkIn(r: Reserva): void {
    this.reservaService.checkIn(r.id).subscribe({
      next: () => {
        this.snack.open(`Check-in de ${r.huesped.nombreCompleto}`, 'OK', { duration: 2500 });
        this.cargar(false);
      },
      error: (e) => this.errorDialog.mostrarDesdeApi(e),
    });
  }

  checkOut(r: Reserva): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        ...roomixDialogConfig({ width: '440px' }),
        data: {
          title: 'Registrar check-out',
          message: `${r.huesped.nombreCompleto} · habitación ${r.habitacionNumero}. Se generará la factura con los consumos pendientes.`,
          confirmLabel: 'Hacer check-out',
          icon: 'logout',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.reservaService.checkOut(r.id).subscribe({
          next: (res) => {
            this.cargar(false);
            const ref = this.snack.open(
              res.factura ? `Check-out listo. Factura ${res.factura.numero}` : 'Check-out registrado',
              res.factura ? 'Ver factura' : 'OK',
              { duration: 5000 },
            );
            if (res.factura) ref.onAction().subscribe(() => this.router.navigate(['/facturas', res.factura!.id]));
          },
          error: (e) => this.errorDialog.mostrarDesdeApi(e),
        });
      });
  }

  // ---------------------------------------------------------------- Navegación del calendario
  cambiarVistaCal(v: VistaCalendario): void {
    this.vistaCal.set(v);
  }

  moverCal(dir: -1 | 1): void {
    const ref = this.aFecha(this.referencia());
    if (this.vistaCal() === 'mes') ref.setMonth(ref.getMonth() + dir, 1);
    else ref.setDate(ref.getDate() + (this.vistaCal() === 'semana' ? 7 : 1) * dir);
    this.referencia.set(isoFecha(ref));
  }

  irHoy(): void {
    this.referencia.set(hoyIso());
  }

  verDia(iso: string): void {
    this.referencia.set(iso);
    this.vistaCal.set('dia');
  }

  nivelOcupacion(d: DiaMes): string {
    const pct = d.ocupadas / (this.totalHabitaciones() || 1);
    return pct >= 0.8 ? 'alta' : pct >= 0.5 ? 'media' : pct > 0 ? 'baja' : 'nula';
  }

  etiquetaTipo(tipo: string): string {
    return TIPOS_HABITACION.find((t) => t.value === tipo)?.label ?? tipo;
  }

  private aFecha(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private inicioSemana(d: Date): Date {
    return sumarDias(d, -((d.getDay() + 6) % 7));
  }
}
