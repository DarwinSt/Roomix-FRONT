import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { VentaService } from '../../core/services/venta.service';
import { EstadiaActiva, ModoVenta, ProductoVenta, Venta, iconoProducto } from '../../core/models/venta.model';
import { METODOS_PAGO, MetodoPago } from '../../core/models/finanzas.model';
import { extractApiErrorMessage } from '../../core/utils/api-error.util';
import { moneda } from '../../core/utils/formato.util';

/** Abre la venta ya cargada a una estadía (desde el detalle de la reserva). */
export interface VentaDialogData {
  reservaId?: number;
  habitacion?: string;
  huesped?: string;
}

interface Linea {
  producto: ProductoVenta;
  cantidad: number;
}

/**
 * Punto de venta de la tienda y el minibar: el recepcionista toca los productos, ajusta cantidades y elige si cobra
 * ahora (entra a su caja) o lo carga a la habitación (se paga en el check-out). El stock se descuenta al registrar.
 */
@Component({
  selector: 'app-venta-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule],
  template: `
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>storefront</mat-icon></div>
      <div class="header-text">
        <h2>{{ fija ? 'Cargar consumo a la habitación ' + data.habitacion : 'Vender productos' }}</h2>
        <p>{{ fija ? data.huesped + ' · se cobra con la factura en el check-out' : 'Toque los productos para agregarlos. El stock se descuenta al registrar la venta.' }}</p>
      </div>
    </div>

    <mat-dialog-content>
      @if (cargando()) {
        <div class="cargando"><mat-spinner diameter="36" /></div>
      } @else if (productos().length === 0) {
        <div class="vacio">
          <mat-icon>inventory_2</mat-icon>
          <strong>No hay productos a la venta</strong>
          <span>En Inventario, edite un artículo (gaseosas, snacks, artículos de aseo…) y póngale <b>precio de venta</b>.</span>
        </div>
      } @else {
        <div class="pos">
          <section class="catalogo" aria-label="Productos">
            <mat-form-field appearance="outline" class="buscar" subscriptSizing="dynamic">
              <mat-icon matPrefix>search</mat-icon>
              <input matInput placeholder="Buscar producto" [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" />
            </mat-form-field>
            @if (categorias().length > 1) {
              <div class="categorias" role="tablist">
                <button type="button" role="tab" [class.activa]="!categoria()" (click)="categoria.set(null)">Todo</button>
                @for (c of categorias(); track c) {
                  <button type="button" role="tab" [class.activa]="categoria() === c" (click)="categoria.set(c)">{{ c }}</button>
                }
              </div>
            }
            <div class="productos">
              @for (p of filtrados(); track p.id) {
                <button type="button" class="producto" [class.en-pedido]="cantidadDe(p.id) > 0" [disabled]="p.disponible <= cantidadDe(p.id)"
                        (click)="agregar(p)" [attr.aria-label]="'Agregar ' + p.nombre">
                  <span class="icono"><mat-icon>{{ icono(p.nombre, p.categoria) }}</mat-icon></span>
                  <span class="nombre">{{ p.nombre }}</span>
                  <span class="precio">{{ moneda(p.precioVenta) }}</span>
                  <span class="stock" [class.bajo]="p.disponible - cantidadDe(p.id) <= 3">
                    {{ p.disponible - cantidadDe(p.id) <= 0 ? 'Agotado' : (p.disponible - cantidadDe(p.id)) + ' disponibles' }}
                  </span>
                  @if (cantidadDe(p.id) > 0) { <span class="badge">{{ cantidadDe(p.id) }}</span> }
                </button>
              } @empty {
                <p class="rx-muted sin-resultados">Ningún producto coincide con la búsqueda.</p>
              }
            </div>
          </section>

          <section class="ticket" aria-label="Pedido">
            <p class="rx-etiqueta">Pedido</p>
            @if (lineas().length === 0) {
              <div class="ticket-vacio"><mat-icon>touch_app</mat-icon><span>Toque un producto para agregarlo</span></div>
            } @else {
              <ul class="lineas">
                @for (l of lineas(); track l.producto.id) {
                  <li>
                    <div class="linea-info">
                      <span class="linea-nombre">{{ l.producto.nombre }}</span>
                      <span class="linea-precio">{{ moneda(l.producto.precioVenta) }} c/u</span>
                    </div>
                    <div class="stepper">
                      <button type="button" (click)="cambiar(l.producto.id, -1)" [attr.aria-label]="'Quitar uno de ' + l.producto.nombre"><mat-icon>{{ l.cantidad === 1 ? 'delete' : 'remove' }}</mat-icon></button>
                      <span>{{ l.cantidad }}</span>
                      <button type="button" (click)="cambiar(l.producto.id, 1)" [disabled]="l.cantidad >= l.producto.disponible" [attr.aria-label]="'Agregar uno de ' + l.producto.nombre"><mat-icon>add</mat-icon></button>
                    </div>
                    <span class="linea-total">{{ moneda(l.producto.precioVenta * l.cantidad) }}</span>
                  </li>
                }
              </ul>
            }

            @if (!fija) {
              <p class="rx-etiqueta">¿Cómo se paga?</p>
              <mat-button-toggle-group class="rx-segmento ancho-completo" [ngModel]="modo()" (ngModelChange)="cambiarModo($event)" aria-label="Forma de pago">
                <mat-button-toggle value="CONTADO"><mat-icon>payments</mat-icon>Cobrar ahora</mat-button-toggle>
                <mat-button-toggle value="CARGO_HABITACION"><mat-icon>bed</mat-icon>A la habitación</mat-button-toggle>
              </mat-button-toggle-group>
            }

            @if (modo() === 'CONTADO') {
              <div class="rx-opciones compactas medios">
                @for (m of metodos; track m.value) {
                  <button type="button" class="rx-opcion" [class.activa]="metodo() === m.value" (click)="metodo.set(m.value)">
                    <mat-icon>{{ m.icon }}</mat-icon>{{ m.label }}
                  </button>
                }
              </div>
              <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                <mat-label>Cliente (opcional)</mat-label>
                <input matInput maxlength="150" [ngModel]="cliente()" (ngModelChange)="cliente.set($event)" placeholder="Nombre o habitación" />
              </mat-form-field>
            } @else if (!fija) {
              @if (estadias().length === 0) {
                <p class="aviso"><mat-icon>info</mat-icon>No hay huéspedes alojados (con check-in) para cargar la venta.</p>
              } @else {
                <mat-form-field appearance="outline" class="full estadia" subscriptSizing="dynamic">
                  <mat-label>Habitación</mat-label>
                  <mat-select [ngModel]="reservaId()" (ngModelChange)="reservaId.set($event)" panelClass="roomix-select-panel">
                    @for (e of estadias(); track e.reservaId) {
                      <mat-option [value]="e.reservaId">Hab. {{ e.habitacion }} · {{ e.huesped }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
            }
          </section>
        </div>
      }
      @if (error()) { <p class="rx-error-dialogo"><mat-icon>error_outline</mat-icon>{{ error() }}</p> }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <div class="rx-pie-total">
        <span>Total · {{ unidades() }} {{ unidades() === 1 ? 'producto' : 'productos' }}</span>
        <strong>{{ moneda(total()) }}</strong>
      </div>
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="registrar()" [disabled]="guardando() || lineas().length === 0">
        <mat-icon>{{ modo() === 'CONTADO' ? 'point_of_sale' : 'bed' }}</mat-icon>
        {{ modo() === 'CONTADO' ? 'Cobrar ' + moneda(total()) : 'Cargar a la habitación' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .cargando { display: grid; place-items: center; min-height: 240px; }
    .vacio { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.4rem; padding: 2rem 1rem; color: var(--text-200); }
    .vacio mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: var(--primary-200); }
    .vacio strong { color: var(--text-strong); font-size: 1rem; }

    .pos { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
    .buscar { width: 100%; margin-bottom: 0.6rem; }
    .categorias { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.4rem; margin-bottom: 0.4rem; scrollbar-width: thin; }
    .categorias button { flex-shrink: 0; border: 1px solid var(--bg-200); background: #fff; border-radius: 999px; padding: 0.35rem 0.85rem;
      font: inherit; font-size: 0.82rem; font-weight: 600; color: var(--text-100); cursor: pointer; }
    .categorias button.activa { background: var(--primary-300); border-color: var(--primary-300); color: #fff; }

    .productos { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.6rem; }
    .producto { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; padding: 0.75rem;
      border: 1.5px solid var(--bg-200); border-radius: 14px; background: #fff; font: inherit; text-align: left; cursor: pointer;
      transition: border-color 0.15s, transform 0.1s, box-shadow 0.15s; }
    .producto:hover:not(:disabled) { border-color: rgba(var(--primary-300-rgb), 0.5); box-shadow: 0 6px 16px rgba(var(--primary-400-rgb), 0.1); }
    .producto:active:not(:disabled) { transform: scale(0.98); }
    .producto:disabled { opacity: 0.5; cursor: not-allowed; }
    .producto.en-pedido { border-color: var(--primary-300); background: rgba(var(--primary-100-rgb), 0.18); }
    .producto .icono { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; margin-bottom: 0.2rem;
      background: rgba(var(--primary-100-rgb), 0.45); color: var(--primary-400); }
    .producto .icono mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    .producto .nombre { font-weight: 600; font-size: 0.86rem; line-height: 1.25; color: var(--text-strong); }
    .producto .precio { font-weight: 800; font-size: 0.95rem; color: var(--text-100); }
    .producto .stock { font-size: 0.72rem; color: var(--text-200); }
    .producto .stock.bajo { color: #b26a00; font-weight: 600; }
    .producto .badge { position: absolute; top: 8px; right: 8px; min-width: 24px; height: 24px; border-radius: 999px; padding: 0 6px;
      display: grid; place-items: center; background: var(--primary-300); color: #fff; font-size: 0.78rem; font-weight: 700; }
    .sin-resultados { grid-column: 1 / -1; }

    .ticket { position: sticky; top: 0; background: rgba(var(--primary-100-rgb), 0.14); border: 1px solid rgba(var(--primary-300-rgb), 0.12);
      border-radius: 16px; padding: 0.9rem; }
    .ticket .rx-etiqueta:not(:first-child) { margin-top: 1rem; }
    .ticket-vacio { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 1.25rem 0.5rem; color: var(--text-200);
      font-size: 0.85rem; border: 1.5px dashed var(--bg-300); border-radius: 12px; }
    .lineas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; max-height: 220px; overflow-y: auto; }
    .lineas li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 0.5rem; align-items: center; background: #fff;
      border-radius: 10px; padding: 0.45rem 0.55rem; }
    .linea-info { display: flex; flex-direction: column; min-width: 0; }
    .linea-nombre { font-weight: 600; font-size: 0.84rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .linea-precio { font-size: 0.72rem; color: var(--text-200); }
    .linea-total { font-weight: 700; font-size: 0.86rem; min-width: 72px; text-align: right; }
    .stepper { display: inline-flex; align-items: center; gap: 0.15rem; background: rgba(var(--primary-300-rgb), 0.08); border-radius: 999px; padding: 2px; }
    .stepper button { width: 28px; height: 28px; border: none; border-radius: 50%; background: #fff; display: grid; place-items: center;
      cursor: pointer; color: var(--primary-400); }
    .stepper button:disabled { opacity: 0.4; cursor: not-allowed; }
    .stepper button mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .stepper span { min-width: 22px; text-align: center; font-weight: 700; font-size: 0.86rem; }
    .medios { margin: 0.75rem 0 0.75rem; }
    .medios .rx-opcion { min-height: 40px; font-size: 0.8rem; }
    .full { width: 100%; }
    .estadia { margin-top: 0.75rem; }
    .aviso { display: flex; gap: 0.4rem; align-items: center; color: #8a5a00; font-size: 0.85rem; margin: 0.75rem 0 0; }

    @media (max-width: 720px) {
      .pos { grid-template-columns: 1fr; }
      .ticket { position: static; }
    }
  `,
})
export class VentaDialogComponent {
  readonly data = inject<VentaDialogData | null>(MAT_DIALOG_DATA) ?? {};
  private readonly service = inject(VentaService);
  private readonly ref = inject(MatDialogRef<VentaDialogComponent, Venta | null>);

  /** Abierto desde una reserva: la venta va a esa habitación, sin elegir. */
  readonly fija = !!this.data.reservaId;
  readonly moneda = moneda;
  readonly icono = iconoProducto;
  readonly metodos = METODOS_PAGO;

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly productos = signal<ProductoVenta[]>([]);
  readonly estadias = signal<EstadiaActiva[]>([]);
  readonly busqueda = signal('');
  readonly categoria = signal<string | null>(null);
  readonly pedido = signal<Map<number, number>>(new Map());
  readonly modo = signal<ModoVenta>(this.fija ? 'CARGO_HABITACION' : 'CONTADO');
  readonly metodo = signal<MetodoPago>('EFECTIVO');
  readonly cliente = signal('');
  readonly reservaId = signal<number | null>(this.data.reservaId ?? null);

  readonly categorias = computed(() => [...new Set(this.productos().map((p) => p.categoria))]);
  readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const c = this.categoria();
    return this.productos().filter((p) => (!c || p.categoria === c) && (!q || p.nombre.toLowerCase().includes(q)));
  });
  readonly lineas = computed<Linea[]>(() => {
    const porId = new Map(this.productos().map((p) => [p.id, p]));
    return [...this.pedido()].map(([id, cantidad]) => ({ producto: porId.get(id)!, cantidad })).filter((l) => !!l.producto);
  });
  readonly total = computed(() => this.lineas().reduce((t, l) => t + l.producto.precioVenta * l.cantidad, 0));
  readonly unidades = computed(() => this.lineas().reduce((t, l) => t + l.cantidad, 0));

  constructor() {
    this.service.productos().subscribe({
      next: (p) => {
        this.productos.set(p);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(extractApiErrorMessage(e));
      },
    });
    if (!this.fija) {
      this.service.estadias().subscribe({ next: (e) => this.estadias.set(e), error: () => this.estadias.set([]) });
    }
  }

  cantidadDe(id: number): number {
    return this.pedido().get(id) ?? 0;
  }

  agregar(p: ProductoVenta): void {
    this.cambiar(p.id, 1);
  }

  cambiar(id: number, paso: number): void {
    const p = this.productos().find((x) => x.id === id);
    if (!p) return;
    const mapa = new Map(this.pedido());
    const nueva = Math.min((mapa.get(id) ?? 0) + paso, p.disponible);
    if (nueva <= 0) mapa.delete(id);
    else mapa.set(id, nueva);
    this.pedido.set(mapa);
    this.error.set(null);
  }

  cambiarModo(m: ModoVenta): void {
    this.modo.set(m);
    this.error.set(null);
    if (m === 'CARGO_HABITACION' && !this.reservaId() && this.estadias().length === 1) this.reservaId.set(this.estadias()[0].reservaId);
  }

  registrar(): void {
    if (this.lineas().length === 0) return;
    if (this.modo() === 'CARGO_HABITACION' && !this.reservaId()) {
      this.error.set('Elija la habitación a la que se carga la venta.');
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.service
      .registrar({
        modo: this.modo(),
        reservaId: this.modo() === 'CARGO_HABITACION' ? this.reservaId() : null,
        items: this.lineas().map((l) => ({ articuloId: l.producto.id, cantidad: l.cantidad })),
        metodoPago: this.modo() === 'CONTADO' ? this.metodo() : null,
        cliente: this.modo() === 'CONTADO' ? this.cliente().trim() || null : null,
        referencia: null,
      })
      .subscribe({
        next: (v) => this.ref.close(v),
        error: (e) => {
          this.guardando.set(false);
          this.error.set(extractApiErrorMessage(e));
        },
      });
  }
}
