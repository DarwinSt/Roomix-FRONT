export type UnidadMedida = 'UNIDAD' | 'PAR' | 'JUEGO' | 'CAJA' | 'LITRO' | 'KILOGRAMO';

export type TipoMovimientoStock = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export interface CategoriaInventario {
  id: number;
  nombre: string;
  descripcion: string;
  ejemplosArticulos: string;
  activo: boolean;
  predefinida: boolean;
  fechaHoraCreacion: string;
  fechaHoraUltimaActualizacion: string;
}

export interface CategoriaInventarioRequest {
  nombre: string;
  descripcion: string;
  ejemplosArticulos: string;
  activo?: boolean;
}

export interface ArticuloInventario {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: CategoriaInventario;
  cantidad: number;
  cantidadMinima: number | null;
  unidadMedida: UnidadMedida;
  ubicacion: string | null;
  activo: boolean;
  stockBajo: boolean;
  proveedor: string | null;
  precioUnitario: number | null;
  /** cantidad × precio unitario */
  valorTotal: number | null;
  fechaHoraCreacion: string;
  fechaHoraUltimaActualizacion: string;
}

export interface ArticuloInventarioRequest {
  nombre: string;
  descripcion: string;
  categoriaId: number;
  cantidad: number;
  cantidadMinima?: number | null;
  unidadMedida: UnidadMedida;
  ubicacion?: string | null;
  activo?: boolean;
  proveedor?: string | null;
  precioUnitario?: number | null;
}

export interface AjustarStockRequest {
  tipo: TipoMovimientoStock;
  /** En AJUSTE es el conteo físico (nuevo stock real) */
  cantidad: number;
  motivo?: string;
  costoUnitario?: number | null;
  registrarCompra?: boolean;
  proveedor?: string | null;
}

export interface MovimientoInventario {
  id: number;
  articuloId: number;
  articuloNombre: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  costoUnitario: number | null;
  motivo: string | null;
  proveedor: string | null;
  registradoPor: string;
  fechaHora: string;
}

export interface ResumenInventario {
  articulosActivos: number;
  valorTotal: number;
  articulosSinPrecio: number;
  totalCriticos: number;
  criticos: ArticuloInventario[];
  valorPorCategoria: { categoria: string; articulos: number; unidades: number; valor: number }[];
  diasAnalizados: number;
  masUsados: { articuloId: number; nombre: string; unidadMedida: string; unidadesSalida: number; valorConsumido: number | null }[];
}

export const UNIDADES_MEDIDA: { value: UnidadMedida; label: string }[] = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'PAR', label: 'Par' },
  { value: 'JUEGO', label: 'Juego' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'LITRO', label: 'Litro' },
  { value: 'KILOGRAMO', label: 'Kilogramo' },
];
