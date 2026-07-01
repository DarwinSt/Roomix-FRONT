/** Convierte fecha del calendario + hora actual del sistema a formato API (LocalDateTime). */
export function combinarFechaConHoraActual(fecha: Date | null): string | null {
  if (!fecha) {
    return null;
  }
  const ahora = new Date();
  const combinada = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    ahora.getHours(),
    ahora.getMinutes(),
    ahora.getSeconds(),
    0,
  );
  return formatearIsoLocal(combinada);
}

export function parsearFechaApi(iso: string | null | undefined): Date | null {
  if (!iso) {
    return null;
  }
  const soloFecha = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const partes = soloFecha.split('-').map(Number);
  if (partes.length < 3) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(partes[0], partes[1] - 1, partes[2]);
}

/** Muestra dd/mm/aaaa hh:mm */
export function formatearFechaHoraDisplay(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Solo dd/mm/aaaa */
export function formatearFechaDisplay(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function formatearIsoLocal(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** yyyy-MM-dd para campos LocalDate de la API. */
export function formatearFechaIso(fecha: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
}

export function combinarFechaHora(fecha: Date, hora: Date): string {
  const combinada = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    hora.getHours(),
    hora.getMinutes(),
    0,
    0,
  );
  return formatearIsoLocal(combinada);
}
