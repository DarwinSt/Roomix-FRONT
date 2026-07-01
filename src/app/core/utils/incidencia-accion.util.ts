import { ContextoLimpieza, Incidencia } from '../models/incidencia.model';

export interface SiguienteAccionIncidencia {
  label: string;
  icon: string;
  hint: string;
}

export function siguienteAccionIncidencia(inc: Incidencia): SiguienteAccionIncidencia | null {
  switch (inc.estado) {
    case 'CREADA':
      return {
        label: 'Asignar personal',
        icon: 'person_add',
        hint: 'Asigne personal de housekeeping o mantenimiento',
      };
    case 'ASIGNADA':
      return {
        label: 'Iniciar servicio',
        icon: 'play_arrow',
        hint: 'Marcar que el personal comenzó el trabajo',
      };
    case 'EN_PROGRESO': {
      const completadas = inc.tareas.filter((t) => t.completada).length;
      const total = inc.tareas.length;
      return {
        label: total ? `Continuar checklist (${completadas}/${total})` : 'Continuar servicio',
        icon: 'checklist',
        hint: 'Complete las tareas del checklist',
      };
    }
    default:
      return null;
  }
}

/** Menor valor = más urgente en la cola operativa. */
export function prioridadIncidencia(inc: Incidencia): number {
  let p = 0;
  if (inc.estado === 'CREADA') p += 0;
  else if (inc.estado === 'ASIGNADA') p += 10;
  else if (inc.estado === 'EN_PROGRESO') p += 20;
  else p += 100;
  if (inc.tipo === 'LIMPIEZA' && inc.contextoLimpieza === 'POST_CHECKOUT') p -= 8;
  if (inc.tipo === 'LIMPIEZA' && inc.contextoLimpieza === 'URGENCIA') p -= 3;
  if (inc.habitacionId != null) p -= 2;
  return p;
}
