export type TipoMovimiento = 'INGRESO' | 'EGRESO';
export type MetodoPago = 'EFECTIVO' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'TRANSFERENCIA' | 'PAGO_DIGITAL' | 'OTRO';
export type EstadoFactura = 'PENDIENTE' | 'PAGADA_PARCIAL' | 'PAGADA' | 'ANULADA';
export type OrigenItem = 'ALOJAMIENTO' | 'SERVICIO' | 'EVENTO' | 'OTRO';
export type CategoriaFinanciera =
  | 'ALOJAMIENTO' | 'SERVICIOS' | 'EVENTOS' | 'OTROS_INGRESOS'
  | 'COMPRAS_INVENTARIO' | 'NOMINA' | 'SERVICIOS_PUBLICOS' | 'MANTENIMIENTO' | 'PROVEEDORES'
  | 'ARRIENDO' | 'IMPUESTOS' | 'MARKETING' | 'OTROS_EGRESOS';

export interface CategoriaInfo {
  codigo: CategoriaFinanciera;
  nombre: string;
  tipo: TipoMovimiento;
}

export const METODOS_PAGO: { value: MetodoPago; label: string; icon: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: 'payments' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito', icon: 'credit_card' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta débito', icon: 'credit_card' },
  { value: 'TRANSFERENCIA', label: 'Transferencia bancaria', icon: 'account_balance' },
  { value: 'PAGO_DIGITAL', label: 'Nequi / Daviplata', icon: 'smartphone' },
  { value: 'OTRO', label: 'Otro', icon: 'more_horiz' },
];

export function etiquetaMetodoPago(m: MetodoPago | null | undefined): string {
  return METODOS_PAGO.find((x) => x.value === m)?.label ?? m ?? '—';
}

export const ESTADOS_FACTURA: { value: EstadoFactura; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'PAGADA_PARCIAL', label: 'Pago parcial' },
  { value: 'PAGADA', label: 'Pagada' },
  { value: 'ANULADA', label: 'Anulada' },
];

export function etiquetaEstadoFactura(e: EstadoFactura): string {
  return ESTADOS_FACTURA.find((x) => x.value === e)?.label ?? e;
}

export interface MovimientoFinanciero {
  id: number;
  tipo: TipoMovimiento;
  categoria: CategoriaFinanciera;
  categoriaNombre: string;
  concepto: string;
  valor: number;
  fecha: string;
  metodoPago: MetodoPago | null;
  tercero: string | null;
  referencia: string | null;
  facturaId: number | null;
  automatico: boolean;
  registradoPor: string;
  anulado: boolean;
  motivoAnulacion: string | null;
  fechaHoraCreacion: string;
}

export interface MovimientoRequest {
  tipo: TipoMovimiento;
  categoria: CategoriaFinanciera;
  concepto: string;
  valor: number;
  fecha?: string | null;
  metodoPago?: MetodoPago | null;
  tercero?: string | null;
  referencia?: string | null;
}

export interface TotalCategoria {
  categoria: CategoriaFinanciera;
  nombre: string;
  valor: number;
  porcentaje: number;
}

export interface PuntoSerie {
  etiqueta: string;
  desde: string;
  ingresos: number;
  egresos: number;
}

export interface ResumenFinanciero {
  desde: string;
  hasta: string;
  totalIngresos: number;
  totalEgresos: number;
  utilidad: number;
  margenPct: number | null;
  saldoPorCobrar: number;
  granularidad: 'DIA' | 'MES';
  ingresosPorCategoria: TotalCategoria[];
  egresosPorCategoria: TotalCategoria[];
  serie: PuntoSerie[];
  periodoAnterior: {
    desde: string;
    hasta: string;
    ingresos: number;
    egresos: number;
    utilidad: number;
    variacionIngresosPct: number | null;
    variacionEgresosPct: number | null;
    variacionUtilidadPct: number | null;
  };
}

export interface FacturaItem {
  id: number;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  total: number;
  origen: OrigenItem;
}

export interface Pago {
  id: number;
  valor: number;
  metodo: MetodoPago;
  metodoNombre: string;
  referencia: string | null;
  fechaHora: string;
  registradoPor: string;
}

export interface Factura {
  id: number;
  numero: string;
  reservaId: number | null;
  habitacionNumero: string | null;
  fechaEntrada: string | null;
  fechaSalida: string | null;
  eventoId: number | null;
  huespedId: number | null;
  clienteNombre: string;
  clienteDocumento: string | null;
  clienteEmail: string | null;
  fechaEmision: string;
  subtotal: number;
  porcentajeImpuesto: number;
  impuesto: number;
  total: number;
  totalPagado: number;
  saldo: number;
  estado: EstadoFactura;
  observaciones: string | null;
  motivoAnulacion: string | null;
  emitidaPor: string;
  items: FacturaItem[];
  pagos: Pago[];
}

export interface PagoRequest {
  valor: number;
  metodo: MetodoPago;
  referencia?: string | null;
}

export interface LineaCuenta {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  total: number;
  origen: OrigenItem;
  referenciaId: number;
  facturado: boolean;
}

export interface CuentaReserva {
  reservaId: number;
  habitacionNumero: string;
  huespedNombre: string;
  fechaEntrada: string;
  fechaSalida: string;
  lineas: LineaCuenta[];
  subtotal: number;
  porcentajeImpuesto: number;
  impuesto: number;
  total: number;
  exentoIva: boolean;
  totalPagado: number;
  saldo: number;
  facturas: Factura[];
}

export interface Pagina<T> {
  contenido: T[];
  totalElementos: number;
  totalPaginas: number;
  pagina: number;
  tamano: number;
}

export interface HotelInfo {
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  prefijoFactura: string;
  ivaPorcentaje: number;
  exentoIvaExtranjeros: boolean;
}
