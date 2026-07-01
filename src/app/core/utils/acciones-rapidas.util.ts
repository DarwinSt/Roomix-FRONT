import { Habitacion } from '../models/habitacion.model';

export type TipoAccionRapida =
  | 'RESERVAR'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'CANCELAR_RESERVA'
  | 'MANTENIMIENTO'
  | 'SOLICITAR_SERVICIO';

export interface AccionRapida {
  tipo: TipoAccionRapida;
  label: string;
  icon: string;
  hint: string;
  cssClass: string;
}

const CLASE_INHABILITADO = 'estado-inhabilitado';
const CLASE_OCUPADO = 'estado-ocupado';
const CLASE_RESERVADO = 'estado-reservado';
const CLASE_LIBRE = 'estado-libre';

/** Acciones operativas según estado (sin duplicar creación manual de incidencias). */
export function accionesRapidasDisponibles(habitacion: Habitacion): AccionRapida[] {
  switch (habitacion.estado) {
    case 'LIBRE':
      return [
        {
          tipo: 'RESERVAR',
          label: 'Reservar',
          icon: 'event_available',
          hint: 'Solo si no hay mantenimiento programado en las fechas',
          cssClass: CLASE_RESERVADO,
        },
        {
          tipo: 'MANTENIMIENTO',
          label: 'Programar mantenimiento',
          icon: 'construction',
          hint: 'Bloquea reservas en el rango de fechas indicado',
          cssClass: CLASE_INHABILITADO,
        },
      ];
    case 'RESERVADO':
      return [
        {
          tipo: 'CHECK_IN',
          label: 'Check-in',
          icon: 'login',
          hint: 'Registrar llegada del huésped',
          cssClass: CLASE_OCUPADO,
        },
        {
          tipo: 'CANCELAR_RESERVA',
          label: 'Cancelar reserva',
          icon: 'event_busy',
          hint: 'Vuelve a Libre',
          cssClass: CLASE_LIBRE,
        },
        {
          tipo: 'MANTENIMIENTO',
          label: 'Programar mantenimiento',
          icon: 'construction',
          hint: 'Antes del check-in del huésped',
          cssClass: CLASE_INHABILITADO,
        },
      ];
    case 'OCUPADO':
      return [
        {
          tipo: 'SOLICITAR_SERVICIO',
          label: 'Solicitar servicio',
          icon: 'room_service',
          hint: 'Comida, limpieza urgente, limpieza con huésped ausente u otro',
          cssClass: CLASE_OCUPADO,
        },
        {
          tipo: 'CHECK_OUT',
          label: 'Check-out',
          icon: 'logout',
          hint: 'Finaliza estadía → pendiente limpieza post check-out',
          cssClass: CLASE_INHABILITADO,
        },
      ];
    case 'INHABILITADO':
      return [
        {
          tipo: 'MANTENIMIENTO',
          label: 'Agregar mantenimiento',
          icon: 'build',
          hint: 'Reparación adicional antes de habilitar la habitación',
          cssClass: CLASE_INHABILITADO,
        },
      ];
    default:
      return [];
  }
}

export function trackAccionRapida(a: AccionRapida): string {
  return a.tipo;
}
