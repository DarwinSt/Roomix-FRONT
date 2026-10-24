export type Rol = 'ADMIN' | 'RECEPCION' | 'HOUSEKEEPING' | 'FINANZAS' | 'EVENTOS' | 'ALMACEN';

export const ROLES: { value: Rol; label: string; descripcion: string; icon: string }[] = [
  { value: 'ADMIN', label: 'Administrador general', descripcion: 'Acceso total: configuración, usuarios, auditoría y reportes', icon: 'admin_panel_settings' },
  { value: 'RECEPCION', label: 'Recepcionista', descripcion: 'Reservas, huéspedes, check-in, check-out y facturación', icon: 'concierge' },
  { value: 'HOUSEKEEPING', label: 'Ama de llaves / Housekeeping', descripcion: 'Estados de habitaciones, limpieza y mantenimiento', icon: 'cleaning_services' },
  { value: 'FINANZAS', label: 'Contador / Finanzas', descripcion: 'Módulo financiero, facturas y reportes', icon: 'account_balance' },
  { value: 'EVENTOS', label: 'Coordinador de eventos', descripcion: 'Eventos, salones y catálogo de servicios', icon: 'celebration' },
  { value: 'ALMACEN', label: 'Almacenista', descripcion: 'Inventario, movimientos de stock y proveedores', icon: 'inventory_2' },
];

export function etiquetaRol(rol: Rol | null | undefined): string {
  return ROLES.find((r) => r.value === rol)?.label ?? rol ?? '';
}

export interface Usuario {
  id: number;
  username: string;
  nombreCompleto: string;
  email: string;
  rol: Rol;
  rolNombre: string;
  activo: boolean;
  debeCambiarPassword: boolean;
  ultimoAcceso: string | null;
  fechaHoraCreacion: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEn: string;
  usuario: Usuario;
}

export interface UsuarioRequest {
  username: string;
  nombreCompleto: string;
  email: string;
  rol: Rol;
  password?: string | null;
  activo?: boolean;
}

export interface MensajeResponse {
  mensaje: string;
}

/** Política de contraseñas (igual a la del backend). */
export const PATRON_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
export const AYUDA_PASSWORD = 'Mínimo 8 caracteres, con mayúscula, minúscula y número.';
