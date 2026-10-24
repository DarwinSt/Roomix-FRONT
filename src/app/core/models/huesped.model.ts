export type TipoDocumento = 'DNI' | 'PASAPORTE' | 'CEDULA' | 'OTRO';

export interface Huesped {
  id: number;
  nombre: string;
  apellidos: string;
  nombreCompleto: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  email: string;
  telefono: string;
  nacionalidad: string | null;
  fechaNacimiento: string | null;
  notas: string | null;
  activo: boolean;
  /** Autorización de tratamiento de datos (Ley 1581 de 2012) */
  autorizaTratamientoDatos: boolean;
  fechaHoraAutorizacion: string | null;
  habitacionActualNumero: string | null;
  fechaHoraCreacion: string;
  fechaHoraUltimaActualizacion: string;
}

export interface HuespedResumen {
  id: number;
  nombreCompleto: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  email: string;
  telefono: string;
}

export interface HuespedRequest {
  nombre: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  email: string;
  telefono: string;
  nacionalidad?: string | null;
  fechaNacimiento?: string | null;
  notas?: string | null;
  activo?: boolean;
  /** Obligatoria: el backend la exige en true (Ley 1581 de 2012) */
  autorizaTratamientoDatos: boolean;
}

/** Texto de la autorización que se muestra en los formularios de registro. */
export const TEXTO_AUTORIZACION_DATOS =
  'El huésped autoriza el tratamiento de sus datos personales para la gestión de su reserva y estadía, ' +
  'conforme a la Ley 1581 de 2012 y la política de privacidad del hotel.';

export const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
  { value: 'DNI', label: 'DNI / Identidad' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'OTRO', label: 'Otro documento' },
];

export function etiquetaTipoDocumento(tipo: TipoDocumento): string {
  return TIPOS_DOCUMENTO.find((t) => t.value === tipo)?.label ?? tipo;
}

export function documentoCompleto(h: Pick<Huesped | HuespedResumen, 'tipoDocumento' | 'numeroDocumento'>): string {
  return `${etiquetaTipoDocumento(h.tipoDocumento)} ${h.numeroDocumento}`;
}
