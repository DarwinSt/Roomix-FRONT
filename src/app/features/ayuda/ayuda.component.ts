import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AuthService } from '../../core/services/auth.service';
import { ROLES, Rol, etiquetaRol } from '../../core/models/auth.model';

interface Tema {
  titulo: string;
  icono: string;
  ruta?: string;
  roles: Rol[];
  pasos: string[];
}

/** Manual de usuario integrado: muestra por defecto los temas del rol de la sesión. */
const TEMAS: Tema[] = [
  {
    titulo: 'Ingreso, sesión y contraseña',
    icono: 'lock',
    ruta: '/cambiar-password',
    roles: [],
    pasos: [
      'Ingresa con el usuario y la contraseña que te entregó el administrador. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.',
      'Si es tu primer ingreso o el administrador restableció tu clave, el sistema te pedirá definir una nueva (mínimo 8 caracteres, con mayúscula, minúscula y número).',
      'Si olvidaste la contraseña usa «¿Olvidaste tu contraseña?» en la pantalla de ingreso: recibirás un enlace válido por 30 minutos.',
      'La sesión expira automáticamente; usa «Cerrar sesión» en el menú de usuario al terminar tu turno.',
    ],
  },
  {
    titulo: 'Panel de inicio',
    icono: 'dashboard',
    ruta: '/inicio',
    roles: [],
    pasos: [
      'El inicio muestra solo los indicadores de tu rol: ocupación, llegadas y salidas del día, alertas, finanzas o inventario crítico.',
      'Desde las listas de llegadas y salidas puedes hacer check-in y check-out en un clic.',
      'Las alertas (habitaciones sin asignar, stock bajo, facturas por cobrar) llevan directamente al módulo correspondiente.',
    ],
  },
  {
    titulo: 'Reservas y check-in / check-out',
    icono: 'event_note',
    ruta: '/reservas',
    roles: ['ADMIN', 'RECEPCION'],
    pasos: [
      'Para reservar, ve a Habitaciones, elige una disponible y pulsa «Reservar». Selecciona fechas, huésped, canal (directo, teléfono, Booking, etc.) y observaciones.',
      'Si el huésped no existe, créalo desde el mismo diálogo. Es obligatorio registrar la autorización de tratamiento de datos (Ley 1581 de 2012).',
      'En el detalle de la reserva puedes editarla, cancelarla (con motivo obligatorio), hacer check-in o check-out e imprimir el comprobante.',
      'Al hacer check-out el sistema genera la factura con alojamiento y servicios consumidos; luego registra el pago desde la factura.',
    ],
  },
  {
    titulo: 'Huéspedes',
    icono: 'person',
    ruta: '/huespedes',
    roles: ['ADMIN', 'RECEPCION', 'FINANZAS'],
    pasos: [
      'Registra nombre, documento, contacto y nacionalidad. Los extranjeros no residentes con pasaporte quedan exentos de IVA en alojamiento.',
      'El detalle del huésped muestra su historial de reservas, servicios y facturas.',
    ],
  },
  {
    titulo: 'Habitaciones, plano y fotos',
    icono: 'bed',
    ruta: '/habitaciones',
    roles: ['ADMIN', 'RECEPCION', 'HOUSEKEEPING', 'EVENTOS'],
    pasos: [
      'Los estados son: Disponible, Reservada, Ocupada, En limpieza y En mantenimiento. El color de cada tarjeta indica el estado.',
      'El «Plano» muestra las habitaciones agrupadas por piso para ver la ocupación del edificio de un vistazo.',
      'En el detalle de la habitación verás fotos, capacidad, características y el historial de reservas. El administrador puede subir hasta 6 fotos.',
    ],
  },
  {
    titulo: 'Limpieza y mantenimiento',
    icono: 'cleaning_services',
    ruta: '/incidencias',
    roles: ['ADMIN', 'RECEPCION', 'HOUSEKEEPING'],
    pasos: [
      'Las tareas de limpieza se crean automáticamente al hacer check-out; las de mantenimiento se reportan desde la habitación.',
      'Asigna cada tarea a una persona del personal, inicia y finaliza el trabajo; al terminar la habitación vuelve a estar disponible.',
    ],
  },
  {
    titulo: 'Servicios al huésped',
    icono: 'room_service',
    ruta: '/servicios',
    roles: ['ADMIN', 'RECEPCION', 'HOUSEKEEPING', 'EVENTOS', 'FINANZAS'],
    pasos: [
      'Recepción registra la solicitud (room service, lavandería, spa, transporte, tours) sobre una reserva en curso; el valor se carga a la cuenta.',
      'El personal asigna un responsable, puede programar la hora y marca la solicitud como iniciada o completada.',
      'Una solicitud cancelada se retira de la cuenta; si ya fue facturada no se puede cancelar.',
    ],
  },
  {
    titulo: 'Eventos y salones',
    icono: 'celebration',
    ruta: '/eventos',
    roles: ['ADMIN', 'EVENTOS', 'RECEPCION', 'FINANZAS'],
    pasos: [
      'Crea el evento con salón, horario, capacidad, tipo de acceso (público, privado o solo huéspedes), organizador y recursos (audiovisuales, catering, etc.).',
      'El sistema impide cruces de horario en el mismo salón y capacidades superiores a la del salón.',
      'Inscribe participantes, marca confirmaciones y asistencia, y cambia el estado: Programado → En curso → Finalizado (o Cancelado con motivo).',
      'Finanzas genera la factura del evento desde su detalle.',
    ],
  },
  {
    titulo: 'Inventario',
    icono: 'inventory_2',
    ruta: '/inventario',
    roles: ['ADMIN', 'ALMACEN', 'HOUSEKEEPING', 'FINANZAS'],
    pasos: [
      'Cada artículo tiene categoría, stock mínimo, proveedor y precio unitario. Los que están por debajo del mínimo aparecen como alerta.',
      'Registra entradas (compras), salidas (consumo) y ajustes; cada movimiento queda en el historial. Las compras generan un egreso en Finanzas.',
      'El reporte de inventario muestra la valorización total, los artículos más usados y los movimientos del periodo.',
    ],
  },
  {
    titulo: 'Finanzas y facturación',
    icono: 'account_balance',
    ruta: '/finanzas',
    roles: ['ADMIN', 'FINANZAS'],
    pasos: [
      'El panel muestra ingresos, egresos y utilidad del periodo con su comparativo, gráficos diarios o mensuales y totales por categoría.',
      'Registra egresos manuales (nómina, servicios públicos, proveedores). Los ingresos se generan solos al registrar pagos de facturas.',
      'En Facturas puedes consultar, registrar pagos parciales o totales, imprimir y anular (con motivo).',
    ],
  },
  {
    titulo: 'Reportes',
    icono: 'insights',
    ruta: '/reportes',
    roles: ['ADMIN', 'FINANZAS'],
    pasos: [
      'Elige el periodo para ver ocupación, ADR (tarifa promedio), RevPAR (ingreso por habitación disponible), cancelaciones, canales, procedencia y servicios.',
      'Exporta a CSV (compatible con Excel) o imprime el reporte.',
    ],
  },
  {
    titulo: 'Usuarios, roles y auditoría',
    icono: 'manage_accounts',
    ruta: '/usuarios',
    roles: ['ADMIN'],
    pasos: [
      'Crea usuarios con uno de los 6 roles: Administrador, Recepción, Housekeeping, Finanzas, Eventos y Almacén. Cada rol ve solo sus módulos.',
      'Puedes desactivar usuarios o restablecer su contraseña (se genera una clave temporal que deberán cambiar).',
      'La Auditoría registra quién hizo cada acción, cuándo, desde qué IP y con qué resultado; se puede filtrar por usuario, módulo y fecha.',
    ],
  },
];

@Component({
  selector: 'app-ayuda',
  imports: [RouterLink, MatExpansionModule, MatIconModule, MatButtonToggleModule],
  template: `
    <div class="page-header">
      <h1>Ayuda y manual de usuario</h1>
      <p>Guía rápida de cada módulo. Por defecto ves los temas de tu rol ({{ etiquetaRol(rolSesion()) }}).</p>
    </div>

    <div class="rx-toolbar">
      <mat-button-toggle-group [value]="filtro()" (change)="filtro.set($event.value)">
        <mat-button-toggle value="mio">Mi rol</mat-button-toggle>
        <mat-button-toggle value="todos">Todos los módulos</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    <mat-accordion multi>
      @for (t of temas(); track t.titulo; let primero = $first) {
        <mat-expansion-panel [expanded]="primero">
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>{{ t.icono }}</mat-icon>{{ t.titulo }}</mat-panel-title>
          </mat-expansion-panel-header>
          <ol>
            @for (p of t.pasos; track $index) { <li>{{ p }}</li> }
          </ol>
          <div class="pie">
            <span class="rx-muted">{{ t.roles.length ? t.roles.map(etiquetaRol).join(' · ') : 'Todos los roles' }}</span>
            @if (t.ruta && puedeIr(t)) { <a [routerLink]="t.ruta">Ir al módulo →</a> }
          </div>
        </mat-expansion-panel>
      }
    </mat-accordion>

    <section class="rx-card roles">
      <div class="rx-card-titulo"><mat-icon>badge</mat-icon>Roles del sistema</div>
      <div class="rx-datos">
        @for (r of roles; track r.value) {
          <div class="rx-dato"><span>{{ r.label }}</span><strong>{{ r.descripcion }}</strong></div>
        }
      </div>
    </section>
  `,
  styles: `
    mat-panel-title { display: flex; align-items: center; gap: 0.6rem; }
    ol { margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.45rem; line-height: 1.45; }
    .pie { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; font-size: 0.85rem; }
    .pie a { color: var(--primary-300); font-weight: 600; }
    .roles { margin-top: 1.25rem; }
  `,
})
export class AyudaComponent {
  private readonly auth = inject(AuthService);
  readonly etiquetaRol = etiquetaRol;
  readonly roles = ROLES;
  readonly rolSesion = computed(() => this.auth.rol()!);
  readonly filtro = signal<'mio' | 'todos'>('mio');
  readonly temas = computed(() => (this.filtro() === 'todos' ? TEMAS : TEMAS.filter((t) => this.puedeIr(t))));

  puedeIr(t: Tema): boolean {
    const rol = this.auth.rol();
    return t.roles.length === 0 || (!!rol && t.roles.includes(rol));
  }
}
