import type { Rol } from './auth.model';
import type { Evento } from './evento.model';
import type { ArticuloInventario } from './inventario.model';

export interface MovimientoHuespedDia {
  reservaId: number;
  habitacionId: number;
  habitacionNumero: string;
  huespedNombre: string;
  fechaEntrada: string;
  fechaSalida: string;
  noches: number;
  atrasada: boolean;
}

export interface AlertaDashboard {
  nivel: 'INFO' | 'ADVERTENCIA' | 'CRITICA';
  modulo: string;
  mensaje: string;
  ruta: string | null;
}

/** Cada sección es null cuando el rol no tiene acceso a ese módulo. */
export interface Dashboard {
  fecha: string;
  rol: Rol;
  habitaciones: {
    total: number;
    libres: number;
    reservadas: number;
    ocupadas: number;
    enLimpieza: number;
    enMantenimiento: number;
    ocupacionPct: number;
  } | null;
  llegadasHoy: MovimientoHuespedDia[] | null;
  salidasHoy: MovimientoHuespedDia[] | null;
  operacion: {
    incidenciasSinAsignar: number;
    incidenciasActivas: number;
    serviciosActivos: number;
    personalOcupado: number;
  } | null;
  inventario: { articulosStockBajo: number; criticos: ArticuloInventario[] } | null;
  finanzas: {
    ingresosHoy: number;
    ingresosSemana: number;
    ingresosMes: number;
    egresosMes: number;
    saldoPorCobrar: number;
  } | null;
  eventosProximos: Evento[] | null;
  alertas: AlertaDashboard[];
}

export interface GrupoReporte {
  nombre: string;
  cantidad: number;
  valor: number;
}

export interface ReporteOcupacion {
  desde: string;
  hasta: string;
  habitaciones: number;
  nochesDisponibles: number;
  nochesVendidas: number;
  ocupacionPct: number;
  adr: number;
  revpar: number;
  ingresoAlojamiento: number;
  reservas: number;
  cancelaciones: number;
  tasaCancelacionPct: number;
  estanciaPromedioNoches: number;
  serie: { fecha: string; nochesVendidas: number; ocupacionPct: number; ingreso: number }[];
  porCanal: GrupoReporte[];
  porTipoHabitacion: GrupoReporte[];
  porProcedencia: GrupoReporte[];
  serviciosMasVendidos: GrupoReporte[];
}

export interface RegistroAuditoria {
  id: number;
  fechaHora: string;
  usuario: string;
  rol: string | null;
  accion: string;
  modulo: string;
  entidadId: string | null;
  metodoHttp: string | null;
  ruta: string | null;
  estadoHttp: number | null;
  exitoso: boolean;
  ip: string | null;
  detalle: string | null;
}
