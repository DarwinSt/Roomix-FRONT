import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PromocionService } from '../../../core/services/reserva.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { CANALES_RESERVA, CanalReserva, Promocion, PromocionRequest, TipoDescuento } from '../../../core/models/reserva.model';
import { TIPOS_HABITACION, TipoHabitacion } from '../../../core/models/habitacion.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { fechaCorta, moneda } from '../../../core/utils/formato.util';

/** Crear o editar una promoción: condiciones (todas deben cumplirse) y descuento. */
@Component({
  selector: 'app-promocion-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>sell</mat-icon></div>
      <div class="header-text"><h2>{{ data ? 'Editar promoción' : 'Nueva promoción' }}</h2><p>La promoción aplica cuando la reserva cumple todas las condiciones.</p></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" maxlength="100" />
          <mat-hint>Lo verá recepción al reservar, por ejemplo «Estadía larga»</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Descripción (opcional)</mat-label>
          <input matInput formControlName="descripcion" maxlength="300" />
        </mat-form-field>

        <p class="rx-full seccion">Descuento</p>
        <mat-form-field appearance="outline">
          <mat-label>Tipo de descuento</mat-label>
          <mat-select formControlName="tipoDescuento" panelClass="roomix-select-panel">
            <mat-option value="VALOR_FIJO">Valor fijo (pesos)</mat-option>
            <mat-option value="PORCENTAJE">Porcentaje del alojamiento</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ form.controls.tipoDescuento.value === 'PORCENTAJE' ? 'Porcentaje' : 'Valor' }}</mat-label>
          @if (form.controls.tipoDescuento.value === 'VALOR_FIJO') { <span matTextPrefix>$&nbsp;</span> }
          <input matInput type="number" min="1" formControlName="valor" />
          @if (form.controls.tipoDescuento.value === 'PORCENTAJE') { <span matTextSuffix>&nbsp;%</span> }
        </mat-form-field>

        <p class="rx-full seccion">Condiciones (deje en blanco las que no apliquen)</p>
        <mat-form-field appearance="outline">
          <mat-label>Mínimo de noches</mat-label>
          <input matInput type="number" min="1" formControlName="minimoNoches" />
          <mat-hint>Ej.: 6 para «más de 5 noches»</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Tipo de habitación</mat-label>
          <mat-select formControlName="tipoHabitacion" panelClass="roomix-select-panel">
            <mat-option [value]="null">Cualquiera</mat-option>
            @for (t of tipos; track t.value) { <mat-option [value]="t.value">{{ t.label }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Canal de la reserva</mat-label>
          <mat-select formControlName="canal" panelClass="roomix-select-panel">
            <mat-option [value]="null">Cualquiera</mat-option>
            @for (c of canales; track c.value) { <mat-option [value]="c.value">{{ c.label }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <span></span>
        <mat-form-field appearance="outline">
          <mat-label>Llegadas desde</mat-label>
          <input matInput type="date" formControlName="vigenteDesde" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Llegadas hasta</mat-label>
          <input matInput type="date" formControlName="vigenteHasta" />
        </mat-form-field>
        <mat-slide-toggle formControlName="activa" class="rx-full">Promoción activa</mat-slide-toggle>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.error { color: #c62828; font-size: 0.85rem; } .seccion { margin: 0.5rem 0 0; font-weight: 600; font-size: 0.85rem; color: #5b6660; }`,
})
export class PromocionDialogComponent {
  readonly data = inject<Promocion | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<PromocionDialogComponent, boolean>);
  private readonly service = inject(PromocionService);
  readonly tipos = TIPOS_HABITACION;
  readonly canales = CANALES_RESERVA;
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).group({
    nombre: [this.data?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
    descripcion: [this.data?.descripcion ?? ''],
    tipoDescuento: [(this.data?.tipoDescuento ?? 'VALOR_FIJO') as TipoDescuento, Validators.required],
    valor: [this.data?.valor ?? (null as number | null), [Validators.required, Validators.min(1)]],
    minimoNoches: [this.data?.minimoNoches ?? (null as number | null), Validators.min(1)],
    tipoHabitacion: [(this.data?.tipoHabitacion ?? null) as TipoHabitacion | null],
    canal: [(this.data?.canal ?? null) as CanalReserva | null],
    vigenteDesde: [this.data?.vigenteDesde ?? ''],
    vigenteHasta: [this.data?.vigenteHasta ?? ''],
    activa: [this.data?.activa ?? true],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise los campos marcados: el nombre y el valor del descuento son obligatorios.');
      return;
    }
    const v = this.form.getRawValue();
    if (v.tipoDescuento === 'PORCENTAJE' && Number(v.valor) > 100) {
      this.error.set('El porcentaje no puede superar 100.');
      return;
    }
    const body: PromocionRequest = {
      nombre: v.nombre!.trim(),
      descripcion: v.descripcion?.trim() || null,
      tipoDescuento: v.tipoDescuento!,
      valor: Number(v.valor),
      minimoNoches: v.minimoNoches ? Number(v.minimoNoches) : null,
      tipoHabitacion: v.tipoHabitacion,
      canal: v.canal,
      vigenteDesde: v.vigenteDesde || null,
      vigenteHasta: v.vigenteHasta || null,
      activa: !!v.activa,
    };
    this.guardando.set(true);
    (this.data ? this.service.actualizar(this.data.id, body) : this.service.crear(body)).subscribe({
      next: () => this.ref.close(true),
      error: (e) => {
        this.guardando.set(false);
        this.error.set(extractApiErrorMessage(e));
      },
    });
  }
}

/** Administración: promociones y políticas de reserva (abono mínimo y penalidad por cancelación). */
@Component({
  selector: 'app-promociones',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSlideToggleModule, MatTooltipModule],
  template: `
    <div class="page-header row">
      <div>
        <h1>Promociones y políticas de reserva</h1>
        <p>Descuentos que recepción puede escoger al reservar, abono mínimo para confirmar y penalidad por cancelación.</p>
      </div>
      <button mat-flat-button color="primary" (click)="abrir(null)"><mat-icon>add</mat-icon>Nueva promoción</button>
    </div>

    <section class="rx-card">
      <div class="rx-card-titulo"><mat-icon>policy</mat-icon>Políticas de reserva</div>
      <form [formGroup]="politica" class="politica">
        <mat-form-field appearance="outline">
          <mat-label>Abono mínimo para reservar</mat-label>
          <input matInput type="number" min="0" max="100" formControlName="abonoMinimoPct" />
          <span matTextSuffix>&nbsp;%</span>
          <mat-hint>Porcentaje del total con IVA. 0 = sin abono obligatorio</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Penalidad por cancelación</mat-label>
          <input matInput type="number" min="0" max="100" formControlName="penalidadCancelacionPct" />
          <span matTextSuffix>&nbsp;%</span>
          <mat-hint>Porcentaje de lo abonado que se retiene; el resto se devuelve</mat-hint>
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="guardarPolitica()" [disabled]="politica.invalid || guardandoPolitica()">Guardar políticas</button>
      </form>
      @if (ejemploPolitica(); as ej) { <p class="rx-muted ejemplo">{{ ej }}</p> }
    </section>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (promociones().length === 0) {
      <div class="rx-vacio"><mat-icon>sell</mat-icon><p>Aún no hay promociones. Cree la primera con «Nueva promoción».</p></div>
    } @else {
      <div class="rx-tabla-wrap">
        <table class="rx-tabla">
          <thead><tr><th>Promoción</th><th>Condiciones</th><th class="derecha">Descuento</th><th>Actualizada</th><th>Activa</th><th></th></tr></thead>
          <tbody>
            @for (p of promociones(); track p.id) {
              <tr [class.inactiva]="!p.activa">
                <td data-label="Promoción" class="ancho"><strong>{{ p.nombre }}</strong>@if (p.descripcion) { <span class="sub">{{ p.descripcion }}</span> }</td>
                <td data-label="Condiciones">{{ p.condiciones }}</td>
                <td data-label="Descuento" class="derecha rx-num">{{ p.tipoDescuento === 'PORCENTAJE' ? p.valor + ' %' : moneda(p.valor) }}</td>
                <td data-label="Actualizada" class="rx-num">{{ fecha(p.fechaHoraUltimaActualizacion, true) }}</td>
                <td data-label="Activa"><mat-slide-toggle [checked]="p.activa" (change)="activar(p, $event.checked)" [attr.aria-label]="'Activar ' + p.nombre" /></td>
                <td><button mat-icon-button (click)="abrir(p)" matTooltip="Editar" aria-label="Editar promoción"><mat-icon>edit</mat-icon></button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .politica { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; align-items: flex-start; }
    .politica mat-form-field { flex: 1 1 240px; }
    .politica button { margin-top: 0.35rem; }
    .ejemplo { margin: 0.75rem 0 0; font-size: 0.85rem; }
    .sub { display: block; color: #5b6660; font-size: 0.8rem; }
    tr.inactiva td { opacity: 0.55; }
  `,
})
export class PromocionesComponent implements OnInit {
  private readonly service = inject(PromocionService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly cargando = signal(true);
  readonly guardandoPolitica = signal(false);
  readonly promociones = signal<Promocion[]>([]);
  readonly ejemploPolitica = signal<string | null>(null);
  readonly politica = inject(FormBuilder).nonNullable.group({
    abonoMinimoPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    penalidadCancelacionPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  ngOnInit(): void {
    this.cargar();
    this.service.politicas().subscribe({
      next: (p) => {
        this.politica.setValue({ abonoMinimoPct: Number(p.abonoMinimoPct), penalidadCancelacionPct: Number(p.penalidadCancelacionPct) });
        this.actualizarEjemplo();
      },
      error: (e) => this.errorDialog.mostrarDesdeApi(e),
    });
    this.politica.valueChanges.subscribe(() => this.actualizarEjemplo());
  }

  private cargar(): void {
    this.service.listar().subscribe({
      next: (lista) => {
        this.promociones.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  private actualizarEjemplo(): void {
    const { abonoMinimoPct: a, penalidadCancelacionPct: p } = this.politica.getRawValue();
    const total = 500000;
    const abono = Math.ceil((total * a) / 100);
    const retenido = Math.round((abono * p) / 100);
    this.ejemploPolitica.set(
      a > 0
        ? `Ejemplo: en una reserva de ${moneda(total)} (con IVA) se exige un abono de ${moneda(abono)}; si se cancela, se retienen ${moneda(retenido)} y se devuelven ${moneda(abono - retenido)}.`
        : 'Sin abono mínimo: las reservas se pueden crear sin abono (los abonos siguen siendo opcionales).',
    );
  }

  guardarPolitica(): void {
    this.guardandoPolitica.set(true);
    this.service.actualizarPoliticas(this.politica.getRawValue()).subscribe({
      next: () => {
        this.guardandoPolitica.set(false);
        this.snack.open('Políticas de reserva actualizadas', 'OK', { duration: 2500 });
      },
      error: (e) => {
        this.guardandoPolitica.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  abrir(p: Promocion | null): void {
    this.dialog
      .open(PromocionDialogComponent, { ...roomixDialogConfig({ width: '620px' }), data: p })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.cargar();
          this.snack.open(p ? 'Promoción actualizada' : 'Promoción creada', 'OK', { duration: 2500 });
        }
      });
  }

  activar(p: Promocion, valor: boolean): void {
    this.service.cambiarActiva(p.id, valor).subscribe({
      next: () => this.cargar(),
      error: (e) => {
        this.errorDialog.mostrarDesdeApi(e);
        this.cargar();
      },
    });
  }
}
