import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AparienciaRequest, ConfiguracionHotel, ConfiguracionPublica, ConfiguracionRequest } from '../models/configuracion.model';
import { TemaService } from './tema.service';
import { HotelService } from './finanzas.service';
import { Modulo } from '../models/permisos.model';

const CLAVE = 'roomix.configuracion';
const TODOS: Modulo[] = ['CAJA', 'SERVICIOS', 'EVENTOS', 'INVENTARIO', 'REPORTES'];

/**
 * Marca y opciones del hotel (nombre, logo, módulos de la licencia, modo de cobro, IVA). Se carga al arrancar sin
 * necesidad de sesión y se guarda en el navegador para mostrarse de inmediato en la siguiente visita.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/configuracion`;
  private readonly tema = inject(TemaService);
  private readonly hotel = inject(HotelService);
  private readonly datos = signal<ConfiguracionPublica | null>(this.leer());

  readonly publica = this.datos.asReadonly();
  readonly nombreHotel = computed(() => this.datos()?.nombre ?? 'Roomix');
  readonly logoUrl = computed(() => {
    const d = this.datos();
    return d?.tieneLogo ? `${this.baseUrl}/logo?v=${d.logoVersion}` : null;
  });
  readonly porPersona = computed(() => this.datos()?.modoCobro === 'POR_PERSONA');
  readonly cobraIva = computed(() => this.datos()?.cobraIva ?? true);
  readonly eslogan = computed(() => this.datos()?.eslogan ?? null);

  constructor() {
    // Colores guardados de la visita anterior: se aplican antes de que responda el servidor (sin parpadeo)
    const d = this.datos();
    this.tema.aplicar(d?.colorPrimario, d?.colorAcento);
  }

  /** Si aún no hay datos (primer arranque sin conexión) se asumen todos los módulos. */
  modulo(m: Modulo): boolean {
    const d = this.datos();
    return d ? d.modulos.includes(m) : TODOS.includes(m);
  }

  private ultimaCarga = 0;

  /**
   * Al abrir la app se espera la configuración como máximo 2,5 s para no demorar la pantalla, pero la petición sigue:
   * si el servidor tarda (Railway al despertar), los datos llegan después y se aplican igual.
   */
  cargarAlIniciar(): Promise<void> {
    return new Promise<void>((resolve) => {
      const limite = setTimeout(resolve, 2500);
      this.refrescar(0, () => {
        clearTimeout(limite);
        resolve();
      });
    });
  }

  /** Vuelve a pedir la configuración si pasó al menos `minimoMs` desde la última vez (al volver a la pestaña, etc.). */
  refrescar(minimoMs = 60_000, alTerminar?: () => void): void {
    if (Date.now() - this.ultimaCarga < minimoMs) {
      alTerminar?.();
      return;
    }
    this.ultimaCarga = Date.now();
    this.cargar().subscribe({ next: () => alTerminar?.(), error: () => alTerminar?.() });
  }

  cargar(): Observable<ConfiguracionPublica | null> {
    return this.http.get<ConfiguracionPublica>(`${this.baseUrl}/publica`).pipe(
      tap((c) => this.guardar(c)),
      catchError(() => of(null)),
    );
  }

  detalle() {
    return this.http.get<ConfiguracionHotel>(this.baseUrl);
  }

  actualizar(body: ConfiguracionRequest) {
    return this.http.put<ConfiguracionHotel>(this.baseUrl, body).pipe(tap(() => this.cargar().subscribe()));
  }

  /** Colores de la interfaz y frase de bienvenida del hotel. */
  actualizarApariencia(body: AparienciaRequest) {
    return this.http.put<ConfiguracionHotel>(`${this.baseUrl}/apariencia`, body).pipe(tap(() => this.cargar().subscribe()));
  }

  /** Vuelve a pintar la interfaz con los colores guardados (al cancelar una vista previa). */
  restaurarTema(): void {
    const d = this.datos();
    this.tema.aplicar(d?.colorPrimario, d?.colorAcento);
  }

  subirLogo(archivo: File) {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<ConfiguracionHotel>(`${this.baseUrl}/logo`, form).pipe(tap(() => this.cargar().subscribe()));
  }

  eliminarLogo() {
    return this.http.delete<ConfiguracionHotel>(`${this.baseUrl}/logo`).pipe(tap(() => this.cargar().subscribe()));
  }

  ejecutarRetencion() {
    return this.http.post<{ anonimizados: number }>(`${this.baseUrl}/retencion/ejecutar`, {});
  }

  private guardar(c: ConfiguracionPublica): void {
    // Cambió algo del hotel (nombre, NIT, logo…): los datos para facturas y comprobantes se vuelven a pedir
    if (this.datos()?.logoVersion !== c.logoVersion) this.hotel.invalidar();
    this.datos.set(c);
    this.tema.aplicar(c.colorPrimario, c.colorAcento);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(c));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  private leer(): ConfiguracionPublica | null {
    try {
      const v = localStorage.getItem(CLAVE);
      return v ? (JSON.parse(v) as ConfiguracionPublica) : null;
    } catch {
      return null;
    }
  }
}
