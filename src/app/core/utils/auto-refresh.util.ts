import { DestroyRef } from '@angular/core';

const INTERVALO_MS = 45_000;

/** Programa recarga periódica; invoca onRefresh en silencio (sin spinner). */
export function programarAutoRefresh(destroyRef: DestroyRef, onRefresh: () => void): void {
  const id = setInterval(onRefresh, INTERVALO_MS);
  destroyRef.onDestroy(() => clearInterval(id));
}

export function etiquetaUltimaActualizacion(fecha: Date | null): string {
  if (!fecha) return '';
  const seg = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (seg < 10) return 'Actualizado hace un momento';
  if (seg < 60) return `Actualizado hace ${seg} s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `Actualizado hace ${min} min`;
  return `Actualizado a las ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
}
