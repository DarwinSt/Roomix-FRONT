import { Habitacion } from '../models/habitacion.model';

export type TipoAccionRapida =
  | 'RESERVAR'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'CANCELAR_RESERVA'
  | 'ADECUACION'
  | 'GENERAR_INCIDENCIA';

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
const CLASE_INCIDENCIA = 'estado-incidencia';

/** Acciones rápidas según estado operativo de la habitación. */
export function accionesRapidasDisponibles(habitacion: Habitacion): AccionRapida[] {
  switch (habitacion.estado) {
    case 'LIBRE':
      return [
        {
          tipo: 'RESERVAR',
          label: 'Reservar',
          icon: 'event_available',
          hint: 'Confirma reserva → estado Reservado',
          cssClass: CLASE_RESERVADO,
        },
        {
          tipo: 'ADECUACION',
          label: 'Mantenimiento',
          icon: 'construction',
          hint: 'Programar mantenimiento; inhabilita solo el día indicado',
          cssClass: CLASE_INHABILITADO,
        },
      ];
    case 'RESERVADO':
      return [
        {
          tipo: 'CHECK_IN',
          label: 'Check-in',
          icon: 'login',
          hint: 'Registrar llegada del huésped → Ocupado',
          cssClass: CLASE_OCUPADO,
        },
        {
          tipo: 'CANCELAR_RESERVA',
          label: 'Cancelar reserva',
          icon: 'event_busy',
          hint: 'Cancelar reserva → Libre',
          cssClass: CLASE_LIBRE,
        },
        {
          tipo: 'ADECUACION',
          label: 'Mantenimiento',
          icon: 'construction',
          hint: 'Programar mantenimiento antes del check-in',
          cssClass: CLASE_INHABILITADO,
        },
      ];
    case 'OCUPADO':
      return [
        {
          tipo: 'CHECK_OUT',
          label: 'Check-out',
          icon: 'logout',
          hint: 'Registrar salida → Inhabilitado + limpieza automática',
          cssClass: CLASE_INHABILITADO,
        },
        {
          tipo: 'GENERAR_INCIDENCIA',
          label: 'Generar incidencia',
          icon: 'report_problem',
          hint: 'Mantenimiento, servicio al cuarto u otro (sin cambiar estado)',
          cssClass: CLASE_INCIDENCIA,
        },
      ];
    case 'INHABILITADO':
      return [
        {
          tipo: 'GENERAR_INCIDENCIA',
          label: 'Nuevo mantenimiento',
          icon: 'add',
          hint: 'Agregar otro servicio de mantenimiento',
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
