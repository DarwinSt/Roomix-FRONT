export type TipoIncidencia = 'LIMPIEZA' | 'MANTENIMIENTO' | 'SERVICIO_CUARTO' | 'OTRO';

export type AlcanceIncidencia = 'HABITACION' | 'ZONA_COMUN';

export type EstadoIncidencia = 'CREADA' | 'ASIGNADA' | 'EN_PROGRESO' | 'FINALIZADA' | 'CANCELADA';

export interface IncidenciaTarea {
  id: number;
  descripcion: string;
  orden: number;
  completada: boolean;
  fechaHoraCompletado: string | null;
}

export interface Incidencia {
  id: number;
  alcance: AlcanceIncidencia;
  habitacionId: number | null;
  habitacionNumero: string | null;
  ubicacion: string | null;
  ubicacionEtiqueta: string;
  personalAsignadoId: number | null;
  personalAsignadoNombre: string | null;
  tipo: TipoIncidencia;
  titulo: string;
  descripcion: string;
  estado: EstadoIncidencia;
  progresoPorcentaje: number;
  tareas: IncidenciaTarea[];
  fechaHoraCreacion: string;
  fechaHoraUltimaActualizacion: string;
  fechaHoraFinalizacion: string | null;
  fechaHoraProgramada: string | null;
}

export interface CrearIncidenciaRequest {
  alcance: AlcanceIncidencia;
  habitacionId?: number | null;
  ubicacion?: string | null;
  tipo: TipoIncidencia;
  descripcion?: string | null;
  fechaHoraProgramada?: string | null;
}

export const ALCANCES_INCIDENCIA: { value: AlcanceIncidencia; label: string; icon: string }[] = [
  { value: 'HABITACION', label: 'Habitación', icon: 'hotel' },
  { value: 'ZONA_COMUN', label: 'Zona común / otra área', icon: 'apartment' },
];

export const TIPOS_INCIDENCIA: { value: TipoIncidencia; label: string; icon: string }[] = [
  { value: 'LIMPIEZA', label: 'Limpieza', icon: 'cleaning_services' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento', icon: 'build' },
  { value: 'SERVICIO_CUARTO', label: 'Servicio al cuarto', icon: 'room_service' },
  { value: 'OTRO', label: 'Otro servicio', icon: 'more_horiz' },
];

export interface Personal {
  id: number;
  nombre: string;
  rol: string;
  departamento: string | null;
  ocupado: boolean;
}

export interface AsignarIncidenciaRequest {
  personalId: number;
}

export interface ActualizarTareaIncidenciaRequest {
  completada: boolean;
}
