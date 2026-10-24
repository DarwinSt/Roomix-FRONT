import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { AYUDA_PASSWORD, PATRON_PASSWORD, etiquetaRol } from '../../../core/models/auth.model';
import { passwordsIguales } from '../recuperar/recuperar.component';

/** Perfil del usuario y cambio de contraseña (obligatorio si la contraseña es temporal). */
@Component({
  selector: 'app-cambiar-password',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="page-header">
      <h1>Mi cuenta</h1>
      <p>Datos de tu usuario y cambio de contraseña.</p>
    </div>

    @if (obligatorio()) {
      <div class="aviso">
        <mat-icon>lock_reset</mat-icon>
        <span>Estás usando una contraseña temporal. Crea una nueva para continuar.</span>
      </div>
    }

    <div class="rx-grid-2">
      <section class="rx-card">
        <h2><mat-icon>badge</mat-icon>Mis datos</h2>
        <div class="rx-datos">
          <div class="rx-dato"><span>Nombre</span><strong>{{ usuario()?.nombreCompleto }}</strong></div>
          <div class="rx-dato"><span>Usuario</span><strong>{{ usuario()?.username }}</strong></div>
          <div class="rx-dato"><span>Correo</span><strong>{{ usuario()?.email }}</strong></div>
          <div class="rx-dato"><span>Rol</span><strong>{{ rol() }}</strong></div>
        </div>
      </section>

      <section class="rx-card">
        <h2><mat-icon>password</mat-icon>Cambiar contraseña</h2>
        <form [formGroup]="form" (ngSubmit)="guardar()" class="formulario">
          <mat-form-field appearance="outline">
            <mat-label>Contraseña actual</mat-label>
            <input matInput type="password" formControlName="actual" autocomplete="current-password" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nueva contraseña</mat-label>
            <input matInput type="password" formControlName="nueva" autocomplete="new-password" />
            <mat-hint>{{ ayuda }}</mat-hint>
            @if (form.controls.nueva.touched && form.controls.nueva.invalid) { <mat-error>{{ ayuda }}</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Confirmar nueva contraseña</mat-label>
            <input matInput type="password" formControlName="confirmar" autocomplete="new-password" />
          </mat-form-field>
          @if (form.errors?.['distintas'] && form.controls.confirmar.touched) {
            <p class="error">Las contraseñas no coinciden.</p>
          }
          @if (error()) { <p class="error">{{ error() }}</p> }
          <button mat-flat-button color="primary" type="submit" [disabled]="guardando()">Guardar contraseña</button>
        </form>
      </section>
    </div>
  `,
  styles: `
    .aviso { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem; padding: 0.75rem 1rem;
      border-radius: 12px; background: rgba(245, 196, 85, 0.35); color: #6b4f00; }
    .formulario { display: flex; flex-direction: column; gap: 0.25rem; }
    .formulario mat-form-field { width: 100%; }
    .formulario button { align-self: flex-start; }
    .error { margin: 0 0 0.5rem; color: #c62828; font-size: 0.85rem; }
  `,
})
export class CambiarPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly ayuda = AYUDA_PASSWORD;
  readonly usuario = this.auth.usuario;
  readonly rol = computed(() => etiquetaRol(this.usuario()?.rol));
  readonly obligatorio = computed(() => !!this.usuario()?.debeCambiarPassword);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      actual: ['', Validators.required],
      nueva: ['', [Validators.required, Validators.pattern(PATRON_PASSWORD)]],
      confirmar: ['', Validators.required],
    },
    { validators: passwordsIguales },
  );

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { actual, nueva } = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    this.auth.cambiarPassword(actual, nueva).subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.reset();
        this.snack.open('Contraseña actualizada', 'OK', { duration: 3000 });
        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(extractApiErrorMessage(err));
      },
    });
  }
}
