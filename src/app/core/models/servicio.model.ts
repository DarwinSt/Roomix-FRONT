export type CategoriaServicio = 'ALIMENTOS_BEBIDAS' | 'LAVANDERIA' | 'SPA_BIENESTAR' | 'TRANSPORTE' | 'TOURS' | 'OTRO';
export type EstadoSolicitud = 'SOLICITADA' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';

export const CATEGORIAS_SERVICIO: { value: CategoriaServicio; label: string; icon: string }[] = [
  { value: 'ALIMENTOS_BEBIDAS', label: 'Alimentos y bebidas', icon: 'room_service' },
  { value: 'LAVANDERIA', label: 'Lavandería', icon: 'local_laundry_service' },
  { value: 'SPA_BIENESTAR', label: 'Spa y bienestar', icon: 'spa' },
  { value: 'TRANSPORTE', label: 'Transporte', icon: 'airport_shuttle' },
  { value: 'TOURS', label: 'Tours y actividades', icon: 'sailing' },
  { value: 'OTRO', label: 'Otros servicios', icon: 'more_horiz' },
];

export const ESTADOS_SOLICITUD: { value: EstadoSolicitud; label: string }[] = [
  { value: 'SOLICITADA', label: 'Solicitada' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

export function iconoCategoriaServicio(c: CategoriaServicio): string {
  return CATEGORIAS_SERVICIO.find((x) => x.value === c)?.icon ?? 'room_service';
}

export function etiquetaEstadoSolicitud(e: EstadoSolicitud): string {
  return ESTADOS_SOLICITUD.find((x) => x.value === e)?.label ?? e;
}

export interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaServicio;
  categoriaNombre: string;
  precio: number;
  unidad: string;
  duracionMinutos: number | null;
  activo: boolean;
}

export interface ServicioCatalogoRequest {
  nombre: string;
  descripcion?: string | null;
  categoria: CategoriaServicio;
  precio: number;
  unidad: string;
  duracionMinutos?: number | null;
  activo?: boolean;
}

export interface SolicitudServicio {
  id: number;
  servicioId: number;
  servicioNombre: string;
  categoria: CategoriaServicio;
  unidad: string;
  reservaId: number;
  habitacionId: number;
  habitacionNumero: string;
  huespedId: number;
  huespedNombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  fechaHoraProgramada: string | null;
  responsableId: number | null;
  responsableNombre: string | null;
  estado: EstadoSolicitud;
  notas: string | null;
  motivoCancelacion: string | null;
  solicitadoPor: string;
  fechaHoraSolicitud: string;
  fechaHoraCompletado: string | null;
}

export interface SolicitudRequest {
  reservaId: number;
  servicioId: number;
  cantidad: number;
  fechaHoraProgramada?: string | null;
  responsableId?: number | null;
  notas?: string | null;
}
