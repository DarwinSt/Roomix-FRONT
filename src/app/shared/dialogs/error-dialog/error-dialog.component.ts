import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ErrorDialogData {
  title?: string;
  message: string;
}

@Component({
  selector: 'app-error-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-accent error-accent" aria-hidden="true"></div>

    <div mat-dialog-title class="dialog-header">
      <div class="header-icon error-icon">
        <mat-icon aria-hidden="true">error_outline</mat-icon>
      </div>
      <div class="header-text">
        <h2>{{ data.title ?? 'Error' }}</h2>
      </div>
    </div>
    <mat-dialog-content>
      <p class="mensaje">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close autofocus>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .error-accent {
      background: linear-gradient(90deg, #c62828 0%, #e57373 100%);
    }

    .error-icon {
      background: rgba(198, 40, 40, 0.12);
      color: var(--roomix-error);
    }

    .mensaje {
      margin: 0;
      line-height: 1.55;
      color: var(--text-100);
      white-space: pre-wrap;
    }
  `,
})
export class ErrorDialogComponent {
  readonly data = inject<ErrorDialogData>(MAT_DIALOG_DATA);
}
