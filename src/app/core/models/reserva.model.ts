import type { EstadoReserva, TipoHabitacion } from './habitacion.model';
import type { HuespedResumen } from './huesped.model';

export interface Reserva {
  id: number;
  habitacionId: number;
  habitacionNumero: string;
  tipoHabitacion: TipoHabitacion;
  huesped: HuespedResumen;
  fechaEntrada: string;
  fechaSalida: string;
  cantidadNoches: number;
  estadoReserva: EstadoReserva;
  tarifaNoche: number;
  totalEstimado: number;
  horaRealCheckIn: string | null;
  horaRealCheckOut: string | null;
  fechaHoraCreacion: string;
  fechaHoraUltimaActualizacion: string;
}

export interface CrearReservaRequest {
  habitacionId: number;
  huespedId: number;
  fechaEntrada: string;
  fechaSalida: string;
}

export interface HabitacionDisponible {
  habitacionId: number;
  numero: string;
  tipoHabitacion: TipoHabitacion;
  descripcion: string;
  tarifaNoche: number;
  cantidadNoches: number;
  totalEstimado: number;
}

export interface HabitacionDisponibilidadCheck {
  habitacionId: number;
  disponible: boolean;
  tarifaNoche: number;
  cantidadNoches: number;
  totalEstimado: number;
}

export interface TarifaTipo {
  tipoHabitacion: TipoHabitacion;
  precioNoche: number;
  fechaHoraUltimaActualizacion: string;
}

export const ESTADOS_RESERVA_FILTRO: { value: EstadoReserva | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'CONFIRMADA', label: 'Confirmadas' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'FINALIZADA', label: 'Finalizadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
];

export function etiquetaEstadoReserva(estado: EstadoReserva): string {
  const map: Record<EstadoReserva, string> = {
    CONFIRMADA: 'Confirmada',
    EN_CURSO: 'En curso',
    FINALIZADA: 'Finalizada',
    CANCELADA: 'Cancelada',
  };
  return map[estado] ?? estado;
}

export function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(valor);
}
