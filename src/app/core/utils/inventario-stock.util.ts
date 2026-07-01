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

export function iconoCategoria(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('limpieza')) return 'cleaning_services';
  if (n.includes('mobiliario') || n.includes('mueble')) return 'chair';
  if (n.includes('comida') || n.includes('alimento')) return 'restaurant';
  if (n.includes('ropa') || n.includes('textil')) return 'checkroom';
  if (n.includes('baño') || n.includes('aseo')) return 'soap';
  return 'inventory_2';
}
