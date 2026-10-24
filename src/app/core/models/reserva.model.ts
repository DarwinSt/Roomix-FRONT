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
  canal: CanalReserva | null;
  canalNombre: string | null;
  observaciones: string | null;
  motivoCancelacion: string | null;
  fechaHoraCancelacion: string | null;
  registradaPor: string | null;
  fechaHoraCreacion: string;
  fechaHoraUltimaActualizacion: string;
}

export type CanalReserva = 'PRESENCIAL' | 'TELEFONO' | 'CORREO' | 'WHATSAPP' | 'SITIO_WEB' | 'AGENCIA';

export const CANALES_RESERVA: { value: CanalReserva; label: string; icon: string }[] = [
  { value: 'PRESENCIAL', label: 'Presencial', icon: 'storefront' },
  { value: 'TELEFONO', label: 'Teléfono', icon: 'call' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: 'chat' },
  { value: 'CORREO', label: 'Correo electrónico', icon: 'mail' },
  { value: 'SITIO_WEB', label: 'Sitio web del hotel', icon: 'language' },
  { value: 'AGENCIA', label: 'Agencia / OTA', icon: 'travel_explore' },
];

export interface CrearReservaRequest {
  habitacionId: number;
  huespedId: number;
  fechaEntrada: string;
  fechaSalida: string;
  canal?: CanalReserva;
  observaciones?: string | null;
}

export interface ActualizarReservaRequest {
  huespedId?: number | null;
  fechaEntrada: string;
  fechaSalida: string;
  canal?: CanalReserva | null;
  observaciones?: string | null;
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

const FORMATO_MONEDA = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Pesos colombianos sin decimales, ej. "$ 265.000". */
export function formatearMoneda(valor: number): string {
  return FORMATO_MONEDA.format(valor);
}

/** Clase de chip (rx-chip) para el estado de una reserva. */
export function claseEstadoReserva(estado: EstadoReserva): string {
  const map: Record<EstadoReserva, string> = { CONFIRMADA: 'info', EN_CURSO: 'alerta', FINALIZADA: 'ok', CANCELADA: 'critico' };
  return map[estado];
}
