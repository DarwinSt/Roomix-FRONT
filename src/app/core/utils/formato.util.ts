/** Utilidades de formato compartidas por las pantallas de gestión. */

const MONEDA = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function moneda(valor: number | null | undefined): string {
  return MONEDA.format(Number(valor ?? 0));
}

export function porcentaje(valor: number | null | undefined, decimales = 1): string {
  if (valor === null || valor === undefined) return '—';
  return `${valor.toLocaleString('es-CO', { maximumFractionDigits: decimales })} %`;
}

/** yyyy-MM-dd de una fecha local (sin desfase por zona horaria). */
export function isoFecha(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hoyIso(): string {
  return isoFecha(new Date());
}

export function sumarDias(fecha: Date, dias: number): Date {
  const r = new Date(fecha);
  r.setDate(r.getDate() + dias);
  return r;
}

/** "2026-10-21" o "2026-10-21T15:30:00" → "21/10/2026" (+ hora si aplica). */
export function fechaCorta(valor: string | null | undefined, conHora = false): string {
  if (!valor) return '—';
  const [fecha, hora] = valor.split('T');
  const [y, m, d] = fecha.split('-');
  const base = `${d}/${m}/${y}`;
  return conHora && hora ? `${base} ${hora.slice(0, 5)}` : base;
}

/** Valor para <input type="datetime-local"> a partir de un LocalDateTime del backend. */
export function aInputFechaHora(valor: string | null | undefined): string {
  return valor ? valor.slice(0, 16) : '';
}

/** Valor del input datetime-local → LocalDateTime para el backend. */
export function desdeInputFechaHora(valor: string | null | undefined): string | null {
  return valor ? (valor.length === 16 ? `${valor}:00` : valor) : null;
}

/** Descarga un CSV (separado por ;) compatible con Excel en español. */
export function descargarCsv(nombre: string, encabezados: string[], filas: (string | number | null | undefined)[][]): void {
  const escapar = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const contenido = [encabezados, ...filas].map((f) => f.map(escapar).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
