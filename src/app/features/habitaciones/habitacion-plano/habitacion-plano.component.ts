import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { Habitacion, TIPOS_HABITACION } from '../../../core/models/habitacion.model';
import { metaEstado } from '../../../core/utils/habitacion-estado.util';
import { etiquetaEstadoHabitacion } from '../../../core/utils/servicios-habitacion.util';
import { programarAutoRefresh } from '../../../core/utils/auto-refresh.util';
import { porcentaje } from '../../../core/utils/formato.util';

interface Piso {
  piso: number | null;
  habitaciones: Habitacion[];
  ocupadas: number;
}

/** Plano del hotel: habitaciones agrupadas por planta, coloreadas según su estado operativo. */
@Component({
  selector: 'app-habitacion-plano',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="page-header row">
      <div>
        <h1>Plano por piso</h1>
        <p>Vista de las habitaciones por planta. Toca una habitación para ver su detalle.</p>
      </div>
      <a mat-stroked-button routerLink="/habitaciones"><mat-icon>view_module</mat-icon>Vista de tarjetas</a>
    </div>

    <div class="leyenda">
      @for (l of leyenda; track l.texto) {
        <span class="item"><span class="muestra {{ l.clase }}"></span>{{ l.texto }}</span>
      }
    </div>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else {
      @for (p of pisos(); track p.piso) {
        <section class="piso">
          <div class="piso-cabecera">
            <h2>{{ p.piso === null ? 'Sin piso asignado' : 'Piso ' + p.piso }}</h2>
            <span class="rx-muted">{{ p.habitaciones.length }} habitaciones · {{ ocupacion(p) }} ocupación</span>
          </div>
          <div class="pasillo">
            @for (h of p.habitaciones; track h.id) {
              <a class="hab {{ clase(h) }}" [routerLink]="['/habitaciones', h.id]"
                 [matTooltip]="tooltip(h)" [attr.aria-label]="'Habitación ' + h.numero + ', ' + etiqueta(h)">
                <span class="numero">{{ h.numero }}</span>
                <mat-icon>{{ icono(h) }}</mat-icon>
                <span class="tipo">{{ tipo(h) }}</span>
              </a>
            }
          </div>
        </section>
      }
    }
  `,
  styles: `
    @use '../habitacion-estados.shared.scss';
    .leyenda { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin-bottom: 1rem; font-size: 0.83rem; }
    .item { display: inline-flex; align-items: center; gap: 0.35rem; }
    .muestra { width: 14px; height: 14px; border-radius: 4px; border: 1px solid rgba(0, 0, 0, 0.12); }
    .estado-limpieza { background: #e3f2fd; color: #1565c0; }
    .piso { margin-bottom: 1.25rem; padding: 0.9rem 1rem; background: #fff; border: 1px solid var(--bg-300);
      border-radius: var(--roomix-radius-lg); box-shadow: var(--roomix-shadow); }
    .piso-cabecera { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
    .piso-cabecera h2 { margin: 0; font-size: 1.05rem; }
    .pasillo { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 0.55rem;
      padding: 0.6rem; border-radius: 12px; background: repeating-linear-gradient(90deg, #f6f7f8 0 12px, #f1f3f4 12px 24px); }
    .hab { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; padding: 0.55rem 0.3rem; border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.08); text-align: center; transition: transform 0.12s ease; min-height: 80px; justify-content: center; }
    .hab:hover, .hab:focus-visible { transform: translateY(-2px); }
    .numero { font-weight: 700; font-size: 1.05rem; }
    .hab mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .tipo { font-size: 0.7rem; opacity: 0.85; }
  `,
})
export class HabitacionPlanoComponent implements OnInit {
  private readonly service = inject(HabitacionService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly etiqueta = etiquetaEstadoHabitacion;
  readonly cargando = signal(true);
  readonly habitaciones = signal<Habitacion[]>([]);
  readonly leyenda = [
    { clase: 'estado-libre', texto: 'Disponible' },
    { clase: 'estado-reservado', texto: 'Reservada' },
    { clase: 'estado-ocupado', texto: 'Ocupada' },
    { clase: 'estado-limpieza', texto: 'En limpieza' },
    { clase: 'estado-inhabilitado', texto: 'En mantenimiento' },
  ];

  readonly pisos = computed<Piso[]>(() => {
    const mapa = new Map<number | null, Habitacion[]>();
    for (const h of this.habitaciones()) {
      const k = h.piso ?? null;
      mapa.set(k, [...(mapa.get(k) ?? []), h]);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => (a ?? 999) - (b ?? 999))
      .map(([piso, habs]) => ({
        piso,
        habitaciones: habs.sort((x, y) => x.numero.localeCompare(y.numero, 'es', { numeric: true })),
        ocupadas: habs.filter((h) => h.estado === 'OCUPADO').length,
      }));
  });

  ngOnInit(): void {
    this.cargar();
    programarAutoRefresh(this.destroyRef, () => this.cargar());
  }

  cargar(): void {
    this.service.listar().subscribe({
      next: (h) => {
        this.habitaciones.set(h);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  clase(h: Habitacion): string {
    return h.estado === 'INHABILITADO' && h.motivoInhabilitacion === 'POST_CHECKOUT' ? 'estado-limpieza' : metaEstado(h.estado).cssClass;
  }

  icono(h: Habitacion): string {
    if (h.estado !== 'INHABILITADO') return metaEstado(h.estado).icon;
    return h.motivoInhabilitacion === 'POST_CHECKOUT' ? 'cleaning_services' : 'build';
  }

  tipo(h: Habitacion): string {
    return TIPOS_HABITACION.find((t) => t.value === h.tipoHabitacion)?.label ?? h.tipoHabitacion;
  }

  tooltip(h: Habitacion): string {
    const huesped = h.huesped ? ` · ${h.huesped.nombreCompleto}` : '';
    return `${this.etiqueta(h)}${huesped}`;
  }

  ocupacion(p: Piso): string {
    return porcentaje(p.habitaciones.length ? (p.ocupadas / p.habitaciones.length) * 100 : 0, 0);
  }
}
