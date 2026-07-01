import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from '../models/api-error.model';

export function extractApiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Error inesperado. Intente de nuevo.';
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
