import { Injectable } from '@angular/core';

/** Paletas listas para elegir en Configuración → Apariencia. */
export interface PaletaPredefinida {
  nombre: string;
  primario: string;
  acento: string;
}

export const COLORES_ROOMIX = { primario: '#397d54', acento: '#f5c455' };

export const PALETAS: PaletaPredefinida[] = [
  { nombre: 'Roomix', primario: COLORES_ROOMIX.primario, acento: COLORES_ROOMIX.acento },
  { nombre: 'Caribe', primario: '#0f7c8c', acento: '#f2b84b' },
  { nombre: 'Océano', primario: '#1f5fa8', acento: '#f0a830' },
  { nombre: 'Terracota', primario: '#a4502f', acento: '#e9b872' },
  { nombre: 'Vino', primario: '#8a2846', acento: '#e8b04a' },
  { nombre: 'Lavanda', primario: '#5b4b9a', acento: '#f2c14e' },
  { nombre: 'Café', primario: '#6b4a32', acento: '#d9a441' },
  { nombre: 'Grafito', primario: '#3c4650', acento: '#e0a73a' },
];

interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Variables que se escriben en <html> cuando el hotel tiene colores propios (se quitan al volver a los de Roomix). */
const VARIABLES = [
  '--primary-100', '--primary-200', '--primary-300', '--primary-400', '--primary-100-rgb', '--primary-300-rgb', '--primary-400-rgb',
  '--primary-tint', '--accent-100', '--accent-200', '--roomix-toolbar-inicio', '--roomix-toolbar-fin', '--roomix-auth-medio',
  '--mat-sys-primary', '--mat-sys-primary-container', '--mat-sys-on-primary-container', '--mat-sys-tertiary', '--mat-sys-on-tertiary',
  '--mat-sys-on-tertiary-container', '--mat-sys-surface-container-high', '--mat-sys-secondary', '--mat-sys-secondary-container',
  '--mat-sys-on-secondary-container',
];

/**
 * Aplica la paleta del hotel: a partir de un color principal y uno de acento calcula la escala de tonos que usa toda la
 * interfaz (botones, menú, encabezados, modales) y cuida que el texto blanco sobre el color principal se lea bien.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  aplicar(primario: string | null | undefined, acento: string | null | undefined): void {
    const raiz = document.documentElement.style;
    if (!esColor(primario) && !esColor(acento)) {
      VARIABLES.forEach((v) => raiz.removeProperty(v));
      return;
    }
    const vars = paleta(esColor(primario) ? primario! : COLORES_ROOMIX.primario, esColor(acento) ? acento! : COLORES_ROOMIX.acento);
    Object.entries(vars).forEach(([k, v]) => raiz.setProperty(k, v));
  }
}

/** Escala de la paleta para un color principal y uno de acento (también se usa en la vista previa). */
export function paleta(primario: string, acento: string): Record<string, string> {
  const base = aHsl(primario);
  // Tono principal: oscurecer hasta que el texto blanco tenga contraste AA (4.5:1)
  let p300 = { ...base, l: Math.min(base.l, 0.5) };
  while (contraste(aHex(p300), '#ffffff') < 4.5 && p300.l > 0.08) p300 = { ...p300, l: p300.l - 0.02 };
  const p400 = { ...p300, l: Math.max(p300.l - 0.11, 0.1) };
  const p200 = { h: base.h, s: Math.min(base.s, 0.55), l: Math.min(p300.l + 0.24, 0.66) };
  const p100 = { h: base.h, s: Math.min(base.s, 0.55), l: 0.86 };
  const tinte = { h: base.h, s: Math.min(base.s, 0.4), l: 0.955 };

  const a = aHsl(acento);
  const a100 = { ...a, l: Math.min(Math.max(a.l, 0.6), 0.74) };
  const a200 = { ...a100, l: a100.l - 0.16 };

  const hex = { p100: aHex(p100), p200: aHex(p200), p300: aHex(p300), p400: aHex(p400) };
  return {
    '--primary-100': hex.p100,
    '--primary-200': hex.p200,
    '--primary-300': hex.p300,
    '--primary-400': hex.p400,
    '--primary-100-rgb': rgbTexto(hex.p100),
    '--primary-300-rgb': rgbTexto(hex.p300),
    '--primary-400-rgb': rgbTexto(hex.p400),
    '--primary-tint': aHex(tinte),
    '--accent-100': aHex(a100),
    '--accent-200': aHex(a200),
    '--roomix-toolbar-inicio': aHex({ ...p400, l: Math.max(p400.l - 0.08, 0.08) }),
    '--roomix-toolbar-fin': hex.p300,
    '--roomix-auth-medio': hex.p400,
    '--mat-sys-primary': hex.p300,
    '--mat-sys-primary-container': hex.p100,
    '--mat-sys-on-primary-container': hex.p400,
    '--mat-sys-tertiary': hex.p200,
    '--mat-sys-on-tertiary': hex.p400,
    '--mat-sys-on-tertiary-container': hex.p400,
    '--mat-sys-surface-container-high': hex.p100,
    '--mat-sys-secondary': aHex(a100),
    '--mat-sys-secondary-container': aHex({ ...a, l: 0.92 }),
    '--mat-sys-on-secondary-container': aHex({ ...a, l: 0.24 }),
  };
}

export function esColor(v: string | null | undefined): boolean {
  return !!v && /^#[0-9a-f]{6}$/i.test(v);
}

function aRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbTexto(hex: string): string {
  return aRgb(hex).join(', ');
}

function aHsl(hex: string): Hsl {
  const [r, g, b] = aRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function aHex({ h, s, l }: Hsl): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('');
}

function luminancia(hex: string): number {
  const [r, g, b] = aRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG entre dos colores. */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
