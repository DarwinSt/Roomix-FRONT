import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { roomixDialogConfig } from '../config/dialog.config';
import {
  ErrorDialogComponent,
  ErrorDialogData,
} from '../../shared/dialogs/error-dialog/error-dialog.component';
import { extractApiErrorMessage } from '../utils/api-error.util';

@Injectable({ providedIn: 'root' })
export class ErrorDialogService {
  private readonly dialog = inject(MatDialog);

  mostrar(message: string, title = 'Error'): void {
    this.abrir({ title, message });
  }

  mostrarDesdeApi(error: unknown, title = 'Error'): void {
    this.mostrar(extractApiErrorMessage(error), title);
  }

  private abrir(data: ErrorDialogData): void {
    this.dialog.open(ErrorDialogComponent, {
      ...roomixDialogConfig({ width: '440px' }),
      data,
      autoFocus: 'first-tabbable',
    });
  }
}
