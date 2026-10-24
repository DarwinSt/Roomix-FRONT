import { Rol } from '../models/auth.model';
import { ROOMIX_BEDROOM_ICON_URL, ROOMIX_INVENTORY_ICON_URL, ROOMIX_LIST_ICON_URL } from './icons.config';

export interface ItemNavegacion {
  path: string;
  label: string;
  icon?: string;
  iconUrl?: string;
  /** Roles con acceso; vacío = todos los usuarios autenticados */
  roles: Rol[];
  /** Agrupación en el menú lateral */
  grupo: 'operacion' | 'gestion' | 'administracion';
}

/**
 * Módulos del sistema y roles con acceso (mismas reglas que SecurityConfig del backend).
 * El menú lateral, los accesos rápidos y los guards de ruta usan esta única fuente.
 */
export const NAVEGACION: ItemNavegacion[] = [
  { path: '/inicio', icon: 'dashboard', label: 'Inicio', roles: [], grupo: 'operacion' },
  { path: '/habitaciones', iconUrl: ROOMIX_BEDROOM_ICON_URL, label: 'Habitaciones', roles: ['ADMIN', 'RECEPCION', 'HOUSEKEEPING', 'EVENTOS'], grupo: 'operacion' },
  { path: '/reservas', icon: 'event_note', label: 'Reservas', roles: ['ADMIN', 'RECEPCION', 'FINANZAS'], grupo: 'operacion' },
  { path: '/huespedes', icon: 'person', label: 'Huéspedes', roles: ['ADMIN', 'RECEPCION', 'FINANZAS'], grupo: 'operacion' },
  { path: '/incidencias', icon: 'report_problem', label: 'Limpieza y mantenimiento', roles: ['ADMIN', 'RECEPCION', 'HOUSEKEEPING'], grupo: 'operacion' },
  { path: '/servicios', icon: 'room_service', label: 'Servicios', roles: ['ADMIN', 'RECEPCION', 'HOUSEKEEPING', 'EVENTOS', 'FINANZAS'], grupo: 'operacion' },
  { path: '/eventos', icon: 'celebration', label: 'Eventos', roles: ['ADMIN', 'EVENTOS', 'RECEPCION', 'FINANZAS'], grupo: 'operacion' },
  { path: '/personal', icon: 'groups', label: 'Personal', roles: ['ADMIN', 'RECEPCION', 'HOUSEKEEPING', 'EVENTOS'], grupo: 'gestion' },
  { path: '/inventario', iconUrl: ROOMIX_INVENTORY_ICON_URL, label: 'Inventario', roles: ['ADMIN', 'ALMACEN', 'HOUSEKEEPING', 'FINANZAS'], grupo: 'gestion' },
  { path: '/inventario/categorias', iconUrl: ROOMIX_LIST_ICON_URL, label: 'Categorías', roles: ['ADMIN', 'ALMACEN', 'HOUSEKEEPING', 'FINANZAS'], grupo: 'gestion' },
  { path: '/finanzas', icon: 'account_balance', label: 'Finanzas', roles: ['ADMIN', 'FINANZAS'], grupo: 'gestion' },
  { path: '/facturas', icon: 'receipt_long', label: 'Facturas', roles: ['ADMIN', 'FINANZAS', 'RECEPCION'], grupo: 'gestion' },
  { path: '/reportes', icon: 'insights', label: 'Reportes', roles: ['ADMIN', 'FINANZAS'], grupo: 'gestion' },
  { path: '/usuarios', icon: 'manage_accounts', label: 'Usuarios', roles: ['ADMIN'], grupo: 'administracion' },
  { path: '/auditoria', icon: 'policy', label: 'Auditoría', roles: ['ADMIN'], grupo: 'administracion' },
  { path: '/ayuda', icon: 'help_outline', label: 'Ayuda', roles: [], grupo: 'administracion' },
];

export function rolesDeRuta(path: string): Rol[] {
  return NAVEGACION.find((i) => i.path === path)?.roles ?? [];
}

export function navegacionPara(rol: Rol | null): ItemNavegacion[] {
  if (!rol) return [];
  return NAVEGACION.filter((i) => i.roles.length === 0 || i.roles.includes(rol));
}
