import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/services/auth.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { ROOMIX_LOGO_URL } from '../../../core/config/brand.config';
import { AYUDA_PASSWORD, PATRON_PASSWORD } from '../../../core/models/auth.model';

export function passwordsIguales(control: AbstractControl): ValidationErrors | null {
  const nueva = control.get('nueva')?.value;
  const confirmar = control.get('confirmar')?.value;
  return nueva && confirmar && nueva !== confirmar ? { distintas: true } : null;
}

/** Solicitud del enlace de recuperación (por correo). */
@Component({
  selector: 'app-recuperar',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="rx-auth">
      <div class="rx-auth-card">
        <img [src]="logo" alt="Roomix" class="rx-auth-logo" />
        <h1>Recuperar contraseña</h1>
        <p class="rx-auth-sub">Te enviaremos un enlace para crear una nueva contraseña.</p>
        @if (mensaje()) {
          <div class="rx-auth-aviso ok"><mat-icon>mark_email_read</mat-icon>{{ mensaje() }}</div>
        }
        @if (error()) {
          <div class="rx-auth-aviso error"><mat-icon>error_outline</mat-icon>{{ error() }}</div>
        }
        <form [formGroup]="form" (ngSubmit)="enviar()">
          <mat-form-field appearance="outline">
            <mat-label>Correo registrado</mat-label>
            <mat-icon matPrefix>mail</mat-icon>
            <input matInput type="email" formControlName="email" autocomplete="email" />
          </mat-form-field>
          <button mat-flat-button color="primary" class="rx-auth-boton" type="submit" [disabled]="cargando()">Enviar enlace</button>
        </form>
        <div class="rx-auth-enlaces"><a routerLink="/login">Volver al inicio de sesión</a></div>
        <p class="rx-auth-pie">¿No tienes acceso a tu correo? Pide al administrador una contraseña temporal.</p>
      </div>
    </div>
  `,
})
export class RecuperarComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly logo = ROOMIX_LOGO_URL;
  readonly cargando = signal(false);
  readonly mensaje = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.auth.recuperar(this.form.getRawValue().email.trim()).subscribe({
      next: (r) => {
        this.cargando.set(false);
        this.mensaje.set(r.mensaje);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(extractApiErrorMessage(err));
      },
    });
  }
}

/** Nueva contraseña con el token del enlace de recuperación. */
@Component({
  selector: 'app-restablecer',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="rx-auth">
      <div class="rx-auth-card">
        <img [src]="logo" alt="Roomix" class="rx-auth-logo" />
        <h1>Nueva contraseña</h1>
        <p class="rx-auth-sub">{{ ayuda }}</p>
        @if (!token) {
          <div class="rx-auth-aviso error"><mat-icon>link_off</mat-icon>El enlace no es válido. Solicita uno nuevo.</div>
        }
        @if (mensaje()) {
          <div class="rx-auth-aviso ok"><mat-icon>check_circle</mat-icon>{{ mensaje() }}</div>
        }
        @if (error()) {
          <div class="rx-auth-aviso error"><mat-icon>error_outline</mat-icon>{{ error() }}</div>
        }
        @if (!mensaje()) {
          <form [formGroup]="form" (ngSubmit)="guardar()">
            <mat-form-field appearance="outline">
              <mat-label>Nueva contraseña</mat-label>
              <input matInput type="password" formControlName="nueva" autocomplete="new-password" />
              @if (form.controls.nueva.touched && form.controls.nueva.invalid) { <mat-error>{{ ayuda }}</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Confirmar contraseña</mat-label>
              <input matInput type="password" formControlName="confirmar" autocomplete="new-password" />
            </mat-form-field>
            @if (form.errors?.['distintas'] && form.controls.confirmar.touched) {
              <div class="rx-auth-aviso error"><mat-icon>error_outline</mat-icon>Las contraseñas no coinciden.</div>
            }
            <button mat-flat-button color="primary" class="rx-auth-boton" type="submit" [disabled]="cargando() || !token">Guardar contraseña</button>
          </form>
        }
        <div class="rx-auth-enlaces"><a routerLink="/login">Ir al inicio de sesión</a></div>
      </div>
    </div>
  `,
})
export class RestablecerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly logo = ROOMIX_LOGO_URL;
  readonly ayuda = AYUDA_PASSWORD;
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  readonly cargando = signal(false);
  readonly mensaje = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group(
    {
      nueva: ['', [Validators.required, Validators.pattern(PATRON_PASSWORD)]],
      confirmar: ['', Validators.required],
    },
    { validators: passwordsIguales },
  );

  guardar(): void {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.auth.restablecer(this.token, this.form.getRawValue().nueva).subscribe({
      next: (r) => {
        this.cargando.set(false);
        this.mensaje.set(r.mensaje);
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(extractApiErrorMessage(err));
      },
    });
  }
}
