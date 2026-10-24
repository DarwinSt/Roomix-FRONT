import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { AuthService } from '../../../core/services/auth.service';
import { Habitacion, TIPOS_HABITACION } from '../../../core/models/habitacion.model';
import { Reserva, claseEstadoReserva, etiquetaEstadoReserva } from '../../../core/models/reserva.model';
import { metaEstado } from '../../../core/utils/habitacion-estado.util';
import { etiquetaEstadoHabitacion } from '../../../core/utils/servicios-habitacion.util';
import { fechaCorta, moneda } from '../../../core/utils/formato.util';

const MAX_FOTOS = 6;
const MAX_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-habitacion-detalle',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (habitacion(); as h) {
      <div class="page-header row">
        <div>
          <h1>Habitación {{ h.numero }}</h1>
          <p>{{ tipo(h) }} · Piso {{ h.piso ?? '—' }} · {{ h.capacidad ?? '—' }} personas · {{ moneda(h.precioNoche) }}/noche</p>
        </div>
        <div class="rx-acciones">
          <a mat-stroked-button routerLink="/habitaciones"><mat-icon>arrow_back</mat-icon>Habitaciones</a>
          @if (puedeOperar()) {
            <a mat-stroked-button [routerLink]="['/habitaciones', h.id, 'editar']"><mat-icon>edit</mat-icon>Editar</a>
            @if (h.estado === 'LIBRE') {
              <a mat-flat-button color="primary" [routerLink]="['/habitaciones', h.id, 'reservar']"><mat-icon>event_available</mat-icon>Reservar</a>
            }
          }
        </div>
      </div>

      <div class="rx-grid-2">
        <section class="rx-card">
          <div class="rx-card-titulo">
            <mat-icon>photo_library</mat-icon>Fotos ({{ h.fotoIds.length }}/{{ maxFotos }})
            <span class="spacer"></span>
            @if (esAdmin() && h.fotoIds.length < maxFotos) {
              <button mat-stroked-button (click)="input.click()" [disabled]="subiendo()">
                <mat-icon>add_a_photo</mat-icon>{{ subiendo() ? 'Subiendo…' : 'Subir foto' }}
              </button>
              <input #input type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="subir(input)" />
            }
          </div>
          @if (h.fotoIds.length === 0) {
            <div class="sin-foto"><mat-icon>image</mat-icon><p>Sin fotos registradas.</p></div>
          } @else {
            <img class="principal" [src]="url(h.id, fotoActual()!)" [alt]="'Habitación ' + h.numero" />
            <div class="miniaturas">
              @for (f of h.fotoIds; track f) {
                <div class="mini" [class.sel]="f === fotoActual()">
                  <button type="button" (click)="seleccion.set(f)" [attr.aria-label]="'Ver foto ' + ($index + 1)">
                    <img [src]="url(h.id, f)" alt="" loading="lazy" />
                  </button>
                  @if (esAdmin()) {
                    <button type="button" class="quitar" (click)="eliminarFoto(f)" aria-label="Eliminar foto"><mat-icon>close</mat-icon></button>
                  }
                </div>
              }
            </div>
          }
          @if (esAdmin()) { <p class="rx-muted nota">JPG, PNG o WebP de hasta 2 MB.</p> }
        </section>

        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>info</mat-icon>Información</div>
          <div class="rx-datos">
            <div class="rx-dato"><span>Estado</span><strong><span class="estado-badge compacto" [class]="meta(h).cssClass">{{ etiquetaEstado(h) }}</span></strong></div>
            <div class="rx-dato"><span>Tipo</span><strong>{{ tipo(h) }}</strong></div>
            <div class="rx-dato"><span>Piso</span><strong>{{ h.piso ?? '—' }}</strong></div>
            <div class="rx-dato"><span>Capacidad</span><strong>{{ h.capacidad ?? '—' }} personas</strong></div>
            <div class="rx-dato"><span>Tarifa</span><strong>{{ moneda(h.precioNoche) }}</strong></div>
            @if (h.huesped) {
              <div class="rx-dato"><span>Huésped actual</span><strong>{{ h.huesped.nombreCompleto }}</strong></div>
            }
            @if (h.fechaEntrada) {
              <div class="rx-dato"><span>Estancia</span><strong>{{ fecha(h.fechaEntrada) }} → {{ fecha(h.fechaSalida) }}</strong></div>
            }
          </div>
          <p class="texto">{{ h.descripcion }}</p>
          @if (h.caracteristicas.length) {
            <div class="caracteristicas">
              @for (c of h.caracteristicas; track c) { <span class="rx-chip neutro">{{ c }}</span> }
            </div>
          }
        </section>
      </div>

      <section class="rx-card">
        <div class="rx-card-titulo"><mat-icon>history</mat-icon>Historial de reservas ({{ historial().length }})</div>
        <div class="rx-kpis compactos">
          <div class="rx-kpi"><span class="rx-kpi-etiqueta">Noches vendidas</span><span class="rx-kpi-valor">{{ resumen().noches }}</span></div>
          <div class="rx-kpi"><span class="rx-kpi-etiqueta">Ingreso estimado</span><span class="rx-kpi-valor">{{ moneda(resumen().ingreso) }}</span></div>
          <div class="rx-kpi"><span class="rx-kpi-etiqueta">Cancelaciones</span><span class="rx-kpi-valor">{{ resumen().canceladas }}</span></div>
        </div>
        @if (historial().length === 0) {
          <p class="rx-muted">Esta habitación aún no tiene reservas.</p>
        } @else {
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Reserva</th><th>Huésped</th><th>Fechas</th><th>Estado</th><th>Canal</th><th class="derecha">Total</th></tr></thead>
              <tbody>
                @for (r of historial(); track r.id) {
                  <tr>
                    <td data-label="Reserva"><a [routerLink]="['/reservas', r.id]">#{{ r.id }}</a></td>
                    <td data-label="Huésped" class="ancho">{{ r.huesped.nombreCompleto }}</td>
                    <td data-label="Fechas">{{ fecha(r.fechaEntrada) }} → {{ fecha(r.fechaSalida) }} ({{ r.cantidadNoches }} n.)</td>
                    <td data-label="Estado"><span class="rx-chip {{ claseReserva(r.estadoReserva) }}">{{ etiquetaReserva(r.estadoReserva) }}</span></td>
                    <td data-label="Canal">{{ r.canalNombre ?? '—' }}</td>
                    <td data-label="Total" class="derecha rx-num">{{ moneda(r.totalEstimado) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
  styles: `
    @use '../habitacion-estados.shared.scss';
    .estado-badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.8rem; }
    .rx-card-titulo { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .spacer { flex: 1; }
    .principal { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 12px; background: var(--bg-200); }
    .miniaturas { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.6rem; }
    .mini { position: relative; }
    .mini button:first-child { padding: 0; border: 2px solid transparent; border-radius: 10px; overflow: hidden; cursor: pointer; background: none; display: block; }
    .mini.sel button:first-child { border-color: var(--primary-300); }
    .mini img { width: 72px; height: 52px; object-fit: cover; display: block; }
    .quitar { position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; border-radius: 50%; border: none; background: #c62828; color: #fff;
      display: grid; place-items: center; cursor: pointer; padding: 0; }
    .quitar mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .sin-foto { display: grid; place-items: center; aspect-ratio: 16 / 10; border-radius: 12px; background: var(--bg-200); color: var(--text-200); }
    .sin-foto p { margin: 0; }
    .nota { font-size: 0.78rem; margin: 0.6rem 0 0; }
    .texto { margin: 0.75rem 0 0; font-size: 0.9rem; }
    .caracteristicas { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.6rem; }
    .compactos { margin-bottom: 0.75rem; }
  `,
})
export class HabitacionDetalleComponent implements OnInit {
  private readonly service = inject(HabitacionService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly auth = inject(AuthService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly etiquetaEstado = etiquetaEstadoHabitacion;
  readonly etiquetaReserva = etiquetaEstadoReserva;
  readonly claseReserva = claseEstadoReserva;
  readonly maxFotos = MAX_FOTOS;

  readonly cargando = signal(true);
  readonly subiendo = signal(false);
  readonly habitacion = signal<Habitacion | null>(null);
  readonly historial = signal<Reserva[]>([]);
  readonly seleccion = signal<number | null>(null);
  readonly esAdmin = computed(() => this.auth.tieneRol('ADMIN'));
  readonly puedeOperar = computed(() => this.auth.tieneRol('ADMIN', 'RECEPCION'));
  readonly fotoActual = computed(() => {
    const ids = this.habitacion()?.fotoIds ?? [];
    const s = this.seleccion();
    return s && ids.includes(s) ? s : (ids[0] ?? null);
  });
  readonly resumen = computed(() => {
    const validas = this.historial().filter((r) => r.estadoReserva !== 'CANCELADA');
    return {
      noches: validas.reduce((t, r) => t + r.cantidadNoches, 0),
      ingreso: validas.reduce((t, r) => t + Number(r.totalEstimado), 0),
      canceladas: this.historial().length - validas.length,
    };
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.obtener(id).subscribe({
      next: (h) => {
        this.habitacion.set(h);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
    this.service.historial(id).subscribe((r) => this.historial.set(r));
  }

  url(habitacionId: number, fotoId: number): string {
    return this.service.urlFoto(habitacionId, fotoId);
  }

  tipo(h: Habitacion): string {
    return TIPOS_HABITACION.find((t) => t.value === h.tipoHabitacion)?.label ?? h.tipoHabitacion;
  }

  meta(h: Habitacion) {
    return metaEstado(h.estado);
  }

  subir(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (archivo.size > MAX_BYTES) {
      this.snack.open('La imagen supera 2 MB', 'OK', { duration: 3000 });
      return;
    }
    const h = this.habitacion()!;
    this.subiendo.set(true);
    this.service.subirFoto(h.id, archivo).subscribe({
      next: (ids) => {
        this.habitacion.set({ ...h, fotoIds: ids });
        this.seleccion.set(ids[ids.length - 1] ?? null);
        this.subiendo.set(false);
      },
      error: (e) => {
        this.subiendo.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  eliminarFoto(fotoId: number): void {
    const h = this.habitacion()!;
    this.service.eliminarFoto(h.id, fotoId).subscribe({
      next: (ids) => this.habitacion.set({ ...h, fotoIds: ids }),
      error: (e) => this.errorDialog.mostrarDesdeApi(e),
    });
  }
}
