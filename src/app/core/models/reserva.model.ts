import type { EstadoReserva, TipoHabitacion } from './habitacion.model';
import type { HuespedResumen } from './huesped.model';
import type { MetodoPago } from './finanzas.model';

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
  /** Noches × tarifa, antes del descuento. */
  subtotal: number;
  descuento: number;
  promocionId: number | null;
  promocionNombre: string | null;
  /** Al cancelar con abonos: parte retenida como penalidad y parte devuelta. */
  valorPenalidad: number | null;
  valorDevuelto: number | null;
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
  promocionId?: number | null;
  abonoInicial?: AbonoRequest | null;
}

export interface AbonoRequest {
  valor: number;
  metodo: MetodoPago;
  referencia?: string | null;
}

export interface Abono {
  id: number;
  valor: number;
  metodo: MetodoPago;
  metodoNombre: string;
  referencia: string | null;
  fechaHora: string;
  registradoPor: string;
  facturaId: number | null;
  devuelto: boolean;
  valorDevuelto: number | null;
  fechaHoraDevolucion: string | null;
}

export interface ResumenAbonos {
  reservaId: number;
  totalReserva: number;
  porcentajeImpuesto: number;
  abonoMinimoPct: number;
  abonoMinimo: number;
  totalAbonado: number;
  saldo: number;
  valorPenalidad: number | null;
  valorDevuelto: number | null;
  abonos: Abono[];
}

/** Cotización del backend: misma regla que se aplica al confirmar la reserva. */
export interface CotizacionReserva {
  noches: number;
  tarifaNoche: number;
  subtotal: number;
  descuento: number;
  promocionNombre: string | null;
  total: number;
  porcentajeImpuesto: number;
  impuesto: number;
  totalConImpuesto: number;
  abonoMinimoPct: number;
  abonoMinimo: number;
  penalidadCancelacionPct: number;
}

export type TipoDescuento = 'VALOR_FIJO' | 'PORCENTAJE';

export interface Promocion {
  id: number;
  nombre: string;
  descripcion: string | null;
  minimoNoches: number | null;
  tipoHabitacion: TipoHabitacion | null;
  canal: CanalReserva | null;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  tipoDescuento: TipoDescuento;
  valor: number;
  activa: boolean;
  condiciones: string;
  fechaHoraUltimaActualizacion: string;
}

export interface PromocionRequest {
  nombre: string;
  descripcion?: string | null;
  minimoNoches?: number | null;
  tipoHabitacion?: TipoHabitacion | null;
  canal?: CanalReserva | null;
  vigenteDesde?: string | null;
  vigenteHasta?: string | null;
  tipoDescuento: TipoDescuento;
  valor: number;
  activa?: boolean;
}

export interface PromocionAplicable {
  id: number;
  nombre: string;
  descripcion: string | null;
  condiciones: string;
  tipoDescuento: TipoDescuento;
  valor: number;
  subtotal: number;
  descuento: number;
  totalConDescuento: number;
}

export interface PoliticaReserva {
  abonoMinimoPct: number;
  penalidadCancelacionPct: number;
  actualizadaPor: string | null;
  fechaHoraUltimaActualizacion: string | null;
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
