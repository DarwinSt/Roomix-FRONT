import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CatalogoPermisos, Permiso, PermisoInfo } from '../../../core/models/permisos.model';
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
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
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

      <div class="permisos-encabezado">
        <p class="section-label">Permisos</p>
        @if (personalizados()) {
          <button mat-button type="button" (click)="restaurarRol()"><mat-icon>restart_alt</mat-icon>Usar los del rol</button>
        }
      </div>
      <p class="rx-muted permisos-ayuda">Al elegir el rol se marcan sus permisos. Puede marcar o quitar módulos para esta persona.</p>
      @if (!catalogo()) {
        <p class="rx-muted">Cargando permisos…</p>
      } @else {
        <div class="permisos">
          @for (g of grupos(); track g.grupo) {
            <div class="permiso-fila">
              <span class="permiso-grupo">{{ g.grupo }}</span>
              <div class="permiso-niveles">
                @for (p of g.permisos; track p.codigo) {
                  <mat-checkbox [checked]="marcados().has(p.codigo)" (change)="alternar(p.codigo, $event.checked)" [title]="p.descripcion">
                    {{ p.nivel }}
                  </mat-checkbox>
                }
              </div>
            </div>
          }
        </div>
      }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .error { color: #c62828; font-size: 0.85rem; margin: 0.5rem 0 0; }
    .descripcion-rol { margin: 0.25rem 0 0.75rem; }
    .permisos-encabezado { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.5rem; }
    .permisos-encabezado .section-label { margin: 0; }
    .permisos-ayuda { margin: 0.1rem 0 0.5rem; font-size: 0.82rem; }
    .permisos { display: flex; flex-direction: column; border: 1px solid #e3e8e5; border-radius: 10px; }
    .permiso-fila { display: grid; grid-template-columns: minmax(150px, 38%) 1fr; gap: 0.5rem; align-items: center; padding: 0.15rem 0.75rem; }
    .permiso-fila + .permiso-fila { border-top: 1px solid #eef2ef; }
    .permiso-grupo { font-weight: 600; font-size: 0.88rem; }
    .permiso-niveles { display: flex; flex-wrap: wrap; column-gap: 0.5rem; }
    @media (max-width: 560px) { .permiso-fila { grid-template-columns: 1fr; padding: 0.4rem 0.75rem; } }
  `,
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

  /** Catálogo de permisos (solo se muestran los de módulos licenciados) y permisos marcados. */
  readonly catalogo = signal<CatalogoPermisos | null>(null);
  readonly marcados = signal<Set<Permiso>>(new Set(this.data?.permisos ?? []));
  readonly grupos = computed(() => {
    const c = this.catalogo();
    if (!c) return [];
    const mapa = new Map<string, PermisoInfo[]>();
    for (const p of c.permisos.filter((x) => x.disponible)) {
      mapa.set(p.grupo, [...(mapa.get(p.grupo) ?? []), p]);
    }
    return [...mapa.entries()].map(([grupo, permisos]) => ({ grupo, permisos }));
  });
  readonly personalizados = computed(() => {
    const c = this.catalogo();
    if (!c) return false;
    const rol = new Set(c.porRol[this.rolActual()] ?? []);
    const m = this.marcados();
    return rol.size !== m.size || [...m].some((p) => !rol.has(p));
  });

  constructor() {
    this.usuarioService.permisos().subscribe((c) => {
      this.catalogo.set(c);
      if (!this.data?.permisos) this.marcados.set(new Set(c.porRol[this.form.controls.rol.value] ?? []));
    });
    // Al cambiar el rol se marcan los permisos de ese rol (luego se pueden ajustar)
    this.form.controls.rol.valueChanges.subscribe((r) => {
      this.rolActual.set(r);
      this.restaurarRol();
    });
  }

  alternar(p: Permiso, marcado: boolean): void {
    const s = new Set(this.marcados());
    if (marcado) s.add(p);
    else s.delete(p);
    this.marcados.set(s);
  }

  restaurarRol(): void {
    const c = this.catalogo();
    if (c) this.marcados.set(new Set(c.porRol[this.form.controls.rol.value] ?? []));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise los campos marcados.');
      return;
    }
    const v = this.form.getRawValue();
    // Se envían todos los marcados (también los de módulos no licenciados que trae el rol); si coinciden con los del
    // rol, el backend deja al usuario siguiendo la plantilla del rol
    const body = { ...v, password: v.password || null, permisos: [...this.marcados()] };
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
        <p>Cuentas del personal. El rol marca los permisos por defecto y se pueden ajustar para cada persona.</p>
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
                <td data-label="Rol">{{ u.rolNombre }}@if (u.permisosPersonalizados) { <span class="sub">Permisos ajustados</span> }</td>
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
      .open(UsuarioDialogComponent, { ...roomixDialogConfig({ width: '680px' }), data: usuario })
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
