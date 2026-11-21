import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Checklist, ChecklistService, TipoChecklist } from '../../../core/services/checklist.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { ConfiguracionService } from '../../../core/services/configuracion.service';

const ICONO_GRUPO: Record<string, string> = {
  Limpieza: 'cleaning_services', Mantenimiento: 'build', 'Servicio al cuarto': 'room_service', 'Otro servicio': 'checklist',
};

/**
 * El administrador define qué acciones de aseo y mantenimiento se hacen en cada tipo de servicio: el personal las
 * marca una a una en el checklist. Los cambios aplican a los servicios que se creen desde ese momento.
 */
@Component({
  selector: 'app-checklists',
  imports: [FormsModule, CdkDropList, CdkDrag, CdkDragHandle, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="36" /></div>
    } @else {
      <div class="checklists">
        <nav class="tipos rx-card" aria-label="Tipos de servicio">
          @for (g of grupos(); track g.nombre) {
            <p class="grupo"><mat-icon>{{ icono(g.nombre) }}</mat-icon>{{ g.nombre }}</p>
            @for (c of g.items; track c.tipo) {
              <button type="button" class="tipo" [class.activo]="seleccion() === c.tipo" (click)="seleccionar(c.tipo)">
                <span>{{ c.nombre }}</span>
                <span class="meta">{{ c.tareas.length }} acciones{{ c.personalizada ? ' · propias' : '' }}</span>
              </button>
            }
          }
        </nav>

        @if (actual(); as c) {
          <section class="rx-card editor">
            <div class="cabecera">
              <div>
                <h3>{{ c.grupo }} · {{ c.nombre }}</h3>
                <p class="rx-muted">{{ c.descripcion }}</p>
              </div>
              @if (c.personalizada) { <span class="rx-chip info">Personalizado</span> } @else { <span class="rx-chip neutro">Predeterminado</span> }
            </div>

            <p class="rx-etiqueta">Acciones, en el orden en que se hacen</p>
            <ol class="tareas" cdkDropList (cdkDropListDropped)="mover($event)">
              @for (t of tareas(); track $index; let i = $index) {
                <li cdkDrag>
                  <span class="agarre" cdkDragHandle matTooltip="Arrastre para ordenar"><mat-icon>drag_indicator</mat-icon></span>
                  <span class="numero">{{ i + 1 }}</span>
                  <input [ngModel]="t" (ngModelChange)="editar(i, $event)" maxlength="150" [attr.aria-label]="'Acción ' + (i + 1)" />
                  <button mat-icon-button type="button" (click)="quitar(i)" [disabled]="tareas().length === 1" aria-label="Quitar acción"><mat-icon>close</mat-icon></button>
                </li>
              }
            </ol>
            <form class="nueva" (ngSubmit)="agregar()">
              <input name="nueva" [(ngModel)]="nueva" maxlength="150" placeholder="Nueva acción, p. ej. «Reponer amenities del baño»" [disabled]="tareas().length >= 20" />
              <button mat-stroked-button type="submit" [disabled]="!nueva.trim() || tareas().length >= 20"><mat-icon>add</mat-icon>Agregar</button>
            </form>
            @if (error()) { <p class="rx-error-dialogo"><mat-icon>error_outline</mat-icon>{{ error() }}</p> }

            <div class="acciones">
              @if (c.personalizada) {
                <button mat-button type="button" (click)="restaurar()" [disabled]="guardando()"><mat-icon>restart_alt</mat-icon>Usar las de Roomix</button>
              }
              <span class="espacio"></span>
              @if (cambios()) { <button mat-button type="button" (click)="seleccionar(c.tipo)">Descartar</button> }
              <button mat-flat-button color="primary" type="button" (click)="guardar()" [disabled]="guardando() || !cambios()">
                <mat-icon>check</mat-icon>Guardar acciones
              </button>
            </div>
            <p class="nota"><mat-icon>info</mat-icon>Aplica a los servicios que se creen desde ahora; los que están en curso conservan su checklist.</p>
          </section>
        }
      </div>
    }
  `,
  styles: `
    .checklists { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 1rem; align-items: start; }
    .tipos { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.75rem !important; }
    .grupo { display: flex; align-items: center; gap: 0.35rem; margin: 0.6rem 0.4rem 0.25rem; font-size: 0.75rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-200); }
    .grupo:first-child { margin-top: 0.1rem; }
    .grupo mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: var(--primary-300); }
    .tipo { display: flex; flex-direction: column; align-items: flex-start; gap: 0.05rem; padding: 0.5rem 0.65rem; border: none; border-radius: 10px;
      background: transparent; font: inherit; font-size: 0.88rem; text-align: left; color: var(--text-100); cursor: pointer; }
    .tipo:hover { background: rgba(var(--primary-100-rgb), 0.25); }
    .tipo.activo { background: rgba(var(--primary-100-rgb), 0.5); color: var(--primary-400); font-weight: 600; }
    .meta { font-size: 0.72rem; color: var(--text-200); font-weight: 400; }
    .cabecera { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
    .cabecera h3 { margin: 0; font-size: 1.05rem; color: var(--text-strong); }
    .cabecera p { margin: 0.2rem 0 0; font-size: 0.85rem; }
    .tareas { list-style: none; margin: 0 0 0.6rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .tareas li { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.3rem 0.3rem 0.4rem; border: 1px solid var(--bg-200);
      border-radius: 12px; background: #fff; }
    .agarre { display: grid; place-items: center; color: var(--text-200); cursor: grab; }
    .numero { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; font-size: 0.75rem; font-weight: 700;
      background: rgba(var(--primary-100-rgb), 0.5); color: var(--primary-400); }
    .tareas input, .nueva input { flex: 1; min-width: 0; border: none; background: transparent; font: inherit; font-size: 0.9rem; color: var(--text-100);
      padding: 0.4rem 0.2rem; outline: none; }
    .tareas input:focus { background: rgba(var(--primary-100-rgb), 0.15); border-radius: 6px; }
    .nueva { display: flex; gap: 0.5rem; align-items: center; padding: 0.3rem 0.3rem 0.3rem 0.75rem; border: 1.5px dashed var(--bg-300); border-radius: 12px; }
    .acciones { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
    .espacio { flex: 1; }
    .nota { display: flex; gap: 0.4rem; align-items: center; font-size: 0.8rem; color: var(--text-200); margin: 0.75rem 0 0; }
    .nota mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; }
    .cdk-drag-preview { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); border-radius: 12px; background: #fff; display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem; }
    .cdk-drag-placeholder { opacity: 0.3; }
    @media (max-width: 800px) { .checklists { grid-template-columns: 1fr; } }
  `,
})
export class ChecklistsComponent implements OnInit {
  private readonly service = inject(ChecklistService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly snack = inject(MatSnackBar);
  private readonly configuracion = inject(ConfiguracionService);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly lista = signal<Checklist[]>([]);
  readonly seleccion = signal<TipoChecklist>('LIMPIEZA_POST_CHECKOUT');
  readonly tareas = signal<string[]>([]);
  nueva = '';

  readonly actual = computed(() => this.lista().find((c) => c.tipo === this.seleccion()) ?? null);
  readonly grupos = computed(() => {
    const mapa = new Map<string, Checklist[]>();
    for (const c of this.lista()) mapa.set(c.grupo, [...(mapa.get(c.grupo) ?? []), c]);
    return [...mapa].map(([nombre, items]) => ({ nombre, items }));
  });
  readonly cambios = computed(() => {
    const c = this.actual();
    return !!c && JSON.stringify(this.limpias()) !== JSON.stringify(c.tareas);
  });

  ngOnInit(): void {
    this.service.listar().subscribe({
      next: (l) => {
        // Sin el módulo de servicios el hotel no tiene servicio al cuarto
        this.lista.set(l.filter((c) => c.tipo !== 'SERVICIO_CUARTO' || this.configuracion.modulo('SERVICIOS')));
        this.cargando.set(false);
        this.seleccionar(this.seleccion());
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  icono(grupo: string): string {
    return ICONO_GRUPO[grupo] ?? 'checklist';
  }

  seleccionar(tipo: TipoChecklist): void {
    this.seleccion.set(tipo);
    this.tareas.set([...(this.actual()?.tareas ?? [])]);
    this.error.set(null);
    this.nueva = '';
  }

  editar(i: number, texto: string): void {
    this.tareas.update((t) => t.map((x, j) => (j === i ? texto : x)));
  }

  quitar(i: number): void {
    this.tareas.update((t) => t.filter((_, j) => j !== i));
  }

  mover(e: CdkDragDrop<string[]>): void {
    const t = [...this.tareas()];
    moveItemInArray(t, e.previousIndex, e.currentIndex);
    this.tareas.set(t);
  }

  agregar(): void {
    const texto = this.nueva.trim();
    if (!texto) return;
    if (this.limpias().some((t) => t.toLowerCase() === texto.toLowerCase())) {
      this.error.set(`«${texto}» ya está en el checklist.`);
      return;
    }
    this.tareas.update((t) => [...t, texto]);
    this.nueva = '';
    this.error.set(null);
  }

  guardar(): void {
    const tareas = this.limpias();
    if (tareas.length === 0) {
      this.error.set('El checklist debe tener al menos una acción.');
      return;
    }
    this.guardando.set(true);
    this.service.guardar(this.seleccion(), tareas).subscribe({
      next: (c) => this.actualizar(c, 'Acciones guardadas'),
      error: (e) => {
        this.guardando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  restaurar(): void {
    this.guardando.set(true);
    this.service.restaurar(this.seleccion()).subscribe({
      next: (c) => this.actualizar(c, 'Se restauraron las acciones de Roomix'),
      error: (e) => {
        this.guardando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  private actualizar(c: Checklist, mensaje: string): void {
    this.guardando.set(false);
    this.lista.update((l) => l.map((x) => (x.tipo === c.tipo ? c : x)));
    this.seleccionar(c.tipo);
    this.snack.open(mensaje, 'Cerrar', { duration: 3000 });
  }

  /** Tareas sin espacios sobrantes ni vacías. */
  private limpias(): string[] {
    return this.tareas().map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean);
  }
}
