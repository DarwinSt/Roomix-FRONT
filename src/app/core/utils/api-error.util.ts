import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from '../models/api-error.model';

export function extractApiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Error inesperado. Intente de nuevo.';
  }

  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Verifique su conexión a internet; si el servidor estaba inactivo puede tardar hasta un minuto en responder.';
  }

  const body = error.error as ProblemDetail | null;
  if (body?.detail) {
    return body.codigo ? `[${body.codigo}] ${body.detail}` : body.detail;
  }

  if (body?.errores) {
    return Object.values(body.errores).join(' · ');
  }

  return `Error ${error.status}: ${error.statusText}`;
}
