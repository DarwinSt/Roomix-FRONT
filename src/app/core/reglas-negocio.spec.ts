import { iconoProducto } from './models/venta.model';
import { PERMISOS_POR_ROL } from './models/permisos.model';
import { NAVEGACION, navegacionPara } from './config/navegacion.config';
import { Rol } from './models/auth.model';

describe('Reglas de negocio del frontend', () => {
  describe('Separación de responsabilidades', () => {
    it('recepción cobra y vende, pero no anula', () => {
      expect(PERMISOS_POR_ROL.RECEPCION).toContain('CAJA_OPERAR');
      expect(PERMISOS_POR_ROL.RECEPCION).toContain('VENTAS');
      expect(PERMISOS_POR_ROL.RECEPCION).not.toContain('ANULACIONES');
    });

    it('finanzas anula pero no opera la caja ni vende', () => {
      expect(PERMISOS_POR_ROL.FINANZAS).toContain('ANULACIONES');
      expect(PERMISOS_POR_ROL.FINANZAS).not.toContain('CAJA_OPERAR');
      expect(PERMISOS_POR_ROL.FINANZAS).not.toContain('VENTAS');
    });

    it('ningún rol que cobra trae el permiso de anular, salvo el administrador', () => {
      for (const rol of Object.keys(PERMISOS_POR_ROL) as Rol[]) {
        if (rol === 'ADMIN') continue;
        const p = PERMISOS_POR_ROL[rol];
        const cobra = p.includes('CAJA_OPERAR') || p.includes('VENTAS');
        expect(cobra && p.includes('ANULACIONES'), rol).toBe(false);
      }
    });
  });

  describe('Menú', () => {
    it('la tienda solo aparece con el permiso de ventas', () => {
      const conVentas = navegacionPara((p) => p === 'VENTAS').map((i) => i.path);
      const sinVentas = navegacionPara(() => false).map((i) => i.path);
      expect(conVentas).toContain('/ventas');
      expect(sinVentas).not.toContain('/ventas');
    });

    it('cada opción del menú con permiso apunta a una ruta única', () => {
      const rutas = NAVEGACION.map((i) => i.path);
      expect(new Set(rutas).size).toBe(rutas.length);
    });
  });

  describe('Íconos de la tienda', () => {
    it('reconoce el producto por su nombre antes que por su categoría', () => {
      expect(iconoProducto('Cerveza nacional 330 ml', 'Comida')).toBe('sports_bar');
      expect(iconoProducto('Gaseosa 400 ml', 'Comida')).toBe('local_drink');
      expect(iconoProducto('Papas fritas', 'Bebidas')).toBe('cookie');
      expect(iconoProducto('Jabón de tocador', 'Varios')).toBe('soap');
    });

    it('si no reconoce el nombre usa la categoría', () => {
      expect(iconoProducto('Llavero', 'Recuerdos')).toBe('redeem');
      expect(iconoProducto('Acondicionador 30 ml', 'Amenidades')).toBe('soap');
      expect(iconoProducto('Cosa rara', 'Otra')).toBe('inventory_2');
    });
  });
});
