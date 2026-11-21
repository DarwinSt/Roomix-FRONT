import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { AparienciaComponent } from './apariencia.component';
import { ChecklistsComponent } from './checklists.component';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { ConfiguracionHotel, ModoCobro } from '../../../core/models/configuracion.model';
import { environment } from '../../../../environments/environment';

/** Datos, marca y opciones del hotel; módulos contratados en la licencia (solo lectura). */
@Component({
  selector: 'app-configuracion',
  imports: [ReactiveFormsModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSlideToggleModule, MatTabsModule, AparienciaComponent, ChecklistsComponent],
  template: `
    <div class="page-header row">
      <div>
        <h1>Configuración del hotel</h1>
        <p>Identidad, apariencia, cobro, correo, datos personales y las acciones de aseo y mantenimiento del hotel.</p>
      </div>
      @if (pestana() === 0 || pestana() === 2 || pestana() === 3) {
        <div class="rx-acciones">
          <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando() || !cfg()"><mat-icon>save</mat-icon>Guardar cambios</button>
        </div>
      }
    </div>

    @if (!cfg()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else {
      <mat-tab-group class="pestanas" [selectedIndex]="pestana()" (selectedIndexChange)="pestana.set($event)" animationDuration="150ms"
                     mat-stretch-tabs="false" mat-align-tabs="start">
      <mat-tab>
        <ng-template mat-tab-label><mat-icon>storefront</mat-icon>Hotel</ng-template>
      <form [formGroup]="form" class="secciones">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>storefront</mat-icon>Identidad del hotel</div>
          <div class="identidad">
            <div class="logo">
              <div class="logo-marco">
                @if (logoPreview(); as src) { <img [src]="src" alt="Logo del hotel" /> }
                @else { <mat-icon>image</mat-icon><span>Sin logo</span> }
              </div>
              <input #archivo type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="subirLogo($any($event.target).files)" />
              <button mat-stroked-button type="button" (click)="archivo.click()" [disabled]="subiendo()"><mat-icon>upload</mat-icon>{{ cfg()!.tieneLogo ? 'Cambiar logo' : 'Subir logo' }}</button>
              @if (cfg()!.tieneLogo) {
                <button mat-button type="button" (click)="quitarLogo()" [disabled]="subiendo()"><mat-icon>delete</mat-icon>Quitar</button>
              }
              <p class="ayuda">PNG, JPG o WebP de máximo 1 MB. Se muestra en el menú, el inicio de sesión, los comprobantes y las facturas.</p>
            </div>
            <div class="rx-form-grid campos">
              <mat-form-field appearance="outline" class="rx-full">
                <mat-label>Nombre del hotel</mat-label>
                <input matInput formControlName="nombre" maxlength="120" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>NIT</mat-label>
                <input matInput formControlName="nit" maxlength="40" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Prefijo de las facturas</mat-label>
                <input matInput formControlName="prefijoFactura" maxlength="10" />
                <mat-hint>Ejemplo: FV → FV-000123</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="rx-full">
                <mat-label>Dirección</mat-label>
                <input matInput formControlName="direccion" maxlength="150" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Ciudad</mat-label>
                <input matInput formControlName="ciudad" maxlength="100" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Teléfono</mat-label>
                <input matInput formControlName="telefono" maxlength="40" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="rx-full">
                <mat-label>Correo del hotel</mat-label>
                <input matInput type="email" formControlName="email" maxlength="150" />
              </mat-form-field>
            </div>
          </div>
        </section>
      </form>
      </mat-tab>

      <mat-tab>
        <ng-template mat-tab-label><mat-icon>palette</mat-icon>Apariencia</ng-template>
        <div class="secciones"><app-apariencia [cfg]="cfg()!" (guardado)="cargar($event)" /></div>
      </mat-tab>

      <mat-tab>
        <ng-template mat-tab-label><mat-icon>payments</mat-icon>Cobro e impuestos</ng-template>
      <form [formGroup]="form" class="secciones">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>payments</mat-icon>Cobro e impuestos</div>
          <p class="etiqueta">¿Cómo cobra el alojamiento?</p>
          <mat-button-toggle-group formControlName="modoCobro" class="modo">
            <mat-button-toggle value="POR_HABITACION"><mat-icon>bed</mat-icon> Por habitación y noche</mat-button-toggle>
            <mat-button-toggle value="POR_PERSONA"><mat-icon>groups</mat-icon> Por persona y noche</mat-button-toggle>
          </mat-button-toggle-group>
          <p class="ayuda">
            @if (form.controls.modoCobro.value === 'POR_PERSONA') {
              La tarifa de cada habitación es el precio por persona y noche: el total de la reserva es tarifa × noches × personas.
            } @else {
              La tarifa de cada habitación es el precio por noche, sin importar cuántas personas se alojen.
            }
            El cambio aplica a las reservas nuevas; las existentes conservan su cálculo.
          </p>
          <div class="toggles">
            <mat-slide-toggle formControlName="cobraIva">El hotel cobra IVA</mat-slide-toggle>
            @if (form.controls.cobraIva.value) {
              <mat-form-field appearance="outline" class="iva">
                <mat-label>IVA</mat-label>
                <input matInput type="number" min="0" max="100" formControlName="ivaPorcentaje" />
                <span matTextSuffix>&nbsp;%</span>
              </mat-form-field>
              <mat-slide-toggle formControlName="exentoIvaExtranjeros">Extranjeros no residentes exentos (art. 481 E.T.)</mat-slide-toggle>
            }
          </div>
        </section>
      </form>
      </mat-tab>

      <mat-tab>
        <ng-template mat-tab-label><mat-icon>mark_email_read</mat-icon>Correo y datos</ng-template>
      <form [formGroup]="form" class="secciones">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>mark_email_read</mat-icon>Correo y datos personales</div>
          <div class="toggles">
            <mat-slide-toggle formControlName="correoConfirmacionReserva">
              Enviar correo de confirmación al huésped cuando se crea la reserva
            </mat-slide-toggle>
            @if (!cfg()!.correoDisponible) {
              <p class="aviso"><mat-icon>info</mat-icon>El servidor aún no tiene configurado el envío de correos (variables BREVO_API_KEY y MAIL_FROM).</p>
            }
          </div>
          <div class="retencion">
            <mat-form-field appearance="outline">
              <mat-label>Eliminar datos de huéspedes inactivos después de</mat-label>
              <input matInput type="number" min="0" max="120" formControlName="mesesRetencionHuespedes" />
              <span matTextSuffix>&nbsp;meses</span>
              <mat-hint>0 = nunca</mat-hint>
            </mat-form-field>
            <button mat-stroked-button type="button" (click)="aplicarRetencion()" [disabled]="!cfg()!.mesesRetencionHuespedes || aplicando()">
              <mat-icon>auto_delete</mat-icon>Aplicar ahora
            </button>
          </div>
          <p class="ayuda">Se borran el nombre, el documento, el correo y el teléfono de los huéspedes sin reservas activas ni estadías en ese plazo
            (Ley 1581 de 2012). Las reservas y facturas se conservan, porque la ley tributaria obliga a guardarlas. La revisión se hace cada noche.</p>
        </section>
      </form>
      </mat-tab>

      <mat-tab>
        <ng-template mat-tab-label><mat-icon>cleaning_services</mat-icon>Aseo y mantenimiento</ng-template>
        <div class="secciones">
          <p class="intro">Defina las acciones que el personal marca en el checklist de cada tipo de servicio.</p>
          <app-checklists />
        </div>
      </mat-tab>

      <mat-tab>
        <ng-template mat-tab-label><mat-icon>verified</mat-icon>Módulos</ng-template>
      <div class="secciones">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>verified</mat-icon>Módulos contratados</div>
          <ul class="modulos">
            @for (m of cfg()!.modulos; track m.codigo) {
              <li [class.off]="!m.habilitado"><mat-icon>{{ m.habilitado ? 'check_circle' : 'block' }}</mat-icon>{{ m.nombre }}</li>
            }
          </ul>
          <p class="ayuda">{{ cfg()!.clienteLicencia ? 'Licencia de ' + cfg()!.clienteLicencia + '. ' : '' }}Para agregar o quitar módulos comuníquese con el proveedor de Roomix.</p>
        </section>
      </div>
      </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: `
    .secciones { display: flex; flex-direction: column; gap: 1rem; padding-top: 1rem; }
    .pestanas mat-icon { margin-right: 0.4rem; font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
    .intro { margin: 0; font-size: 0.9rem; color: var(--text-200); }
    .identidad { display: grid; grid-template-columns: 220px 1fr; gap: 1.5rem; align-items: start; }
    .logo { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; }
    .logo-marco { width: 200px; height: 140px; border: 1px dashed #c5ccc8; border-radius: 12px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; color: #8a948f; background: #fafcfb; overflow: hidden; }
    .logo-marco img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .ayuda { font-size: 0.82rem; color: #5b6660; margin: 0.25rem 0 0; }
    .etiqueta { margin: 0 0 0.5rem; font-weight: 600; }
    .modo { flex-wrap: wrap; }
    .toggles { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; align-items: flex-start; }
    .iva { width: 140px; }
    .aviso { display: flex; gap: 0.4rem; align-items: center; color: #8a5a00; font-size: 0.85rem; margin: 0; }
    .retencion { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-top: 1rem; }
    .retencion mat-form-field { width: 340px; max-width: 100%; }
    .modulos { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; }
    .modulos li { display: flex; align-items: center; gap: 0.4rem; }
    .modulos li mat-icon { color: var(--primary-300); }
    .modulos li.off { color: #8a948f; }
    .modulos li.off mat-icon { color: #b0b8b4; }
    @media (max-width: 760px) { .identidad { grid-template-columns: 1fr; } }
  `,
})
export class ConfiguracionComponent implements OnInit {
  private readonly service = inject(ConfiguracionService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly cfg = signal<ConfiguracionHotel | null>(null);
  readonly guardando = signal(false);
  readonly subiendo = signal(false);
  readonly aplicando = signal(false);
  readonly logoPreview = signal<string | null>(null);
  /** 0 Hotel · 1 Apariencia · 2 Cobro · 3 Correo y datos · 4 Aseo · 5 Módulos (el botón Guardar es de 0, 2 y 3) */
  readonly pestana = signal(0);

  readonly form = this.fb.group({
    nombre: ['', Validators.required],
    nit: [''],
    direccion: [''],
    ciudad: [''],
    telefono: [''],
    email: ['', Validators.email],
    prefijoFactura: [''],
    modoCobro: ['POR_HABITACION' as ModoCobro],
    cobraIva: [true],
    ivaPorcentaje: [19 as number | null, [Validators.min(0), Validators.max(100)]],
    exentoIvaExtranjeros: [true],
    correoConfirmacionReserva: [false],
    mesesRetencionHuespedes: [0, [Validators.min(0), Validators.max(120)]],
  });

  ngOnInit(): void {
    this.service.detalle().subscribe({ next: (c) => this.cargar(c), error: (e) => this.errorDialog.mostrarDesdeApi(e) });
  }

  cargar(c: ConfiguracionHotel): void {
    this.cfg.set(c);
    this.logoPreview.set(c.tieneLogo ? `${environment.apiUrl}/configuracion/logo?v=${c.logoVersion}` : null);
    this.form.patchValue({
      nombre: c.nombre, nit: c.nit ?? '', direccion: c.direccion ?? '', ciudad: c.ciudad ?? '', telefono: c.telefono ?? '',
      email: c.email ?? '', prefijoFactura: c.prefijoFactura ?? '', modoCobro: c.modoCobro, cobraIva: c.cobraIva,
      ivaPorcentaje: c.ivaPorcentaje, exentoIvaExtranjeros: c.exentoIvaExtranjeros,
      correoConfirmacionReserva: c.correoConfirmacionReserva, mesesRetencionHuespedes: c.mesesRetencionHuespedes,
    });
    // Sin servicio de correo en el servidor, la confirmación automática no se puede activar
    if (c.correoDisponible) this.form.controls.correoConfirmacionReserva.enable();
    else this.form.controls.correoConfirmacionReserva.disable();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorDialog.mostrar('Revise el nombre del hotel, el correo y el porcentaje de IVA.', 'Datos incompletos');
      return;
    }
    const v = this.form.getRawValue();
    const texto = (x: string | null | undefined) => (x && x.trim() ? x.trim() : null);
    this.guardando.set(true);
    this.service
      .actualizar({
        nombre: v.nombre!.trim(), nit: texto(v.nit), direccion: texto(v.direccion), ciudad: texto(v.ciudad), telefono: texto(v.telefono),
        email: texto(v.email), prefijoFactura: texto(v.prefijoFactura), cobraIva: !!v.cobraIva,
        ivaPorcentaje: v.ivaPorcentaje === null ? null : Number(v.ivaPorcentaje), exentoIvaExtranjeros: !!v.exentoIvaExtranjeros,
        modoCobro: v.modoCobro!, mesesRetencionHuespedes: Number(v.mesesRetencionHuespedes || 0),
        correoConfirmacionReserva: !!v.correoConfirmacionReserva,
      })
      .subscribe({
        next: (c) => {
          this.guardando.set(false);
          this.cargar(c);
          this.snack.open('Configuración guardada', 'Cerrar', { duration: 3000 });
        },
        error: (e) => {
          this.guardando.set(false);
          this.errorDialog.mostrarDesdeApi(e);
        },
      });
  }

  subirLogo(archivos: FileList | null): void {
    const archivo = archivos?.item(0);
    if (!archivo) return;
    if (archivo.size > 1_048_576) {
      this.errorDialog.mostrar('El logo debe pesar máximo 1 MB.', 'Archivo muy grande');
      return;
    }
    this.subiendo.set(true);
    this.service.subirLogo(archivo).subscribe({
      next: (c) => {
        this.subiendo.set(false);
        this.cargar(c);
      },
      error: (e) => {
        this.subiendo.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  quitarLogo(): void {
    this.subiendo.set(true);
    this.service.eliminarLogo().subscribe({
      next: (c) => {
        this.subiendo.set(false);
        this.cargar(c);
      },
      error: (e) => {
        this.subiendo.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  aplicarRetencion(): void {
    this.aplicando.set(true);
    this.service.ejecutarRetencion().subscribe({
      next: (r) => {
        this.aplicando.set(false);
        this.snack.open(r.anonimizados === 0 ? 'No hay huéspedes inactivos para anonimizar' : `${r.anonimizados} huésped(es) anonimizado(s)`,
          'Cerrar', { duration: 4000 });
      },
      error: (e) => {
        this.aplicando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }
}
