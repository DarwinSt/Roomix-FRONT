import { MetodoPago } from './finanzas.model';

export type ModoVenta = 'CONTADO' | 'CARGO_HABITACION';
export type EstadoVenta = 'VIGENTE' | 'ANULADA';

/** Producto del inventario con precio de venta. */
export interface ProductoVenta {
  id: number;
  nombre: string;
  categoria: string;
  precioVenta: number;
  disponible: number;
  unidad: string;
}

/** Huésped alojado al que se le pueden cargar consumos. */
export interface EstadiaActiva {
  reservaId: number;
  habitacion: string;
  huesped: string;
  fechaEntrada: string;
  fechaSalida: string;
}

export interface ItemVenta {
  id: number;
  articuloId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface Venta {
  id: number;
  modo: ModoVenta;
  estado: EstadoVenta;
  reservaId: number | null;
  habitacion: string | null;
  cliente: string | null;
  metodoPago: MetodoPago | null;
  metodoPagoNombre: string | null;
  referencia: string | null;
  total: number;
  items: ItemVenta[];
  registradaPor: string;
  fechaHora: string;
  motivoAnulacion: string | null;
}

export interface VentaRequest {
  modo: ModoVenta;
  reservaId: number | null;
  items: { articuloId: number; cantidad: number }[];
  metodoPago: MetodoPago | null;
  cliente: string | null;
  referencia: string | null;
}

export interface ProductoReporte {
  articuloId: number;
  nombre: string;
  unidades: number;
  ingresos: number;
  costo: number;
  margen: number;
  costoConocido: boolean;
}

export interface ReporteVentas {
  desde: string;
  hasta: string;
  ventas: number;
  unidades: number;
  ingresos: number;
  contado: number;
  cargadoHabitaciones: number;
  costo: number;
  margen: number;
  costosCompletos: boolean;
  productos: ProductoReporte[];
}

/** Ícono del producto según su nombre o, si no se reconoce, su categoría del inventario. */
export function iconoProducto(nombre: string, categoria: string): string {
  const n = nombre.toLowerCase();
  if (/cerveza|vino|licor|aguardiente|ron\b/.test(n)) return 'sports_bar';
  if (/agua|gaseosa|jugo|bebida|soda|cafe|café/.test(n)) return 'local_drink';
  if (/papas|galleta|chocolat|snack|mani|maní|dulce|chicle|mecato/.test(n)) return 'cookie';
  if (/jab[oó]n|champ|acondicion|crema|cepillo|crema dental|shampoo|gel/.test(n)) return 'soap';
  return iconoCategoria(categoria);
}

/** Ícono según el nombre de la categoría del inventario. */
export function iconoCategoria(categoria: string): string {
  const c = categoria.toLowerCase();
  if (/bebida|gaseosa|licor|cerveza|agua/.test(c)) return 'local_drink';
  if (/aliment|snack|comida|mecato|cafeter/.test(c)) return 'restaurant';
  if (/aseo|higiene|amenid|amenit|baño|tocador/.test(c)) return 'soap';
  if (/limpieza|químic|quimic/.test(c)) return 'cleaning_services';
  if (/lencer|blanc|textil|toalla|ropa/.test(c)) return 'dry_cleaning';
  if (/mantenim|herramient|repuest|ferreter/.test(c)) return 'build';
  if (/mobiliar|mueble/.test(c)) return 'chair';
  if (/piscina|\bspa\b/.test(c)) return 'pool';
  if (/tecnolog|electr|c[oó]mputo/.test(c)) return 'devices';
  if (/papeler|oficina/.test(c)) return 'description';
  if (/farmac|botiqu|salud/.test(c)) return 'medication';
  if (/recuerdo|souvenir|artesan|regalo/.test(c)) return 'redeem';
  return 'inventory_2';
}
