import {
  ActualizarEstadoRequest,
  Habitacion,
  MotivoInhabilitacion,
} from '../models/habitacion.model';
import { formatearFechaIso } from './date.util';

export interface PayloadReserva {
  fechaEntrada: Date;
  fechaSalida: Date;
}

export function payloadReservar(fechaEntrada: Date, fechaSalida: Date): ActualizarEstadoRequest {
  return {
    estado: 'RESERVADO',
    fechaEntrada: formatearFechaIso(fechaEntrada),
    fechaSalida: formatearFechaIso(fechaSalida),
  };
}

export function payloadCheckIn(): ActualizarEstadoRequest {
  return { estado: 'OCUPADO' };
}

export function payloadCheckOut(): ActualizarEstadoRequest {
  return { estado: 'LIBRE' };
}

export function payloadCancelarReserva(): ActualizarEstadoRequest {
  return { estado: 'LIBRE' };
}

export function payloadDesdeTransicion(
  habitacion: Habitacion,
  estadoDestino: Habitacion['estado'],
  motivoInhabilitacion?: MotivoInhabilitacion | null,
  reserva?: PayloadReserva | null,
): ActualizarEstadoRequest {
  return {
    estado: estadoDestino,
    motivoInhabilitacion: motivoInhabilitacion ?? null,
    fechaEntrada: reserva ? formatearFechaIso(reserva.fechaEntrada) : null,
    fechaSalida: reserva ? formatearFechaIso(reserva.fechaSalida) : null,
  };
}
