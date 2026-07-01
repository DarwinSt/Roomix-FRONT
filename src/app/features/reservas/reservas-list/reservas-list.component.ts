import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReservaService } from '../../../core/services/reserva.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import {
  ESTADOS_RESERVA_FILTRO,
  Reserva,
  etiquetaEstadoReserva,
  formatearMoneda,
} from '../../../core/models/reserva.model';
import { TIPOS_HABITACION } from '../../../core/models/habitacion.model';
import type { EstadoReserva } from '../../../core/models/habitacion.model';
import { etiquetaUltimaActualizacion, programarAutoRefresh } from '../../../core/utils/auto-refresh.util';
import { formatearFechaIso } from '../../../core/utils/date.util';

type VistaReservas = 'listado' | 'calendario';

interface DiaCalendario {
  fecha: Date;
  enMes: boolean;
  reservas: Reserva[];
}

@Component({
  selector: 'app-reservas-list',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatButtonToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './reservas-list.component.html',
  styleUrl: './reservas-list.component.scss',
})
export class ReservasListComponent implements OnInit {
  private readonly reservaService = inject(ReservaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly reservas = signal<Reserva[]>([]);
  readonly ultimaActualizacion = signal<Date | null>(null);
  readonly vista = signal<VistaReservas>('listado');
  readonly mesActual = signal(this.inicioMes(new Date()));
  readonly filtroEstado = signal<EstadoReserva | ''>('');
  readonly busqueda = signal('');

  readonly estadosFiltro = ESTADOS_RESERVA_FILTRO;
  readonly columnas = ['habitacion', 'huesped', 'fechas', 'noches', 'total', 'estado'];
  readonly etiquetaEstado = etiquetaEstadoReserva;
  readonly formatearMoneda = formatearMoneda;
  readonly tiposHabitacion = TIPOS_HABITACION;

  readonly etiquetaSync = computed(() => etiquetaUltimaActualizacion(this.ultimaActualizacion()));

  readonly resumen = computed(() => {
    const list = this.reservas();
    return {
      total: list.length,
      activas: list.filter((r) => r.estadoReserva === 'CONFIRMADA' || r.estadoReserva === 'EN_CURSO').length,
      finalizadas: list.filter((r) => r.estadoReserva === 'FINALIZADA').length,
    };
  });

  readonly reservasVisibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.reservas().filter((r) => {
      if (!q) return true;
      return (
        r.habitacionNumero.toLowerCase().includes(q) ||
        r.huesped.nombreCompleto.toLowerCase().includes(q) ||
        r.huesped.numeroDocumento.toLowerCase().includes(q)
      );
    });
  });

  readonly etiquetaMes = computed(() => {
    const mes = this.mesActual();
    return mes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  });

  readonly diasCalendario = computed((): DiaCalendario[] => {
    const mes = this.mesActual();
    const inicio = this.inicioMes(mes);
    const fin = this.finMes(mes);
    const gridInicio = new Date(inicio);
    gridInicio.setDate(gridInicio.getDate() - ((gridInicio.getDay() + 6) % 7));

    const dias: DiaCalendario[] = [];
    const cursor = new Date(gridInicio);

    for (let i = 0; i < 42; i++) {
      const fecha = new Date(cursor);
      const iso = formatearFechaIso(fecha);
      const reservasDia = this.reservas().filter((r) => {
        if (r.estadoReserva === 'CANCELADA') return false;
        return iso >= r.fechaEntrada && iso < r.fechaSalida;
      });
      dias.push({
        fecha,
        enMes: fecha.getMonth() === mes.getMonth(),
        reservas: reservasDia,
      });
      cursor.setDate(cursor.getDate() + 1);
      if (cursor > fin && dias.length >= 35 && (dias.length % 7) === 0) break;
    }

    return dias;
  });

  ngOnInit(): void {
    this.cargar(true);
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cargar(mostrarLoading: boolean): void {
    if (mostrarLoading) this.loading.set(true);
    const estado = this.filtroEstado();
    const mes = this.mesActual();
    const filtros: {
      estado?: EstadoReserva;
      fechaDesde?: string;
      fechaHasta?: string;
    } = { estado: estado || undefined };

    if (!estado || estado === 'CONFIRMADA' || estado === 'EN_CURSO') {
      filtros.fechaDesde = formatearFechaIso(this.inicioMes(mes));
      filtros.fechaHasta = formatearFechaIso(this.finMes(mes));
    }

    this.reservaService.listar(filtros).subscribe({
        next: (data) => {
          this.reservas.set(data);
          this.ultimaActualizacion.set(new Date());
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }

  onFiltroEstadoChange(): void {
    this.cargar(true);
  }

  cambiarVista(vista: VistaReservas): void {
    this.vista.set(vista);
  }

  mesAnterior(): void {
    const mes = new Date(this.mesActual());
    mes.setMonth(mes.getMonth() - 1);
    this.mesActual.set(this.inicioMes(mes));
    this.cargar(true);
  }

  mesSiguiente(): void {
    const mes = new Date(this.mesActual());
    mes.setMonth(mes.getMonth() + 1);
    this.mesActual.set(this.inicioMes(mes));
    this.cargar(true);
  }

  etiquetaTipo(tipo: string): string {
    return this.tiposHabitacion.find((t) => t.value === tipo)?.label ?? tipo;
  }

  claseEstado(estado: EstadoReserva): string {
    return `estado-${estado.toLowerCase().replace('_', '-')}`;
  }

  private inicioMes(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  }

  private finMes(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  }
}
