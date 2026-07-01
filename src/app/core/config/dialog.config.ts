/**
 * Configuración estándar para MatDialog en Roomix.
 *
 * Patrón para nuevos modales:
 * 1. Abrir con `...roomixDialogConfig({ width: '480px' })` y `data`.
 * 2. En el componente: `host: { class: 'roomix-dialog-shell' }`.
 *    (El padding interno lo aplica `_roomix-dialog.scss` en `.mat-mdc-dialog-surface`,
 *     porque Material usa `display: contents` en el host del componente.)
 * 3. Plantilla: `dialog-accent`, `dialog-header`, `info-banner`, `dialog-form-grid`, etc.
 *    (ver `styles/_roomix-dialog.scss`).
 */
export const ROOMIX_DIALOG_PANEL_CLASS = 'roomix-dialog';

export interface RoomixDialogConfig {
  width?: string;
  maxWidth?: string;
  disableClose?: boolean;
}

/** Opciones recomendadas al abrir cualquier modal de la app. */
export function roomixDialogConfig(options: RoomixDialogConfig = {}) {
  return {
    panelClass: ROOMIX_DIALOG_PANEL_CLASS,
    width: options.width ?? '520px',
    maxWidth: options.maxWidth ?? '95vw',
    disableClose: options.disableClose ?? false,
  };
}
