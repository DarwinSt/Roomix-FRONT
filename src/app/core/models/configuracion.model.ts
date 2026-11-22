import { Modulo } from './permisos.model';

export type ModoCobro = 'POR_HABITACION' | 'POR_PERSONA';

/** Cómo se muestra el logo: como viene, ícono (esquinas redondeadas) o avatar (círculo). */
export type LogoForma = 'ORIGINAL' | 'ICONO' | 'AVATAR';

export interface ConfiguracionPublica {
  nombre: string;
  tieneLogo: boolean;
  logoVersion: number;
  modulos: Modulo[];
  modoCobro: ModoCobro;
  cobraIva: boolean;
  colorPrimario: string | null;
  colorAcento: string | null;
  eslogan: string | null;
  logoForma: LogoForma | null;
}

export interface ModuloInfo {
  codigo: Modulo;
  nombre: string;
  habilitado: boolean;
}

export interface ConfiguracionHotel {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  prefijoFactura: string | null;
  cobraIva: boolean;
  ivaPorcentaje: number;
  exentoIvaExtranjeros: boolean;
  modoCobro: ModoCobro;
  mesesRetencionHuespedes: number;
  correoConfirmacionReserva: boolean;
  correoDisponible: boolean;
  tieneLogo: boolean;
  logoVersion: number;
  clienteLicencia: string;
  modulos: ModuloInfo[];
  colorPrimario: string | null;
  colorAcento: string | null;
  eslogan: string | null;
  logoForma: LogoForma;
  /** El logo actual es una versión sin fondo: se puede volver al original. */
  logoSinFondo: boolean;
}

export interface AparienciaRequest {
  colorPrimario: string | null;
  colorAcento: string | null;
  eslogan: string | null;
}

export interface ConfiguracionRequest {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  prefijoFactura: string | null;
  cobraIva: boolean;
  ivaPorcentaje: number | null;
  exentoIvaExtranjeros: boolean;
  modoCobro: ModoCobro;
  mesesRetencionHuespedes: number;
  correoConfirmacionReserva: boolean;
}
