import { Permiso } from '../models/permisos.model';
import { ROOMIX_BEDROOM_ICON_URL, ROOMIX_INVENTORY_ICON_URL, ROOMIX_LIST_ICON_URL } from './icons.config';

export interface ItemNavegacion {
  path: string;
  label: string;
  icon?: string;
  iconUrl?: string;
  /** Permiso necesario (y su módulo licenciado); sin permiso = todos los usuarios autenticados */
  permiso?: Permiso;
  /** Agrupación en el menú lateral */
  grupo: 'operacion' | 'gestion' | 'administracion';
}

/**
 * Módulos del sistema y roles con acceso (mismas reglas que SecurityConfig del backend).
 * El menú lateral, los accesos rápidos y los guards de ruta usan esta única fuente.
 */
export const NAVEGACION: ItemNavegacion[] = [
  { path: '/inicio', icon: 'dashboard', label: 'Inicio', grupo: 'operacion' },
  { path: '/habitaciones', iconUrl: ROOMIX_BEDROOM_ICON_URL, label: 'Habitaciones', permiso: 'HABITACIONES_VER', grupo: 'operacion' },
  { path: '/reservas', icon: 'event_note', label: 'Reservas', permiso: 'RESERVAS_VER', grupo: 'operacion' },
  { path: '/caja', icon: 'point_of_sale', label: 'Caja', permiso: 'CAJA_VER', grupo: 'operacion' },
  { path: '/huespedes', icon: 'person', label: 'Huéspedes', permiso: 'RESERVAS_VER', grupo: 'operacion' },
  { path: '/incidencias', icon: 'report_problem', label: 'Limpieza y mantenimiento', permiso: 'LIMPIEZA', grupo: 'operacion' },
  { path: '/servicios', icon: 'room_service', label: 'Servicios', permiso: 'SERVICIOS_VER', grupo: 'operacion' },
  { path: '/eventos', icon: 'celebration', label: 'Eventos', permiso: 'EVENTOS_VER', grupo: 'operacion' },
  { path: '/personal', icon: 'groups', label: 'Personal', permiso: 'PERSONAL_VER', grupo: 'gestion' },
  { path: '/inventario', iconUrl: ROOMIX_INVENTORY_ICON_URL, label: 'Inventario', permiso: 'INVENTARIO_VER', grupo: 'gestion' },
  { path: '/inventario/categorias', iconUrl: ROOMIX_LIST_ICON_URL, label: 'Categorías', permiso: 'INVENTARIO_VER', grupo: 'gestion' },
  { path: '/finanzas', icon: 'account_balance', label: 'Finanzas', permiso: 'FINANZAS', grupo: 'gestion' },
  { path: '/facturas', icon: 'receipt_long', label: 'Facturas', permiso: 'FACTURAS', grupo: 'gestion' },
  { path: '/reportes', icon: 'insights', label: 'Reportes', permiso: 'REPORTES', grupo: 'gestion' },
  { path: '/usuarios', icon: 'manage_accounts', label: 'Usuarios', permiso: 'USUARIOS', grupo: 'administracion' },
  { path: '/promociones', icon: 'sell', label: 'Promociones', permiso: 'PROMOCIONES_GESTIONAR', grupo: 'administracion' },
  { path: '/auditoria', icon: 'policy', label: 'Auditoría', permiso: 'USUARIOS', grupo: 'administracion' },
  { path: '/configuracion', icon: 'tune', label: 'Configuración del hotel', permiso: 'CONFIGURACION', grupo: 'administracion' },
  { path: '/ayuda', icon: 'help_outline', label: 'Ayuda', grupo: 'administracion' },
];

/** Menú del usuario: los módulos para los que tiene permiso (y que están en la licencia del hotel). */
export function navegacionPara(puede: (p: Permiso) => boolean): ItemNavegacion[] {
  return NAVEGACION.filter((i) => !i.permiso || puede(i.permiso));
}
