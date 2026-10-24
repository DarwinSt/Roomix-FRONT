import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { IncidenciaService } from '../../../core/services/incidencia.service';
import { Personal } from '../../../core/models/incidencia.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';

/** Sugerencias frecuentes; se puede escribir cualquier otro cargo o departamento. */
const CARGOS = ['Camarera de pisos', 'Supervisora de housekeeping', 'Técnico de mantenimiento', 'Electricista',
  'Mesero de room service', 'Recepcionista', 'Botones', 'Conductor', 'Terapeuta de spa', 'Auxiliar de lavandería'];
const DEPARTAMENTOS = ['Housekeeping', 'Mantenimiento', 'Alimentos y bebidas', 'Recepción', 'Lavandería', 'Spa', 'Transporte', 'Eventos'];

/** Registrar o editar una persona del equipo operativo (asignable a tareas). */
@Component({
  selector: 'app-personal-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatAutocompleteModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>{{ data ? 'manage_accounts' : 'person_add' }}</mat-icon></div>
      <div class="header-text">
        <h2>{{ data ? 'Editar personal' : 'Nuevo personal' }}</h2>
        <p>Personas asignables a tareas de limpieza, mantenimiento y servicios.</p>
      </div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" class="rx-form-grid">
        <mat-form-field appearance="outline" class="rx-full">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="nombre" maxlength="120" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cargo</mat-label>
          <input matInput formControlName="rol" maxlength="80" [matAutocomplete]="acCargo" />
          <mat-autocomplete #acCargo="matAutocomplete">
            @for (c of filtrar(cargos, form.controls.rol.value); track c) { <mat-option [value]="c">{{ c }}</mat-option> }
          </mat-autocomplete>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Departamento</mat-label>
          <input matInput formControlName="departamento" maxlength="80" [matAutocomplete]="acDep" />
          <mat-autocomplete #acDep="matAutocomplete">
            @for (c of filtrar(departamentos, form.controls.departamento.value); track c) { <mat-option [value]="c">{{ c }}</mat-option> }
          </mat-autocomplete>
        </mat-form-field>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `.error { color: #c62828; font-size: 0.85rem; margin: 0.5rem 0 0; }`,
})
export class PersonalDialogComponent {
  readonly data = inject<Personal | null>(MAT_DIALOG_DATA);
  private readonly service = inject(IncidenciaService);
  private readonly ref = inject(MatDialogRef<PersonalDialogComponent, boolean>);

  readonly cargos = CARGOS;
  readonly departamentos = DEPARTAMENTOS;
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    nombre: [this.data?.nombre ?? '', [Validators.required, Validators.maxLength(120)]],
    rol: [this.data?.rol ?? '', [Validators.required, Validators.maxLength(80)]],
    departamento: [this.data?.departamento ?? '', Validators.maxLength(80)],
  });

  filtrar(lista: string[], texto: string): string[] {
    const q = (texto ?? '').toLowerCase();
    return lista.filter((x) => x.toLowerCase().includes(q));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { nombre: v.nombre.trim(), rol: v.rol.trim(), departamento: v.departamento.trim() || null };
    this.guardando.set(true);
    const req = this.data ? this.service.actualizarPersonal(this.data.id, body) : this.service.crearPersonal(body);
    req.subscribe({
      next: () => this.ref.close(true),
      error: (e) => {
        this.guardando.set(false);
        this.error.set(extractApiErrorMessage(e));
      },
    });
  }
}
