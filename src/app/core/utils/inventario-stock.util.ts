import { ArticuloInventario } from '../models/inventario.model';

export type NivelStock = 'ok' | 'bajo' | 'critico';

export function nivelStock(articulo: ArticuloInventario): NivelStock {
  if (articulo.stockBajo) return 'critico';
  if (articulo.cantidadMinima != null && articulo.cantidad <= articulo.cantidadMinima * 1.5) {
    return 'bajo';
  }
  return 'ok';
}

export function porcentajeStock(articulo: ArticuloInventario): number {
  if (articulo.cantidadMinima == null || articulo.cantidadMinima <= 0) {
    return articulo.cantidad > 0 ? 100 : 0;
  }
  const objetivo = articulo.cantidadMinima * 2;
  return Math.min(100, Math.round((articulo.cantidad / objetivo) * 100));
}

export function etiquetaNivel(nivel: NivelStock): string {
  switch (nivel) {
    case 'critico':
      return 'Stock crítico';
    case 'bajo':
      return 'Stock bajo';
    default:
      return 'Stock OK';
  }
}

/** Ícono según la categoría del inventario (el mismo que se usa en la tienda). */
export { iconoCategoria } from '../models/venta.model';
