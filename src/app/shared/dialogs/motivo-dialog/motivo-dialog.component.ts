import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface MotivoDialogData {
  title: string;
  message: string;
  label?: string;
  confirmLabel?: string;
  icon?: string;
}

/** Pide un motivo obligatorio (cancelaciones y anulaciones quedan justificadas y auditadas). */
@Component({
  selector: 'app-motivo-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon warn"><mat-icon>{{ data.icon ?? 'block' }}</mat-icon></div>
      <div class="header-text"><h2>{{ data.title }}</h2></div>
    </div>
    <mat-dialog-content>
      <p class="mensaje">{{ data.message }}</p>
      <mat-form-field appearance="outline" class="campo">
        <mat-label>{{ data.label ?? 'Motivo' }}</mat-label>
        <textarea matInput rows="3" maxlength="200" [formControl]="motivo" cdkFocusInitial></textarea>
        <mat-hint align="end">{{ motivo.value?.length ?? 0 }}/200</mat-hint>
        @if (motivo.touched && motivo.invalid) {
          <mat-error>Indique el motivo</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Volver</button>
      <button mat-flat-button color="warn" type="button" (click)="confirmar()">{{ data.confirmLabel ?? 'Confirmar' }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .header-icon.warn { background: rgba(198, 40, 40, 0.12); color: #c62828; }
    .mensaje { margin: 0 0 0.75rem; line-height: 1.5; }
    .campo { width: 100%; }
  `,
})
export class MotivoDialogComponent {
  readonly data = inject<MotivoDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<MotivoDialogComponent, string>);
  readonly motivo = new FormControl('', [Validators.required, Validators.pattern(/\S/)]);

  confirmar(): void {
    this.motivo.markAsTouched();
    if (this.motivo.valid) {
      this.ref.close(this.motivo.value!.trim());
    }
  }
}
