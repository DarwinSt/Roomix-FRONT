import { TestBed } from '@angular/core/testing';
import { COLORES_ROOMIX, PALETAS, TemaService, contraste, esColor, paleta } from './tema.service';

describe('Paleta del hotel (TemaService)', () => {
  afterEach(() => document.documentElement.removeAttribute('style'));

  it('mide el contraste como la WCAG (negro sobre blanco es 21:1)', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contraste('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('reconoce solo colores #RRGGBB', () => {
    expect(esColor('#1e3a5f')).toBe(true);
    expect(esColor('#1E3A5F')).toBe(true);
    expect(esColor('azul')).toBe(false);
    expect(esColor('#fff')).toBe(false);
    expect(esColor(null)).toBe(false);
  });

  it('oscurece un color principal muy claro para que el texto blanco de los botones se lea (AA)', () => {
    const vars = paleta('#f7e27a', COLORES_ROOMIX.acento);
    expect(contraste(vars['--primary-300'], '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('todas las paletas listas cumplen el contraste en los botones', () => {
    for (const p of PALETAS) {
      expect(contraste(paleta(p.primario, p.acento)['--primary-300'], '#ffffff'), p.nombre).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('la escala va de claro a oscuro y trae el color en r, g, b para transparencias', () => {
    const v = paleta('#1f5fa8', '#f0a830');
    const luz = (hex: string) => contraste(hex, '#000000');
    expect(luz(v['--primary-100'])).toBeGreaterThan(luz(v['--primary-200']));
    expect(luz(v['--primary-200'])).toBeGreaterThan(luz(v['--primary-300']));
    expect(luz(v['--primary-300'])).toBeGreaterThan(luz(v['--primary-400']));
    expect(v['--primary-300-rgb']).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/);
  });

  it('aplica los colores del hotel en la página y los quita al volver a los de Roomix', () => {
    const tema = TestBed.inject(TemaService);
    const raiz = document.documentElement.style;
    tema.aplicar('#8a2846', '#e8b04a');
    expect(raiz.getPropertyValue('--primary-300')).not.toBe('');
    expect(raiz.getPropertyValue('--mat-sys-primary')).toBe(raiz.getPropertyValue('--primary-300'));
    tema.aplicar(null, null);
    expect(raiz.getPropertyValue('--primary-300')).toBe('');
  });
});
