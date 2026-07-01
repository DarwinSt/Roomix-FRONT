import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  warn?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>

    <div mat-dialog-title class="dialog-header">
      <div class="header-icon" [class.warn]="data.warn">
        <mat-icon>{{ data.icon ?? (data.warn ? 'warning' : 'help_outline') }}</mat-icon>
      </div>
      <div class="header-text">
        <h2>{{ data.title }}</h2>
      </div>
    </div>
    <mat-dialog-content>
      <p class="mensaje">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ data.cancelLabel ?? 'Cancelar' }}</button>
      <button
        mat-flat-button
        [color]="data.warn ? 'warn' : 'primary'"
        [mat-dialog-close]="true"
      >
        {{ data.confirmLabel ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .header-icon.warn {
      background: rgba(198, 40, 40, 0.12);
      color: #c62828;
    }

    .mensaje {
      margin: 0;
      color: var(--text-100);
      line-height: 1.5;
      white-space: pre-line;
    }
  `,
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
