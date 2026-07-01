import { EstadoIncidencia, Incidencia } from '../models/incidencia.model';

const ETIQUETAS: Record<EstadoIncidencia, string> = {
  CREADA: 'Creada',
  ASIGNADA: 'Asignada',
  EN_PROGRESO: 'En progreso',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export function etiquetaEstadoIncidencia(estado: EstadoIncidencia): string {
  return ETIQUETAS[estado];
}

export function progresoIncidencia(incidencia: Incidencia): number {
  return incidencia.progresoPorcentaje;
}

export function incidenciaActiva(incidencia: Incidencia | null | undefined): boolean {
  return !!incidencia && incidencia.estado !== 'FINALIZADA' && incidencia.estado !== 'CANCELADA';
}

export function resumenProgresoIncidencia(incidencia: Incidencia): string {
  const pct = progresoIncidencia(incidencia);
  if (incidencia.estado === 'CREADA') return 'Pendiente de asignación';
  if (incidencia.estado === 'ASIGNADA') return 'Personal asignado';
  if (incidencia.estado === 'EN_PROGRESO') return `Servicio en curso · ${pct}%`;
  if (incidencia.estado === 'FINALIZADA') return 'Servicio finalizado';
  return etiquetaEstadoIncidencia(incidencia.estado);
}

export type ProgresoIncidenciaNivel = 'baja' | 'media' | 'alta' | 'completa';

export function nivelProgresoIncidencia(porcentaje: number): ProgresoIncidenciaNivel {
  if (porcentaje >= 100) return 'completa';
  if (porcentaje >= 75) return 'alta';
  if (porcentaje >= 40) return 'media';
  return 'baja';
}
