import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsuarioService } from '../../../core/services/modulos.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { AuthService } from '../../../core/services/auth.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { AYUDA_PASSWORD, PATRON_PASSWORD, ROLES, Rol, Usuario, etiquetaRol } from '../../../core/models/auth.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { fechaCorta } from '../../../core/utils/formato.util';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-usuario-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>{{ data ? 'manage_accounts' : 'person_add' }}</mat-icon></div>
      <div class="header-text"><h2>{{ data ? 'Editar usuario' : 'Nuevo usuario' }}</h2></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Usuario</mat-label>
          <input matInput formControlName="username" autocapitalize="none" />
          <mat-hint>Letras, números, punto o guion</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="rol" panelClass="roomix-select-panel">
            @for (r of roles; track r.value) {
              <mat-option [value]="r.value">{{ r.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="nombreCompleto" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Correo (para recuperar la contraseña)</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>{{ data ? 'Nueva contraseña (opcional)' : 'Contraseña inicial' }}</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          <mat-hint>{{ ayuda }} El usuario deberá cambiarla al ingresar.</mat-hint>
        </mat-form-field>
        <p class="rx-full rx-muted descripcion-rol">{{ descripcionRol() }}</p>
        @if (data) {
          <mat-slide-toggle formControlName="activo" class="rx-full">Usuario activo</mat-slide-toggle>
        }
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.error { color: #c62828; font-size: 0.85rem; margin: 0.5rem 0 0; } .descripcion-rol { margin: 0.25rem 0 0.75rem; }`,
})
export class UsuarioDialogComponent {
  readonly data = inject<Usuario | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<UsuarioDialogComponent, boolean>);
  private readonly usuarioService = inject(UsuarioService);
  private readonly fb = inject(FormBuilder);

  readonly roles = ROLES;
  readonly ayuda = AYUDA_PASSWORD;
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: [this.data?.username ?? '', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]{3,50}$/)]],
    rol: [(this.data?.rol ?? 'RECEPCION') as Rol, Validators.required],
    nombreCompleto: [this.data?.nombreCompleto ?? '', Validators.required],
    email: [this.data?.email ?? '', [Validators.required, Validators.email]],
    password: ['', this.data ? [Validators.pattern(PATRON_PASSWORD)] : [Validators.required, Validators.pattern(PATRON_PASSWORD)]],
    activo: [this.data?.activo ?? true],
  });

  private readonly rolActual = signal(this.form.controls.rol.value);
  readonly descripcionRol = computed(() => ROLES.find((r) => r.value === this.rolActual())?.descripcion ?? '');

  constructor() {
    this.form.controls.rol.valueChanges.subscribe((r) => this.rolActual.set(r));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise los campos marcados.');
      return;
    }
    const v = this.form.getRawValue();
    const body = { ...v, password: v.password || null };
    this.guardando.set(true);
    const peticion = this.data ? this.usuarioService.actualizar(this.data.id, body) : this.usuarioService.crear(body);
    peticion.subscribe({
      next: () => this.ref.close(true),
      error: (err) => {
        this.guardando.set(false);
        this.error.set(extractApiErrorMessage(err));
      },
    });
  }
}

@Component({
  selector: 'app-password-temporal-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>key</mat-icon></div>
      <div class="header-text"><h2>Contraseña temporal</h2></div>
    </div>
    <mat-dialog-content>
      <p>Comparta esta contraseña con <strong>{{ data.nombre }}</strong>. Solo se muestra una vez y deberá cambiarla al ingresar.</p>
      <div class="clave">{{ data.password }}</div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="copiar()"><mat-icon>content_copy</mat-icon> {{ copiado() ? 'Copiada' : 'Copiar' }}</button>
      <button mat-flat-button color="primary" mat-dialog-close>Listo</button>
    </mat-dialog-actions>
  `,
  styles: `.clave { font-family: monospace; font-size: 1.4rem; letter-spacing: 0.12em; text-align: center; padding: 0.85rem;
    border-radius: 10px; background: rgba(168, 224, 183, 0.3); color: var(--text-strong); user-select: all; }`,
})
export class PasswordTemporalDialogComponent {
  readonly data = inject<{ nombre: string; password: string }>(MAT_DIALOG_DATA);
  readonly copiado = signal(false);

  copiar(): void {
    navigator.clipboard?.writeText(this.data.password).then(() => this.copiado.set(true));
  }
}

@Component({
  selector: 'app-usuarios',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="page-header row">
      <div>
        <h1>Usuarios y roles</h1>
        <p>Cuentas del personal y el módulo al que accede cada rol.</p>
      </div>
      <button mat-flat-button color="primary" (click)="abrir(null)"><mat-icon>person_add</mat-icon>Nuevo usuario</button>
    </div>

    <div class="rx-kpis">
      @for (r of conteoRoles(); track r.value) {
        <div class="rx-kpi" [matTooltip]="r.descripcion">
          <span class="rx-kpi-etiqueta"><mat-icon>{{ r.icon }}</mat-icon>{{ r.label }}</span>
          <span class="rx-kpi-valor">{{ r.cantidad }}</span>
        </div>
      }
    </div>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else {
      <div class="rx-tabla-wrap">
        <table class="rx-tabla">
          <thead>
            <tr><th>Usuario</th><th>Rol</th><th>Correo</th><th>Último acceso</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            @for (u of usuarios(); track u.id) {
              <tr>
                <td data-label="Usuario" class="ancho"><strong>{{ u.nombreCompleto }}</strong><span class="sub">{{ u.username }}</span></td>
                <td data-label="Rol">{{ u.rolNombre }}</td>
                <td data-label="Correo">{{ u.email }}</td>
                <td data-label="Último acceso" class="rx-num">{{ fecha(u.ultimoAcceso, true) }}</td>
                <td data-label="Estado">
                  @if (!u.activo) { <span class="rx-chip critico">Inactivo</span> }
                  @else if (u.debeCambiarPassword) { <span class="rx-chip alerta">Clave temporal</span> }
                  @else { <span class="rx-chip ok">Activo</span> }
                </td>
                <td class="acciones derecha">
                  <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Acciones del usuario"><mat-icon>more_vert</mat-icon></button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="abrir(u)"><mat-icon>edit</mat-icon>Editar</button>
                    <button mat-menu-item (click)="passwordTemporal(u)"><mat-icon>key</mat-icon>Generar contraseña temporal</button>
                    @if (u.id !== miId()) {
                      <button mat-menu-item (click)="cambiarActivo(u)">
                        <mat-icon>{{ u.activo ? 'person_off' : 'person' }}</mat-icon>{{ u.activo ? 'Desactivar' : 'Activar' }}
                      </button>
                    }
                  </mat-menu>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class UsuariosComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  readonly cargando = signal(true);
  readonly usuarios = signal<Usuario[]>([]);
  readonly miId = computed(() => this.auth.usuario()?.id);
  readonly conteoRoles = computed(() =>
    ROLES.map((r) => ({ ...r, cantidad: this.usuarios().filter((u) => u.rol === r.value && u.activo).length })),
  );
  readonly fecha = fechaCorta;
  readonly etiquetaRol = etiquetaRol;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.usuarioService.listar().subscribe({
      next: (u) => {
        this.usuarios.set(u);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  abrir(usuario: Usuario | null): void {
    this.dialog
      .open(UsuarioDialogComponent, { ...roomixDialogConfig({ width: '560px' }), data: usuario })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.snack.open(usuario ? 'Usuario actualizado' : 'Usuario creado', 'OK', { duration: 2500 });
          this.cargar();
        }
      });
  }

  passwordTemporal(u: Usuario): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        ...roomixDialogConfig({ width: '440px' }),
        data: {
          title: 'Generar contraseña temporal',
          message: `Se reemplazará la contraseña de ${u.nombreCompleto} y se desbloqueará su cuenta. ¿Continuar?`,
          confirmLabel: 'Generar',
          icon: 'key',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.usuarioService.restablecerPassword(u.id).subscribe({
          next: (r) => {
            this.dialog.open(PasswordTemporalDialogComponent, {
              ...roomixDialogConfig({ width: '440px' }),
              data: { nombre: u.nombreCompleto, password: r.passwordTemporal },
            });
            this.cargar();
          },
          error: (e) => this.errorDialog.mostrarDesdeApi(e),
        });
      });
  }

  cambiarActivo(u: Usuario): void {
    this.usuarioService.cambiarActivo(u.id, !u.activo).subscribe({
      next: () => {
        this.snack.open(u.activo ? 'Usuario desactivado' : 'Usuario activado', 'OK', { duration: 2500 });
        this.cargar();
      },
      error: (e) => this.errorDialog.mostrarDesdeApi(e),
    });
  }
}
