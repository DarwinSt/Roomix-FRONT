export type UnidadMedida = 'UNIDAD' | 'PAR' | 'JUEGO' | 'CAJA' | 'LITRO' | 'KILOGRAMO';

export type TipoMovimientoStock = 'ENTRADA' | 'SALIDA';

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
}

export interface AjustarStockRequest {
  tipo: TipoMovimientoStock;
  cantidad: number;
  motivo?: string;
}

export const UNIDADES_MEDIDA: { value: UnidadMedida; label: string }[] = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'PAR', label: 'Par' },
  { value: 'JUEGO', label: 'Juego' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'LITRO', label: 'Litro' },
  { value: 'KILOGRAMO', label: 'Kilogramo' },
];
