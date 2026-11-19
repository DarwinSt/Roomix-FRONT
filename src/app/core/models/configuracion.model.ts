import { Modulo } from './permisos.model';

export type ModoCobro = 'POR_HABITACION' | 'POR_PERSONA';

export interface ConfiguracionPublica {
  nombre: string;
  tieneLogo: boolean;
  logoVersion: number;
  modulos: Modulo[];
  modoCobro: ModoCobro;
  cobraIva: boolean;
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
