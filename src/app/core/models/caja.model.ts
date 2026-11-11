import { CategoriaFinanciera, MetodoPago, TipoMovimiento } from './finanzas.model';

export type EstadoTurno = 'ABIERTO' | 'CERRADO';
export type TipoMovimientoCaja = 'RETIRO' | 'APORTE';

export interface TotalMedio {
  metodo: MetodoPago;
  nombre: string;
  ingresos: number;
  egresos: number;
  neto: number;
}

export interface ConteoItem {
  denominacion: number;
  cantidad: number;
}

export interface TurnoCaja {
  id: number;
  cajero: string;
  cajeroNombre: string;
  estado: EstadoTurno;
  fechaHoraApertura: string;
  baseInicial: number;
  baseEsperada: number | null;
  observacionApertura: string | null;
  fechaHoraCierre: string | null;
  cerradoPor: string | null;
  totalesPorMedio: TotalMedio[];
  totalIngresos: number;
  totalEgresos: number;
  ingresosEfectivo: number;
  egresosEfectivo: number;
  retiros: number;
  aportes: number;
  efectivoEsperado: number;
  efectivoContado: number | null;
  diferencia: number | null;
  baseSiguiente: number | null;
  valorEntregado: number | null;
  recibidoPor: string | null;
  observacionCierre: string | null;
  conteo: ConteoItem[];
  cantidadMovimientos: number;
}

export interface MovimientoTurno {
  origen: 'FINANZAS' | 'CAJA';
  id: number;
  fechaHora: string;
  tipo: 'INGRESO' | 'EGRESO' | 'RETIRO' | 'APORTE';
  concepto: string;
  categoria: string;
  metodo: MetodoPago;
  metodoNombre: string;
  valor: number;
  referencia: string | null;
  facturaId: number | null;
  registradoPor: string;
  anulado: boolean;
}

export interface DetalleTurno {
  turno: TurnoCaja;
  movimientos: MovimientoTurno[];
}

export interface EstadoCaja {
  turnoAbierto: TurnoCaja | null;
  esMio: boolean;
  baseSugerida: number | null;
  ultimoCajero: string | null;
  ultimoCierre: string | null;
}

export interface MovimientoCajaRequest {
  tipo: TipoMovimiento;
  categoria: CategoriaFinanciera;
  concepto: string;
  valor: number;
  metodoPago: MetodoPago;
  tercero: string | null;
  referencia: string | null;
}

export interface CerrarTurnoRequest {
  conteo: ConteoItem[] | null;
  efectivoContado: number | null;
  baseSiguiente: number;
  recibidoPor: string | null;
  observacion: string | null;
}

/** Billetes y monedas colombianos en circulación (para el arqueo). */
export const BILLETES = [100000, 50000, 20000, 10000, 5000, 2000];
export const MONEDAS = [1000, 500, 200, 100, 50];

/** Categorías que puede usar la recepción desde la caja (mismos códigos que Finanzas). */
export const CATEGORIAS_CAJA: { codigo: CategoriaFinanciera; nombre: string; tipo: TipoMovimiento }[] = [
  { codigo: 'ALOJAMIENTO', nombre: 'Alojamiento', tipo: 'INGRESO' },
  { codigo: 'SERVICIOS', nombre: 'Servicios adicionales', tipo: 'INGRESO' },
  { codigo: 'EVENTOS', nombre: 'Eventos', tipo: 'INGRESO' },
  { codigo: 'OTROS_INGRESOS', nombre: 'Otros ingresos', tipo: 'INGRESO' },
  { codigo: 'COMPRAS_INVENTARIO', nombre: 'Compras de inventario', tipo: 'EGRESO' },
  { codigo: 'MANTENIMIENTO', nombre: 'Mantenimiento', tipo: 'EGRESO' },
  { codigo: 'PROVEEDORES', nombre: 'Proveedores', tipo: 'EGRESO' },
  { codigo: 'SERVICIOS_PUBLICOS', nombre: 'Servicios públicos', tipo: 'EGRESO' },
  { codigo: 'NOMINA', nombre: 'Nómina', tipo: 'EGRESO' },
  { codigo: 'MARKETING', nombre: 'Publicidad y comisiones', tipo: 'EGRESO' },
  { codigo: 'OTROS_EGRESOS', nombre: 'Otros egresos', tipo: 'EGRESO' },
];

export function etiquetaTipoMovimientoTurno(t: MovimientoTurno['tipo']): string {
  return { INGRESO: 'Ingreso', EGRESO: 'Egreso', RETIRO: 'Retiro', APORTE: 'Aporte' }[t];
}

export function claseTipoMovimientoTurno(t: MovimientoTurno['tipo']): string {
  return { INGRESO: 'ok', EGRESO: 'critico', RETIRO: 'alerta', APORTE: 'info' }[t];
}
