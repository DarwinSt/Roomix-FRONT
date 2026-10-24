import type { EstadoFactura } from './finanzas.model';

export type EstadoEvento = 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';
export type TipoAcceso = 'PUBLICO' | 'PRIVADO' | 'SOLO_HUESPEDES';
export type TipoEvento = 'CORPORATIVO' | 'SOCIAL' | 'ACADEMICO' | 'CULTURAL' | 'OTRO';
export type TipoRecurso = 'EQUIPO_AUDIOVISUAL' | 'MOBILIARIO' | 'CATERING' | 'DECORACION' | 'PERSONAL_APOYO' | 'OTRO';

export const ESTADOS_EVENTO: { value: EstadoEvento; label: string; icon: string }[] = [
  { value: 'PROGRAMADO', label: 'Programado', icon: 'event' },
  { value: 'EN_CURSO', label: 'En curso', icon: 'play_circle' },
  { value: 'FINALIZADO', label: 'Finalizado', icon: 'check_circle' },
  { value: 'CANCELADO', label: 'Cancelado', icon: 'cancel' },
];

export const TIPOS_EVENTO: { value: TipoEvento; label: string }[] = [
  { value: 'CORPORATIVO', label: 'Corporativo' },
  { value: 'SOCIAL', label: 'Social (boda, cumpleaños, aniversario)' },
  { value: 'ACADEMICO', label: 'Académico / capacitación' },
  { value: 'CULTURAL', label: 'Cultural' },
  { value: 'OTRO', label: 'Otro' },
];

export const TIPOS_ACCESO: { value: TipoAcceso; label: string; icon: string }[] = [
  { value: 'PUBLICO', label: 'Público', icon: 'public' },
  { value: 'PRIVADO', label: 'Privado', icon: 'lock' },
  { value: 'SOLO_HUESPEDES', label: 'Exclusivo para huéspedes', icon: 'hotel' },
];

export const TIPOS_RECURSO: { value: TipoRecurso; label: string }[] = [
  { value: 'EQUIPO_AUDIOVISUAL', label: 'Equipo audiovisual' },
  { value: 'MOBILIARIO', label: 'Mobiliario' },
  { value: 'CATERING', label: 'Catering' },
  { value: 'DECORACION', label: 'Decoración' },
  { value: 'PERSONAL_APOYO', label: 'Personal de apoyo' },
  { value: 'OTRO', label: 'Otro' },
];

export function etiquetaEstadoEvento(e: EstadoEvento): string {
  return ESTADOS_EVENTO.find((x) => x.value === e)?.label ?? e;
}

export interface Salon {
  id: number;
  nombre: string;
  capacidad: number;
  descripcion: string | null;
  tarifaHora: number;
  activo: boolean;
}

export interface SalonRequest {
  nombre: string;
  capacidad: number;
  descripcion?: string | null;
  tarifaHora: number;
  activo?: boolean;
}

export interface RecursoEvento {
  id?: number;
  tipo: TipoRecurso;
  tipoNombre?: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  total?: number;
}

export interface Participante {
  id: number;
  huespedId: number | null;
  nombre: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  confirmado: boolean;
  asistio: boolean;
  fechaHoraRegistro: string;
}

export interface Evento {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: TipoEvento;
  tipoNombre: string;
  tipoAcceso: TipoAcceso;
  tipoAccesoNombre: string;
  estado: EstadoEvento;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  salonId: number;
  salonNombre: string;
  salonCapacidad: number;
  responsableId: number | null;
  responsableNombre: string | null;
  capacidad: number;
  inscritos: number;
  confirmados: number;
  asistentes: number;
  organizadorNombre: string;
  organizadorDocumento: string | null;
  organizadorTelefono: string | null;
  organizadorEmail: string | null;
  valorBase: number;
  totalRecursos: number;
  valorTotal: number;
  facturaId: number | null;
  facturaNumero: string | null;
  facturaEstado: EstadoFactura | null;
  notas: string | null;
  motivoCancelacion: string | null;
  creadoPor: string;
  recursos: RecursoEvento[];
  participantes: Participante[];
}

export interface EventoRequest {
  nombre: string;
  descripcion?: string | null;
  tipo: TipoEvento;
  tipoAcceso: TipoAcceso;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  salonId: number;
  responsableId?: number | null;
  capacidad: number;
  organizadorNombre: string;
  organizadorDocumento?: string | null;
  organizadorTelefono?: string | null;
  organizadorEmail?: string | null;
  valorBase: number;
  notas?: string | null;
  recursos: RecursoEvento[];
}

export interface ParticipanteRequest {
  huespedId?: number | null;
  nombre?: string | null;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  confirmado?: boolean;
}

export interface ReporteEventos {
  desde: string;
  hasta: string;
  totalEventos: number;
  porEstado: Partial<Record<EstadoEvento, number>>;
  totalInscritos: number;
  totalAsistentes: number;
  valorTotal: number;
  facturado: number;
  recaudado: number;
  porSalon: { salon: string; eventos: number; participantes: number; valor: number }[];
}
