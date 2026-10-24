import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { forkJoin } from 'rxjs';
import { ServicioHotelService } from '../../core/services/modulos.service';
import { ReservaService } from '../../core/services/reserva.service';
import { IncidenciaService } from '../../core/services/incidencia.service';
import {
  CATEGORIAS_SERVICIO,
  CategoriaServicio,
  ServicioCatalogo,
  SolicitudServicio,
} from '../../core/models/servicio.model';
import { Reserva } from '../../core/models/reserva.model';
import { Personal } from '../../core/models/incidencia.model';
import { extractApiErrorMessage } from '../../core/utils/api-error.util';
import { aInputFechaHora, desdeInputFechaHora, moneda } from '../../core/utils/formato.util';

/** Nueva solicitud de servicio para una reserva activa (se carga a la cuenta del huésped). */
@Component({
  selector: 'app-solicitud-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>room_service</mat-icon></div>
      <div class="header-text"><h2>Nueva solicitud de servicio</h2></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Huésped / habitación</mat-label>
          <mat-select formControlName="reservaId" panelClass="roomix-select-panel">
            @for (r of reservas(); track r.id) {
              <mat-option [value]="r.id">Hab. {{ r.habitacionNumero }} · {{ r.huesped.nombreCompleto }} ({{ r.estadoReserva === 'EN_CURSO' ? 'en casa' : 'llega ' + r.fechaEntrada }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Servicio</mat-label>
          <mat-select formControlName="servicioId" panelClass="roomix-select-panel">
            @for (s of catalogo(); track s.id) {
              <mat-option [value]="s.id">{{ s.nombre }} — {{ moneda(s.precio) }} {{ s.unidad }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cantidad</mat-label>
          <input matInput type="number" min="1" max="99" formControlName="cantidad" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Programado para</mat-label>
          <input matInput type="datetime-local" formControlName="fechaHoraProgramada" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Responsable</mat-label>
          <mat-select formControlName="responsableId" panelClass="roomix-select-panel">
            <mat-option [value]="null">Sin asignar</mat-option>
            @for (p of personal(); track p.id) { <mat-option [value]="p.id">{{ p.nombre }} · {{ p.rol }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Notas</mat-label>
          <textarea matInput rows="2" formControlName="notas" maxlength="400"></textarea>
        </mat-form-field>
      </form>
      @if (total() > 0) { <p class="total">Se cargarán <strong>{{ moneda(total()) }}</strong> a la cuenta del huésped.</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Registrar</button>
    </mat-dialog-actions>
  `,
  styles: `.total { margin: 0; } .error { color: #c62828; font-size: 0.85rem; margin: 0.5rem 0 0; }`,
})
export class SolicitudDialogComponent implements OnInit {
  private readonly servicios = inject(ServicioHotelService);
  private readonly reservaService = inject(ReservaService);
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly ref = inject(MatDialogRef<SolicitudDialogComponent, boolean>);
  private readonly fb = inject(FormBuilder);
  private readonly reservaInicial = inject<{ reservaId?: number } | null>(MAT_DIALOG_DATA)?.reservaId ?? null;

  readonly moneda = moneda;
  readonly reservas = signal<Reserva[]>([]);
  readonly catalogo = signal<ServicioCatalogo[]>([]);
  readonly personal = signal<Personal[]>([]);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.group({
    reservaId: [this.reservaInicial, Validators.required],
    servicioId: [null as number | null, Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    fechaHoraProgramada: [''],
    responsableId: [null as number | null],
    notas: [''],
  });
  private readonly seleccion = signal<{ servicioId: number | null; cantidad: number | null }>({ servicioId: null, cantidad: 1 });
  readonly total = computed(() => {
    const s = this.catalogo().find((c) => c.id === this.seleccion().servicioId);
    return s ? Number(s.precio) * Number(this.seleccion().cantidad ?? 0) : 0;
  });

  ngOnInit(): void {
    forkJoin({
      enCurso: this.reservaService.listar({ estado: 'EN_CURSO' }),
      confirmadas: this.reservaService.listar({ estado: 'CONFIRMADA' }),
      catalogo: this.servicios.catalogo(true),
      personal: this.incidenciaService.listarPersonal(true),
    }).subscribe(({ enCurso, confirmadas, catalogo, personal }) => {
      this.reservas.set([...enCurso, ...confirmadas].sort((a, b) => a.habitacionNumero.localeCompare(b.habitacionNumero)));
      this.catalogo.set(catalogo);
      this.personal.set(personal);
    });
    this.form.valueChanges.subscribe((v) => this.seleccion.set({ servicioId: v.servicioId ?? null, cantidad: v.cantidad ?? 0 }));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Seleccione huésped, servicio y cantidad.');
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.servicios
      .crearSolicitud({
        reservaId: v.reservaId!,
        servicioId: v.servicioId!,
        cantidad: Number(v.cantidad),
        fechaHoraProgramada: desdeInputFechaHora(v.fechaHoraProgramada),
        responsableId: v.responsableId,
        notas: v.notas || null,
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: (e) => {
          this.guardando.set(false);
          this.error.set(extractApiErrorMessage(e));
        },
      });
  }
}

/** Asignar responsable y programar una solicitud. */
@Component({
  selector: 'app-asignar-solicitud-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>assignment_ind</mat-icon></div>
      <div class="header-text"><h2>{{ data.servicioNombre }} · Hab. {{ data.habitacionNumero }}</h2></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Responsable</mat-label>
          <mat-select formControlName="responsableId" panelClass="roomix-select-panel">
            <mat-option [value]="null">Sin asignar</mat-option>
            @for (p of personal(); track p.id) { <mat-option [value]="p.id">{{ p.nombre }} · {{ p.rol }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Programado para</mat-label>
          <input matInput type="datetime-local" formControlName="fechaHoraProgramada" />
        </mat-form-field>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.error { color: #c62828; font-size: 0.85rem; margin: 0; }`,
})
export class AsignarSolicitudDialogComponent implements OnInit {
  readonly data = inject<SolicitudServicio>(MAT_DIALOG_DATA);
  private readonly servicios = inject(ServicioHotelService);
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly ref = inject(MatDialogRef<AsignarSolicitudDialogComponent, boolean>);
  private readonly fb = inject(FormBuilder);
  readonly personal = signal<Personal[]>([]);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.group({
    responsableId: [this.data.responsableId],
    fechaHoraProgramada: [aInputFechaHora(this.data.fechaHoraProgramada)],
  });

  ngOnInit(): void {
    this.incidenciaService.listarPersonal(true).subscribe((p) => this.personal.set(p));
  }

  guardar(): void {
    const v = this.form.getRawValue();
    this.servicios.asignar(this.data.id, v.responsableId ?? null, desdeInputFechaHora(v.fechaHoraProgramada)).subscribe({
      next: () => this.ref.close(true),
      error: (e) => this.error.set(extractApiErrorMessage(e)),
    });
  }
}

/** Crear o editar un servicio del catálogo. */
@Component({
  selector: 'app-catalogo-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>menu_book</mat-icon></div>
      <div class="header-text"><h2>{{ data ? 'Editar servicio' : 'Nuevo servicio' }}</h2></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" maxlength="120" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="categoria" panelClass="roomix-select-panel">
            @for (c of categorias; track c.value) { <mat-option [value]="c.value">{{ c.label }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Precio (COP)</mat-label>
          <input matInput type="number" min="0" formControlName="precio" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Unidad de cobro</mat-label>
          <input matInput formControlName="unidad" placeholder="por persona, por prenda..." />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Duración (minutos)</mat-label>
          <input matInput type="number" min="1" formControlName="duracionMinutos" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Descripción</mat-label>
          <textarea matInput rows="2" formControlName="descripcion" maxlength="400"></textarea>
        </mat-form-field>
        <mat-slide-toggle formControlName="activo" class="rx-full">Disponible para solicitar</mat-slide-toggle>
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
export class CatalogoDialogComponent {
  readonly data = inject<ServicioCatalogo | null>(MAT_DIALOG_DATA);
  private readonly servicios = inject(ServicioHotelService);
  private readonly ref = inject(MatDialogRef<CatalogoDialogComponent, boolean>);
  private readonly fb = inject(FormBuilder);
  readonly categorias = CATEGORIAS_SERVICIO;
  readonly error = signal<string | null>(null);
  readonly form = this.fb.group({
    nombre: [this.data?.nombre ?? '', Validators.required],
    categoria: [(this.data?.categoria ?? 'ALIMENTOS_BEBIDAS') as CategoriaServicio, Validators.required],
    precio: [this.data?.precio ?? null as number | null, [Validators.required, Validators.min(0)]],
    unidad: [this.data?.unidad ?? 'por servicio', Validators.required],
    duracionMinutos: [this.data?.duracionMinutos ?? null as number | null],
    descripcion: [this.data?.descripcion ?? ''],
    activo: [this.data?.activo ?? true],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete nombre, categoría, precio y unidad.');
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      nombre: v.nombre!.trim(), categoria: v.categoria!, precio: Number(v.precio), unidad: v.unidad!.trim(),
      duracionMinutos: v.duracionMinutos ? Number(v.duracionMinutos) : null, descripcion: v.descripcion || null, activo: !!v.activo,
    };
    const peticion = this.data ? this.servicios.actualizarServicio(this.data.id, body) : this.servicios.crearServicio(body);
    peticion.subscribe({ next: () => this.ref.close(true), error: (e) => this.error.set(extractApiErrorMessage(e)) });
  }
}
