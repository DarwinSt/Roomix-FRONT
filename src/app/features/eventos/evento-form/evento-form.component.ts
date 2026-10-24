import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventoService } from '../../../core/services/modulos.service';
import { IncidenciaService } from '../../../core/services/incidencia.service';
import { Personal } from '../../../core/models/incidencia.model';
import { Evento, EventoRequest, Salon, TIPOS_ACCESO, TIPOS_EVENTO, TIPOS_RECURSO, TipoRecurso } from '../../../core/models/evento.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { aInputFechaHora, desdeInputFechaHora, moneda } from '../../../core/utils/formato.util';

type RecursoValor = { tipo: TipoRecurso; descripcion: string; cantidad: number; valorUnitario: number };

function crearFilaRecurso(fb: FormBuilder, r?: RecursoValor) {
  return fb.group({
    tipo: [r?.tipo ?? ('EQUIPO_AUDIOVISUAL' as TipoRecurso), Validators.required],
    descripcion: [r?.descripcion ?? '', Validators.required],
    cantidad: [r?.cantidad ?? 1, [Validators.required, Validators.min(1)]],
    valorUnitario: [r?.valorUnitario ?? 0, [Validators.required, Validators.min(0)]],
  });
}

@Component({
  selector: 'app-evento-form',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule],
  template: `
    <div class="page-header row">
      <div>
        <h1>{{ id ? 'Editar evento' : 'Nuevo evento' }}</h1>
        <p>El sistema valida que el salón esté libre en el horario y que la capacidad no supere la del salón.</p>
      </div>
      <a mat-stroked-button [routerLink]="id ? ['/eventos', id] : ['/eventos']"><mat-icon>arrow_back</mat-icon>Volver</a>
    </div>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>celebration</mat-icon>Datos del evento</div>
          <div class="rx-form-grid">
            <mat-form-field appearance="outline" class="rx-full"><mat-label>Nombre del evento</mat-label><input matInput formControlName="nombre" maxlength="150" /></mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="tipo" panelClass="roomix-select-panel">
                @for (t of tipos; track t.value) { <mat-option [value]="t.value">{{ t.label }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Acceso</mat-label>
              <mat-select formControlName="tipoAcceso" panelClass="roomix-select-panel">
                @for (t of accesos; track t.value) { <mat-option [value]="t.value">{{ t.label }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Inicio</mat-label><input matInput type="datetime-local" formControlName="fechaHoraInicio" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Fin</mat-label><input matInput type="datetime-local" formControlName="fechaHoraFin" /></mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Salón</mat-label>
              <mat-select formControlName="salonId" panelClass="roomix-select-panel">
                @for (s of salones(); track s.id) { <mat-option [value]="s.id">{{ s.nombre }} · {{ s.capacidad }} pers. · {{ moneda(s.tarifaHora) }}/h</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Capacidad del evento</mat-label>
              <input matInput type="number" min="1" formControlName="capacidad" />
              @if (salonSel(); as s) { <mat-hint>Máximo {{ s.capacidad }} en {{ s.nombre }}</mat-hint> }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Responsable del hotel</mat-label>
              <mat-select formControlName="responsableId" panelClass="roomix-select-panel">
                <mat-option [value]="null">Sin asignar</mat-option>
                @for (p of personal(); track p.id) { <mat-option [value]="p.id">{{ p.nombre }} · {{ p.rol }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Valor base (alquiler del salón)</mat-label>
              <input matInput type="number" min="0" formControlName="valorBase" />
              <button mat-icon-button matSuffix type="button" (click)="sugerirValor()" aria-label="Calcular por horas" title="Calcular con la tarifa por hora"><mat-icon>calculate</mat-icon></button>
            </mat-form-field>
            <mat-form-field appearance="outline" class="rx-full"><mat-label>Descripción</mat-label><textarea matInput rows="2" formControlName="descripcion"></textarea></mat-form-field>
          </div>
        </section>

        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>badge</mat-icon>Organizador / cliente</div>
          <div class="rx-form-grid">
            <mat-form-field appearance="outline"><mat-label>Nombre o empresa</mat-label><input matInput formControlName="organizadorNombre" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Documento / NIT</mat-label><input matInput formControlName="organizadorDocumento" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Teléfono</mat-label><input matInput formControlName="organizadorTelefono" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Correo</mat-label><input matInput type="email" formControlName="organizadorEmail" /></mat-form-field>
          </div>
        </section>

        <section class="rx-card">
          <div class="rx-card-titulo">
            <mat-icon>inventory</mat-icon>Recursos y logística
            <button mat-stroked-button type="button" class="agregar" (click)="agregarRecurso()"><mat-icon>add</mat-icon>Agregar</button>
          </div>
          @if (recursos.length === 0) {
            <p class="rx-muted">Sin recursos. Agrega equipos audiovisuales, mobiliario, catering, decoración o personal de apoyo.</p>
          }
          <div formArrayName="recursos" class="recursos">
            @for (r of recursos.controls; track $index; let i = $index) {
              <div class="recurso" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <mat-label>Tipo</mat-label>
                  <mat-select formControlName="tipo" panelClass="roomix-select-panel">
                    @for (t of tiposRecurso; track t.value) { <mat-option [value]="t.value">{{ t.label }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="desc"><mat-label>Descripción</mat-label><input matInput formControlName="descripcion" /></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Cantidad</mat-label><input matInput type="number" min="1" formControlName="cantidad" /></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Valor unitario</mat-label><input matInput type="number" min="0" formControlName="valorUnitario" /></mat-form-field>
                <button mat-icon-button type="button" (click)="recursos.removeAt(i)" aria-label="Quitar recurso"><mat-icon>delete</mat-icon></button>
              </div>
            }
          </div>
          <div class="totales">
            <span>Recursos: <strong class="rx-num">{{ moneda(totalRecursos()) }}</strong></span>
            <span>Total del evento: <strong class="rx-num">{{ moneda(totalRecursos() + (+(valores().valorBase ?? 0))) }}</strong></span>
          </div>
        </section>

        <section class="rx-card">
          <mat-form-field appearance="outline" class="notas"><mat-label>Notas internas</mat-label><textarea matInput rows="2" formControlName="notas"></textarea></mat-form-field>
        </section>

        @if (error()) { <p class="error">{{ error() }}</p> }
        <div class="rx-acciones fin">
          <a mat-button [routerLink]="id ? ['/eventos', id] : ['/eventos']">Cancelar</a>
          <button mat-flat-button color="primary" type="submit" [disabled]="guardando()"><mat-icon>save</mat-icon>Guardar evento</button>
        </div>
      </form>
    }
  `,
  styles: `
    .rx-card-titulo { display: flex; align-items: center; }
    .agregar { margin-left: auto; }
    .recursos { display: flex; flex-direction: column; gap: 0.25rem; }
    .recurso { display: grid; grid-template-columns: 200px minmax(0, 1fr) 110px 150px auto; gap: 0.6rem; align-items: start; }
    .totales { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 1.25rem; margin-top: 0.5rem; }
    .notas { width: 100%; }
    .fin { justify-content: flex-end; margin-bottom: 1.5rem; }
    .error { color: #c62828; }
    @media (max-width: 760px) {
      .recurso { grid-template-columns: 1fr 1fr; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--bg-300); }
      .recurso .desc { grid-column: 1 / -1; }
    }
  `,
})
export class EventoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EventoService);
  private readonly incidencias = inject(IncidenciaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly moneda = moneda;
  readonly tipos = TIPOS_EVENTO;
  readonly accesos = TIPOS_ACCESO;
  readonly tiposRecurso = TIPOS_RECURSO;
  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly salones = signal<Salon[]>([]);
  readonly personal = signal<Personal[]>([]);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: [''],
    tipo: ['CORPORATIVO', Validators.required],
    tipoAcceso: ['PRIVADO', Validators.required],
    fechaHoraInicio: ['', Validators.required],
    fechaHoraFin: ['', Validators.required],
    salonId: [null as number | null, Validators.required],
    responsableId: [null as number | null],
    capacidad: [30, [Validators.required, Validators.min(1)]],
    organizadorNombre: ['', Validators.required],
    organizadorDocumento: [''],
    organizadorTelefono: [''],
    organizadorEmail: ['', Validators.email],
    valorBase: [0, [Validators.required, Validators.min(0)]],
    notas: [''],
    recursos: this.fb.array<ReturnType<typeof crearFilaRecurso>>([]),
  });

  readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly salonSel = computed(() => this.salones().find((s) => s.id === this.valores().salonId) ?? null);
  readonly totalRecursos = computed(() =>
    (this.valores().recursos ?? []).reduce((t, r) => t + Number(r?.cantidad ?? 0) * Number(r?.valorUnitario ?? 0), 0),
  );

  get recursos(): FormArray {
    return this.form.controls.recursos as FormArray;
  }

  ngOnInit(): void {
    this.service.salones().subscribe((s) => this.salones.set(s.filter((x) => x.activo)));
    this.incidencias.listarPersonal(true).subscribe((p) => this.personal.set(p));
    // Mientras el valor base no se edite a mano, se calcula con la tarifa por hora del salón
    const c = this.form.controls;
    merge(c.salonId.valueChanges, c.fechaHoraInicio.valueChanges, c.fechaHoraFin.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        queueMicrotask(() => c.valorBase.pristine && this.sugerirValor());
      });
    if (!this.id) {
      this.cargando.set(false);
      return;
    }
    this.service.obtener(this.id).subscribe({
      next: (e) => {
        this.cargar(e);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(extractApiErrorMessage(err));
      },
    });
  }

  private cargar(e: Evento): void {
    this.form.patchValue({
      nombre: e.nombre,
      descripcion: e.descripcion ?? '',
      tipo: e.tipo,
      tipoAcceso: e.tipoAcceso,
      fechaHoraInicio: aInputFechaHora(e.fechaHoraInicio),
      fechaHoraFin: aInputFechaHora(e.fechaHoraFin),
      salonId: e.salonId,
      responsableId: e.responsableId,
      capacidad: e.capacidad,
      organizadorNombre: e.organizadorNombre,
      organizadorDocumento: e.organizadorDocumento ?? '',
      organizadorTelefono: e.organizadorTelefono ?? '',
      organizadorEmail: e.organizadorEmail ?? '',
      valorBase: e.valorBase,
      notas: e.notas ?? '',
    });
    e.recursos.forEach((r) => this.recursos.push(crearFilaRecurso(this.fb, r)));
    // Conserva el valor pactado del evento existente
    this.form.controls.valorBase.markAsDirty();
  }

  agregarRecurso(): void {
    this.recursos.push(crearFilaRecurso(this.fb));
  }

  sugerirValor(): void {
    const v = this.form.getRawValue();
    const s = this.salonSel();
    if (!s || !v.fechaHoraInicio || !v.fechaHoraFin) return;
    const horas = (new Date(v.fechaHoraFin).getTime() - new Date(v.fechaHoraInicio).getTime()) / 3_600_000;
    if (horas > 0) this.form.controls.valorBase.setValue(Math.round(Math.ceil(horas) * Number(s.tarifaHora)));
  }

  guardar(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos obligatorios.');
      return;
    }
    const v = this.form.getRawValue();
    if (v.fechaHoraFin! <= v.fechaHoraInicio!) {
      this.error.set('La hora de fin debe ser posterior al inicio.');
      return;
    }
    const body: EventoRequest = {
      nombre: v.nombre!,
      descripcion: v.descripcion || null,
      tipo: v.tipo as EventoRequest['tipo'],
      tipoAcceso: v.tipoAcceso as EventoRequest['tipoAcceso'],
      fechaHoraInicio: desdeInputFechaHora(v.fechaHoraInicio)!,
      fechaHoraFin: desdeInputFechaHora(v.fechaHoraFin)!,
      salonId: v.salonId!,
      responsableId: v.responsableId,
      capacidad: Number(v.capacidad),
      organizadorNombre: v.organizadorNombre!,
      organizadorDocumento: v.organizadorDocumento || null,
      organizadorTelefono: v.organizadorTelefono || null,
      organizadorEmail: v.organizadorEmail || null,
      valorBase: Number(v.valorBase),
      notas: v.notas || null,
      recursos: (v.recursos ?? []).map((r) => ({
        tipo: r.tipo as TipoRecurso,
        descripcion: r.descripcion!,
        cantidad: Number(r.cantidad),
        valorUnitario: Number(r.valorUnitario),
      })),
    };
    this.guardando.set(true);
    const p = this.id ? this.service.actualizar(this.id, body) : this.service.crear(body);
    p.subscribe({
      next: (e) => {
        this.snack.open('Evento guardado', 'OK', { duration: 2500 });
        this.router.navigate(['/eventos', e.id]);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(extractApiErrorMessage(err));
      },
    });
  }
}
