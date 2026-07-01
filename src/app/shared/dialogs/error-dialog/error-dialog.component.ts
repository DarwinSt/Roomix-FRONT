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
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="error-dialog">
      <h2 mat-dialog-title>
        <mat-icon class="icono-error" aria-hidden="true">error_outline</mat-icon>
        <span>{{ data.title ?? 'Error' }}</span>
      </h2>
      <mat-dialog-content>
        <p class="mensaje">{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-flat-button color="primary" mat-dialog-close autofocus>Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .error-dialog h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-weight: 600;
      color: var(--roomix-error);
    }

    .icono-error {
      color: var(--roomix-error);
      font-size: 1.75rem;
      width: 1.75rem;
      height: 1.75rem;
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
