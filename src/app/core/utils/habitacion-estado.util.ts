import {
  ESTADOS_HABITACION,
  EstadoHabitacion,
  Habitacion,
  MotivoInhabilitacion,
  ActualizarEstadoRequest,
} from '../models/habitacion.model';
import { formatearFechaIso } from './date.util';

export interface TransicionOpcion {
  estadoDestino: EstadoHabitacion;
  motivoInhabilitacion?: MotivoInhabilitacion;
  label: string;
  icon: string;
  hint: string;
  cssClass: string;
}

const META: Record<
  EstadoHabitacion,
  { label: string; icon: string; cssClass: string; fondoClass: string; hint: string }
> = {
  LIBRE: {
    label: 'Libre',
    icon: 'check_circle',
    cssClass: 'estado-libre',
    fondoClass: 'fondo-estado-libre',
    hint: 'Disponible para reservar',
  },
  RESERVADO: {
    label: 'Reservado',
    icon: 'event_available',
    cssClass: 'estado-reservado',
    fondoClass: 'fondo-estado-reservado',
    hint: 'Reserva confirmada',
  },
  OCUPADO: {
    label: 'Ocupado',
    icon: 'person',
    cssClass: 'estado-ocupado',
    fondoClass: 'fondo-estado-ocupado',
    hint: 'Huésped en la habitación',
  },
  INHABILITADO: {
    label: 'Inhabilitado',
    icon: 'block',
    cssClass: 'estado-inhabilitado',
    fondoClass: 'fondo-estado-inhabilitado',
    hint: 'Mantenimiento programado para hoy',
  },
};

export function metaEstado(estado: EstadoHabitacion) {
  return META[estado];
}

export function etiquetaEstado(estado: EstadoHabitacion): string {
  return ESTADOS_HABITACION.find((e) => e.value === estado)?.label ?? estado;
}

export function etiquetaMotivoInhabilitacion(motivo: MotivoInhabilitacion): string {
  return motivo === 'POST_CHECKOUT'
    ? 'Pendiente limpieza post check-out — no reservable hasta finalizar'
    : 'Mantenimiento programado — no reservable hoy';
}

/** Transiciones permitidas según estado actual (sin INHABILITADO manual). */
export function transicionesDisponibles(habitacion: Habitacion): TransicionOpcion[] {
  switch (habitacion.estado) {
    case 'LIBRE':
      return [opcion('RESERVADO', 'Confirma reserva con fechas de entrada y salida')];
    case 'RESERVADO':
      return [
        opcion('OCUPADO', 'Registrar check-in del huésped'),
        opcion('LIBRE', 'Cancelar reserva'),
      ];
    case 'OCUPADO':
      return [opcion('LIBRE', 'Check-out: queda inhabilitada con limpieza automática')];
    case 'INHABILITADO':
      return [];
    default:
      return [];
  }
}

function opcion(estado: EstadoHabitacion, hint: string): TransicionOpcion {
  return {
    estadoDestino: estado,
    label: META[estado].label,
    icon: META[estado].icon,
    hint,
    cssClass: META[estado].cssClass,
  };
}

export function opcionesEstadoAlta(): TransicionOpcion[] {
  return (['LIBRE', 'RESERVADO'] as EstadoHabitacion[]).map((estado) => opcion(estado, META[estado].hint));
}

export function opcionesEstadoEdicion(habitacion: Habitacion): TransicionOpcion[] {
  const actual: TransicionOpcion = {
    estadoDestino: habitacion.estado,
    label: `${META[habitacion.estado].label} (actual)`,
    icon: META[habitacion.estado].icon,
    hint: 'Sin cambio de estado',
    cssClass: META[habitacion.estado].cssClass,
  };
  return [actual, ...transicionesDisponibles(habitacion)];
}

export function payloadActualizarEstado(
  habitacion: Habitacion,
  op: TransicionOpcion,
  fechaEntrada: Date | null = null,
  fechaSalida: Date | null = null,
): ActualizarEstadoRequest {
  return {
    estado: op.estadoDestino,
    motivoInhabilitacion: null,
    fechaEntrada:
      op.estadoDestino === 'RESERVADO' && fechaEntrada ? formatearFechaIso(fechaEntrada) : null,
    fechaSalida:
      op.estadoDestino === 'RESERVADO' && fechaSalida ? formatearFechaIso(fechaSalida) : null,
  };
}
