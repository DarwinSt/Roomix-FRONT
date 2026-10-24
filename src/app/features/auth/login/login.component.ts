import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { ROOMIX_LOGO_URL } from '../../../core/config/brand.config';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="rx-auth">
      <div class="rx-auth-card">
        <img [src]="logo" alt="Roomix" class="rx-auth-logo" />
        <h1>Bienvenido a Roomix</h1>
        <p class="rx-auth-sub">Todo tu hotel, en una sola plataforma</p>

        @if (expirada) {
          <div class="rx-auth-aviso"><mat-icon>schedule</mat-icon>Tu sesión expiró. Inicia sesión de nuevo.</div>
        }
        @if (error()) {
          <div class="rx-auth-aviso error" role="alert"><mat-icon>error_outline</mat-icon>{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="ingresar()">
          <mat-form-field appearance="outline">
            <mat-label>Usuario</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input matInput formControlName="username" autocomplete="username" autocapitalize="none" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Contraseña</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput [type]="verPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
            <button mat-icon-button matSuffix type="button" (click)="verPassword.set(!verPassword())"
                    [attr.aria-label]="verPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <mat-icon>{{ verPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>
          <button mat-flat-button color="primary" class="rx-auth-boton" type="submit" [disabled]="cargando()">
            @if (cargando()) { <mat-spinner diameter="20" /> } @else { Iniciar sesión }
          </button>
        </form>

        <div class="rx-auth-enlaces">
          <a routerLink="/recuperar">¿Olvidaste tu contraseña?</a>
        </div>
        <p class="rx-auth-pie">Acceso exclusivo para el personal del hotel. Las acciones quedan registradas.</p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly logo = ROOMIX_LOGO_URL;
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly verPassword = signal(false);
  readonly expirada = this.route.snapshot.queryParamMap.get('motivo') === 'expirada';

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Ingresa tu usuario y contraseña.');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username.trim(), password).subscribe({
      next: (r) => {
        this.cargando.set(false);
        if (r.usuario.debeCambiarPassword) {
          this.router.navigate(['/cambiar-password']);
          return;
        }
        const volver = this.route.snapshot.queryParamMap.get('volver');
        this.router.navigateByUrl(volver && volver.startsWith('/') && !volver.startsWith('/login') ? volver : '/inicio');
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(extractApiErrorMessage(err).replace(/^\[AUT-\d+\]\s*/, ''));
      },
    });
  }
}
