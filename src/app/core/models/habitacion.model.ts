import type { HuespedResumen } from './huesped.model';

export type EstadoHabitacion = 'LIBRE' | 'RESERVADO' | 'OCUPADO' | 'INHABILITADO';

export type MotivoInhabilitacion = 'POST_CHECKOUT' | 'ADECUACION_PROGRAMADA';

export type EstadoReserva = 'CONFIRMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';

export type TipoHabitacion =
  | 'INDIVIDUAL'
  | 'DOBLE'
  | 'TRIPLE'
  | 'SUITE'
  | 'FAMILIAR'
  | 'EJECUTIVA';

export interface Habitacion {
  id: number;
  numero: string;
  caracteristicas: string[];
  tipoHabitacion: TipoHabitacion;
  descripcion: string;
  estado: EstadoHabitacion;
  /** Reserva planificada */
  fechaEntrada: string | null;
  fechaSalida: string | null;
  cantidadNoches: number | null;
  estadoReserva: EstadoReserva | null;
  /** Hospedaje real */
  horaRealCheckIn: string | null;
  horaRealCheckOut: string | null;
  motivoInhabilitacion: MotivoInhabilitacion | null;
  huesped: HuespedResumen | null;
  fechaHoraUltimaActualizacion: string;
}

export interface HabitacionRequest {
  numero: string;
  caracteristicas: string[];
  tipoHabitacion: TipoHabitacion;
  descripcion: string;
  estado?: EstadoHabitacion;
  fechaEntrada?: string | null;
  fechaSalida?: string | null;
  huespedId?: number | null;
}

export interface ActualizarEstadoRequest {
  estado: EstadoHabitacion;
  fechaEntrada?: string | null;
  fechaSalida?: string | null;
  motivoInhabilitacion?: MotivoInhabilitacion | null;
  huespedId?: number | null;
}

export const ESTADOS_HABITACION: { value: EstadoHabitacion; label: string }[] = [
  { value: 'LIBRE', label: 'Libre' },
  { value: 'RESERVADO', label: 'Reservado' },
  { value: 'OCUPADO', label: 'Ocupado' },
  { value: 'INHABILITADO', label: 'Inhabilitado' },
];

export const ESTADOS_RESERVA: { value: EstadoReserva; label: string }[] = [
  { value: 'CONFIRMADA', label: 'Confirmada' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

export const MOTIVOS_INHABILITACION: { value: MotivoInhabilitacion; label: string }[] = [
  { value: 'POST_CHECKOUT', label: 'Tras check-out del huésped' },
  { value: 'ADECUACION_PROGRAMADA', label: 'Adecuación o preparación programada' },
];

export const TIPOS_HABITACION: { value: TipoHabitacion; label: string }[] = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'DOBLE', label: 'Doble' },
  { value: 'TRIPLE', label: 'Triple' },
  { value: 'SUITE', label: 'Suite' },
  { value: 'FAMILIAR', label: 'Familiar' },
  { value: 'EJECUTIVA', label: 'Ejecutiva' },
];

export function etiquetaEstadoReserva(estado: EstadoReserva | null): string {
  if (!estado) return '—';
  return ESTADOS_RESERVA.find((e) => e.value === estado)?.label ?? estado;
}

export function calcularNoches(fechaEntrada: string, fechaSalida: string): number {
  const entrada = new Date(fechaEntrada + 'T12:00:00');
  const salida = new Date(fechaSalida + 'T12:00:00');
  const diff = Math.round((salida.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}
