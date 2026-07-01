export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  codigo?: string;
  modulo?: string;
  errores?: Record<string, string>;
  timestamp?: string;
}
