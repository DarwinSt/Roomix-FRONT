/** Imagen como arreglo RGBA (igual que ImageData, pero sin depender del navegador para poder probarla). */
export interface Pixeles {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface OpcionesFondo {
  /** 0 a 100: cuánto se puede alejar un color del fondo y seguir contando como fondo. */
  tolerancia: number;
  /** También quita ese color dentro del logo (huecos de letras como la «o»), no solo el que toca los bordes. */
  incluirInterior: boolean;
  /** Recorta los márgenes transparentes que quedan alrededor. */
  recortar: boolean;
}

const MAX_DISTANCIA = Math.sqrt(3 * 255 * 255);
/** Franja de bordes suaves: los píxeles apenas más lejos que la tolerancia quedan semitransparentes (sin dientes). */
const SUAVIZADO = 0.08;

/** Color de fondo: el más repetido en el borde de la imagen (ignorando lo que ya es transparente). */
export function colorDeFondo(img: Pixeles): [number, number, number] {
  const cuenta = new Map<number, { n: number; r: number; g: number; b: number }>();
  const sumar = (x: number, y: number) => {
    const i = (y * img.width + x) * 4;
    if (img.data[i + 3] < 16) return;
    const [r, g, b] = [img.data[i], img.data[i + 1], img.data[i + 2]];
    const clave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const c = cuenta.get(clave) ?? { n: 0, r: 0, g: 0, b: 0 };
    c.n++;
    c.r += r;
    c.g += g;
    c.b += b;
    cuenta.set(clave, c);
  };
  for (let x = 0; x < img.width; x++) {
    sumar(x, 0);
    sumar(x, img.height - 1);
  }
  for (let y = 1; y < img.height - 1; y++) {
    sumar(0, y);
    sumar(img.width - 1, y);
  }
  let mejor: { n: number; r: number; g: number; b: number } | null = null;
  for (const c of cuenta.values()) if (!mejor || c.n > mejor.n) mejor = c;
  if (!mejor) return [255, 255, 255];
  return [Math.round(mejor.r / mejor.n), Math.round(mejor.g / mejor.n), Math.round(mejor.b / mejor.n)];
}

/**
 * Vuelve transparente el fondo de un logo: el color que rodea la imagen y lo que se le parece según la tolerancia.
 * Por defecto solo quita lo que está conectado con el borde (así no borra el blanco que hace parte del dibujo).
 * Devuelve una imagen nueva; la original no se modifica.
 */
export function quitarFondo(img: Pixeles, op: OpcionesFondo): Pixeles {
  const { width: w, height: h } = img;
  const salida = new Uint8ClampedArray(img.data);
  const [fr, fg, fb] = colorDeFondo(img);
  const tol = (Math.max(0, Math.min(100, op.tolerancia)) / 100) * 0.5;

  const distancia = (p: number) => {
    const i = p * 4;
    if (img.data[i + 3] < 16) return 0;
    const dr = img.data[i] - fr;
    const dg = img.data[i + 1] - fg;
    const db = img.data[i + 2] - fb;
    return Math.sqrt(dr * dr + dg * dg + db * db) / MAX_DISTANCIA;
  };
  const aplicar = (p: number, d: number) => {
    const factor = d <= tol ? 0 : (d - tol) / SUAVIZADO;
    if (factor < 1) salida[p * 4 + 3] = Math.round(img.data[p * 4 + 3] * factor);
  };

  if (op.incluirInterior) {
    for (let p = 0; p < w * h; p++) {
      const d = distancia(p);
      if (d < tol + SUAVIZADO) aplicar(p, d);
    }
  } else {
    // Relleno desde los bordes: avanza solo por píxeles parecidos al fondo
    const visto = new Uint8Array(w * h);
    const cola = new Int32Array(w * h);
    let ini = 0;
    let fin = 0;
    const encolar = (p: number) => {
      if (visto[p]) return;
      visto[p] = 1;
      const d = distancia(p);
      if (d <= tol) {
        cola[fin++] = p;
        aplicar(p, d);
      } else if (d < tol + SUAVIZADO) {
        aplicar(p, d); // borde del dibujo: semitransparente, pero no se sigue por ahí
      }
    };
    for (let x = 0; x < w; x++) {
      encolar(x);
      encolar((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      encolar(y * w);
      encolar(y * w + w - 1);
    }
    while (ini < fin) {
      const p = cola[ini++];
      const x = p % w;
      if (x > 0) encolar(p - 1);
      if (x < w - 1) encolar(p + 1);
      if (p >= w) encolar(p - w);
      if (p < w * (h - 1)) encolar(p + w);
    }
  }

  const resultado = { data: salida, width: w, height: h };
  return op.recortar ? recortarTransparencia(resultado) : resultado;
}

/** Recorta los márgenes completamente transparentes y deja un pequeño respiro alrededor del dibujo. */
export function recortarTransparencia(img: Pixeles): Pixeles {
  const { width: w, height: h, data } = img;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return img;
  const margen = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  minX = Math.max(0, minX - margen);
  minY = Math.max(0, minY - margen);
  maxX = Math.min(w - 1, maxX + margen);
  maxY = Math.min(h - 1, maxY + margen);
  const nw = maxX - minX + 1;
  const nh = maxY - minY + 1;
  const salida = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const desde = ((minY + y) * w + minX) * 4;
    salida.set(data.subarray(desde, desde + nw * 4), y * nw * 4);
  }
  return { data: salida, width: nw, height: nh };
}
