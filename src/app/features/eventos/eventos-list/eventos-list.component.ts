import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EventoService } from '../../../core/services/modulos.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { AuthService } from '../../../core/services/auth.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { ESTADOS_EVENTO, EstadoEvento, Evento, Salon, TIPOS_ACCESO, etiquetaEstadoEvento } from '../../../core/models/evento.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { fechaCorta, isoFecha, moneda, sumarDias } from '../../../core/utils/formato.util';

export function claseEstadoEvento(e: EstadoEvento): string {
  return { PROGRAMADO: 'info', EN_CURSO: 'alerta', FINALIZADO: 'ok', CANCELADO: 'critico' }[e];
}

/** Crear o editar un salón. */
@Component({
  selector: 'app-salon-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSlideToggleModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>meeting_room</mat-icon></div>
      <div class="header-text"><h2>{{ data ? 'Editar salón' : 'Nuevo salón' }}</h2></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-form-field appearance="outline" class="rx-full"><mat-label>Nombre</mat-label><input matInput formControlName="nombre" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Capacidad (personas)</mat-label><input matInput type="number" min="1" formControlName="capacidad" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Tarifa por hora (COP)</mat-label><input matInput type="number" min="0" formControlName="tarifaHora" /></mat-form-field>
        <mat-form-field appearance="outline" class="rx-full"><mat-label>Descripción</mat-label><textarea matInput rows="2" formControlName="descripcion"></textarea></mat-form-field>
        <mat-slide-toggle formControlName="activo" class="rx-full">Disponible</mat-slide-toggle>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.error { color: #c62828; font-size: 0.85rem; margin: 0.5rem 0 0; }`,
})
export class SalonDialogComponent {
  readonly data = inject<Salon | null>(MAT_DIALOG_DATA);
  private readonly service = inject(EventoService);
  private readonly ref = inject(MatDialogRef<SalonDialogComponent, boolean>);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).group({
    nombre: [this.data?.nombre ?? '', Validators.required],
    capacidad: [this.data?.capacidad ?? 20, [Validators.required, Validators.min(1)]],
    tarifaHora: [this.data?.tarifaHora ?? 0, [Validators.required, Validators.min(0)]],
    descripcion: [this.data?.descripcion ?? ''],
    activo: [this.data?.activo ?? true],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { nombre: v.nombre!, capacidad: Number(v.capacidad), tarifaHora: Number(v.tarifaHora), descripcion: v.descripcion || null, activo: !!v.activo };
    const p = this.data ? this.service.actualizarSalon(this.data.id, body) : this.service.crearSalon(body);
    p.subscribe({ next: () => this.ref.close(true), error: (e) => this.error.set(extractApiErrorMessage(e)) });
  }
}

type Vista = 'proximos' | 'pasados' | 'salones';

@Component({
  selector: 'app-eventos-list',
  imports: [RouterLink, MatButtonModule, MatButtonToggleModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-header row">
      <div>
        <h1>Eventos</h1>
        <p>Planificación de eventos en los salones del hotel: participantes, recursos, estado y facturación.</p>
      </div>
      @if (puedeGestionar()) {
        <div class="rx-acciones">
          @if (vista() === 'salones') {
            <button mat-flat-button color="primary" (click)="editarSalon(null)"><mat-icon>add</mat-icon>Nuevo salón</button>
          } @else {
            <a mat-flat-button color="primary" routerLink="/eventos/nuevo"><mat-icon>add</mat-icon>Nuevo evento</a>
          }
        </div>
      }
    </div>

    <div class="rx-toolbar">
      <mat-button-toggle-group [value]="vista()" (change)="cambiarVista($event.value)">
        <mat-button-toggle value="proximos"><mat-icon>upcoming</mat-icon> Próximos</mat-button-toggle>
        <mat-button-toggle value="pasados"><mat-icon>history</mat-icon> Realizados</mat-button-toggle>
        <mat-button-toggle value="salones"><mat-icon>meeting_room</mat-icon> Salones</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (vista() === 'salones') {
      <div class="rx-tabla-wrap">
        <table class="rx-tabla">
          <thead><tr><th>Salón</th><th>Capacidad</th><th class="derecha">Tarifa por hora</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (s of salones(); track s.id) {
              <tr>
                <td data-label="Salón" class="ancho"><strong>{{ s.nombre }}</strong><span class="sub">{{ s.descripcion }}</span></td>
                <td data-label="Capacidad">{{ s.capacidad }} personas</td>
                <td data-label="Tarifa" class="derecha rx-num">{{ moneda(s.tarifaHora) }}</td>
                <td data-label="Estado"><span class="rx-chip" [class.ok]="s.activo" [class.neutro]="!s.activo">{{ s.activo ? 'Disponible' : 'Inactivo' }}</span></td>
                <td class="acciones derecha">
                  @if (puedeGestionar()) { <button mat-icon-button (click)="editarSalon(s)" aria-label="Editar salón"><mat-icon>edit</mat-icon></button> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (eventosVista().length === 0) {
      <div class="rx-vacio"><mat-icon>celebration</mat-icon><p>No hay eventos {{ vista() === 'proximos' ? 'programados' : 'en los últimos 90 días' }}.</p></div>
    } @else {
      <div class="eventos">
        @for (e of eventosVista(); track e.id) {
          <a class="evento" [routerLink]="['/eventos', e.id]">
            <div class="fecha">
              <span class="dia">{{ dia(e.fechaHoraInicio) }}</span>
              <span class="mes">{{ mes(e.fechaHoraInicio) }}</span>
            </div>
            <div class="info">
              <div class="titulo"><strong>{{ e.nombre }}</strong><span class="rx-chip {{ clase(e.estado) }}">{{ etiqueta(e.estado) }}</span></div>
              <p><mat-icon>schedule</mat-icon>{{ hora(e.fechaHoraInicio) }} – {{ hora(e.fechaHoraFin) }} · <mat-icon>meeting_room</mat-icon>{{ e.salonNombre }}</p>
              <p><mat-icon>{{ icoAcceso(e.tipoAcceso) }}</mat-icon>{{ e.tipoAccesoNombre }} · <mat-icon>groups</mat-icon>{{ e.inscritos }}/{{ e.capacidad }} inscritos · {{ e.organizadorNombre }}</p>
            </div>
            <div class="valor rx-num">{{ moneda(e.valorTotal) }}</div>
          </a>
        }
      </div>
    }
  `,
  styles: `
    .eventos { display: flex; flex-direction: column; gap: 0.65rem; }
    .evento { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 0.9rem; align-items: center;
      padding: 0.85rem 1rem; background: #fff; border: 1px solid var(--bg-300); border-radius: var(--roomix-radius-lg);
      box-shadow: var(--roomix-shadow); color: inherit; transition: transform 0.15s ease; }
    .evento:hover { transform: translateY(-1px); }
    .fecha { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 54px; height: 58px;
      border-radius: 12px; background: rgba(0, 61, 77, 0.08); color: #003d4d; }
    .dia { font-size: 1.35rem; font-weight: 700; line-height: 1; }
    .mes { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .info { min-width: 0; }
    .titulo { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .info p { display: flex; flex-wrap: wrap; align-items: center; gap: 0.2rem; margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--text-200); }
    .info mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .valor { font-weight: 700; color: var(--text-strong); }
    @media (max-width: 600px) { .evento { grid-template-columns: auto minmax(0, 1fr); } .valor { grid-column: 2; } }
  `,
})
export class EventosListComponent implements OnInit {
  private readonly service = inject(EventoService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  readonly router = inject(Router);

  readonly moneda = moneda;
  readonly etiqueta = etiquetaEstadoEvento;
  readonly clase = claseEstadoEvento;
  readonly estados = ESTADOS_EVENTO;
  readonly vista = signal<Vista>('proximos');
  readonly cargando = signal(true);
  readonly eventos = signal<Evento[]>([]);
  readonly salones = signal<Salon[]>([]);
  readonly puedeGestionar = computed(() => this.auth.tieneRol('ADMIN', 'EVENTOS'));

  readonly eventosVista = computed(() => {
    const ahora = new Date();
    const lista = this.eventos();
    return this.vista() === 'proximos'
      ? lista.filter((e) => new Date(e.fechaHoraFin) >= ahora && e.estado !== 'CANCELADO' && e.estado !== 'FINALIZADO')
      : lista.filter((e) => new Date(e.fechaHoraFin) < ahora || e.estado === 'FINALIZADO' || e.estado === 'CANCELADO').reverse();
  });

  ngOnInit(): void {
    this.cargar();
  }

  cambiarVista(v: Vista): void {
    this.vista.set(v);
    if (v === 'salones') this.cargarSalones();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar({ desde: isoFecha(sumarDias(new Date(), -90)), hasta: isoFecha(sumarDias(new Date(), 180)) }).subscribe({
      next: (e) => {
        this.eventos.set(e);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }

  cargarSalones(): void {
    this.service.salones().subscribe((s) => this.salones.set(s));
  }

  editarSalon(s: Salon | null): void {
    this.dialog
      .open(SalonDialogComponent, { ...roomixDialogConfig({ width: '520px' }), data: s })
      .afterClosed()
      .subscribe((ok) => ok && this.cargarSalones());
  }

  dia(v: string): string {
    return fechaCorta(v).slice(0, 2);
  }

  mes(v: string): string {
    return new Date(v).toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
  }

  hora(v: string): string {
    return v.slice(11, 16);
  }

  icoAcceso(a: string): string {
    return TIPOS_ACCESO.find((t) => t.value === a)?.icon ?? 'public';
  }
}
