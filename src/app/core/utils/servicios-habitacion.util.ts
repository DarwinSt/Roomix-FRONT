import { Habitacion, EstadoHabitacion } from '../models/habitacion.model';
import {
  ContextoLimpieza,
  TIPOS_INCIDENCIA,
  TipoIncidencia,
} from '../models/incidencia.model';

export interface OpcionServicioHabitacion {
  tipo: TipoIncidencia;
  contextoLimpieza?: ContextoLimpieza | null;
  label: string;
  hint: string;
  icon: string;
}

/** Tipos de servicio permitidos según estado de la habitación (alineado con backend). */
export function serviciosPermitidos(estado: EstadoHabitacion): OpcionServicioHabitacion[] {
  switch (estado) {
    case 'OCUPADO':
      return [
        {
          tipo: 'SERVICIO_CUARTO',
          label: 'Comida / room service',
          hint: 'Pedido de comida o bebidas al huésped',
          icon: 'room_service',
        },
        {
          tipo: 'LIMPIEZA',
          contextoLimpieza: 'URGENCIA',
          label: 'Limpieza urgente',
          hint: 'Huésped presente: derrame, daño o situación urgente',
          icon: 'emergency',
        },
        {
          tipo: 'LIMPIEZA',
          contextoLimpieza: 'HUESPED_AUSENTE',
          label: 'Limpieza (huésped ausente)',
          hint: 'Huésped salió temporalmente; la reserva sigue activa',
          icon: 'cleaning_services',
        },
        {
          tipo: 'OTRO',
          label: 'Otro servicio',
          hint: 'Amenities, toallas extra u otro pedido del huésped',
          icon: 'more_horiz',
        },
      ];
    case 'INHABILITADO':
      return TIPOS_INCIDENCIA.filter((t) => t.value === 'MANTENIMIENTO' || t.value === 'OTRO').map(
        (t) => ({
          tipo: t.value,
          label: t.label,
          hint:
            t.value === 'MANTENIMIENTO'
              ? 'Reparación o adecuación antes de habilitar'
              : 'Servicio adicional en habitación inhabilitada',
          icon: t.icon,
        }),
      );
    case 'LIBRE':
    case 'RESERVADO':
      return TIPOS_INCIDENCIA.filter((t) => t.value === 'MANTENIMIENTO' || t.value === 'OTRO').map(
        (t) => ({
          tipo: t.value,
          label: t.label,
          hint:
            t.value === 'MANTENIMIENTO'
              ? 'Programar mantenimiento; bloquea reservas en esas fechas'
              : 'Preparación u otro servicio sin huésped',
          icon: t.icon,
        }),
      );
    default:
      return [];
  }
}

export function etiquetaContextoLimpieza(ctx: ContextoLimpieza | null | undefined): string {
  switch (ctx) {
    case 'POST_CHECKOUT':
      return 'Post check-out';
    case 'URGENCIA':
      return 'Urgente (huésped presente)';
    case 'HUESPED_AUSENTE':
      return 'Huésped ausente';
    default:
      return '';
  }
}

export function etiquetaEstadoHabitacion(h: Habitacion): string {
  if (h.estado === 'INHABILITADO' && h.motivoInhabilitacion === 'POST_CHECKOUT') {
    return 'Pendiente limpieza';
  }
  if (h.estado === 'INHABILITADO') {
    return 'Inhabilitada';
  }
  const map: Record<EstadoHabitacion, string> = {
    LIBRE: 'Libre',
    RESERVADO: 'Reservado',
    OCUPADO: 'Ocupado',
    INHABILITADO: 'Inhabilitada',
  };
  return map[h.estado];
}

export function puedeReservar(estado: EstadoHabitacion): boolean {
  return estado === 'LIBRE';
}
