import { Pixeles, colorDeFondo, quitarFondo, recortarTransparencia } from './quitar-fondo';

/** Imagen de prueba: fondo de un color, un recuadro de otro color y, opcionalmente, un hueco del color del fondo dentro. */
function imagen(w: number, h: number, fondo: number[], dibujo: number[], hueco = false): Pixeles {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dentro = x >= 3 && x < w - 3 && y >= 3 && y < h - 3;
      const enHueco = hueco && x >= 5 && x < w - 5 && y >= 5 && y < h - 5;
      const c = dentro && !enHueco ? dibujo : fondo;
      data.set([c[0], c[1], c[2], 255], (y * w + x) * 4);
    }
  }
  return { data, width: w, height: h };
}

const alfa = (img: Pixeles, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];

describe('Quitar el fondo del logo', () => {
  it('detecta el color de fondo por los bordes', () => {
    expect(colorDeFondo(imagen(12, 12, [250, 250, 250], [20, 80, 160]))).toEqual([250, 250, 250]);
  });

  it('vuelve transparente el fondo y conserva el dibujo', () => {
    const r = quitarFondo(imagen(12, 12, [255, 255, 255], [20, 80, 160]), { tolerancia: 20, incluirInterior: false, recortar: false });
    expect(alfa(r, 0, 0)).toBe(0);
    expect(alfa(r, 11, 11)).toBe(0);
    expect(alfa(r, 6, 6)).toBe(255);
  });

  it('por defecto no borra el blanco que está dentro del dibujo (como el hueco de una «o»)', () => {
    const img = imagen(14, 14, [255, 255, 255], [0, 0, 0], true);
    const soloBorde = quitarFondo(img, { tolerancia: 20, incluirInterior: false, recortar: false });
    expect(alfa(soloBorde, 7, 7)).toBe(255);
    const todo = quitarFondo(img, { tolerancia: 20, incluirInterior: true, recortar: false });
    expect(alfa(todo, 7, 7)).toBe(0);
  });

  it('respeta la tolerancia: un fondo casi blanco solo se quita si se sube', () => {
    const img = imagen(12, 12, [235, 235, 235], [20, 80, 160]);
    // El fondo es el color de referencia: siempre se quita. Un gris del dibujo cercano solo con tolerancia alta.
    const gris = imagen(12, 12, [255, 255, 255], [200, 200, 200]);
    expect(alfa(quitarFondo(img, { tolerancia: 5, incluirInterior: false, recortar: false }), 0, 0)).toBe(0);
    expect(alfa(quitarFondo(gris, { tolerancia: 5, incluirInterior: true, recortar: false }), 6, 6)).toBe(255);
    expect(alfa(quitarFondo(gris, { tolerancia: 60, incluirInterior: true, recortar: false }), 6, 6)).toBe(0);
  });

  it('no modifica la imagen original', () => {
    const img = imagen(12, 12, [255, 255, 255], [20, 80, 160]);
    quitarFondo(img, { tolerancia: 30, incluirInterior: true, recortar: true });
    expect(alfa(img, 0, 0)).toBe(255);
  });

  it('recorta los márgenes transparentes', () => {
    const r = quitarFondo(imagen(20, 20, [255, 255, 255], [20, 80, 160]), { tolerancia: 20, incluirInterior: false, recortar: true });
    expect(r.width).toBeLessThan(20);
    expect(r.height).toBeLessThan(20);
    expect(alfa(r, Math.floor(r.width / 2), Math.floor(r.height / 2))).toBe(255);
  });

  it('si todo queda transparente no recorta a nada', () => {
    const vacia = { data: new Uint8ClampedArray(4 * 4 * 4), width: 4, height: 4 };
    expect(recortarTransparencia(vacia)).toBe(vacia);
  });
});
