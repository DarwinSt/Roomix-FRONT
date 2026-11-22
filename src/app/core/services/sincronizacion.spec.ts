import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ConfiguracionService } from './configuracion.service';
import { AuthService } from './auth.service';

const publica = (nombre: string) => ({
  nombre, tieneLogo: false, logoVersion: 1, modulos: ['CAJA', 'INVENTARIO'], modoCobro: 'POR_PERSONA', cobraIva: false,
  colorPrimario: null, colorAcento: null, eslogan: null,
});

describe('Datos al día sin volver a entrar', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('Configuración del hotel', () => {
    it('si el servidor tarda, la app arranca a los 2,5 s y aplica los datos cuando llegan', async () => {
      vi.useFakeTimers();
      const config = TestBed.inject(ConfiguracionService);
      const http = TestBed.inject(HttpTestingController);
      let listo = false;
      config.cargarAlIniciar().then(() => (listo = true));

      await vi.advanceTimersByTimeAsync(2600);
      expect(listo).toBe(true);
      expect(config.nombreHotel()).toBe('Roomix');

      // La respuesta llega tarde (Railway despertando): igual se aplica
      http.expectOne(`${environment.apiUrl}/configuracion/publica`).flush(publica('Hotel Mi Kinta'));
      expect(config.nombreHotel()).toBe('Hotel Mi Kinta');
      expect(config.porPersona()).toBe(true);
      expect(config.modulo('EVENTOS')).toBe(false);
    });

    it('al volver a la pestaña no pide de nuevo si acaba de hacerlo', () => {
      const config = TestBed.inject(ConfiguracionService);
      const http = TestBed.inject(HttpTestingController);
      config.refrescar(0);
      http.expectOne(`${environment.apiUrl}/configuracion/publica`).flush(publica('Hotel A'));
      config.refrescar(60_000);
      http.expectNone(`${environment.apiUrl}/configuracion/publica`);
      config.refrescar(0);
      http.expectOne(`${environment.apiUrl}/configuracion/publica`).flush(publica('Hotel B'));
      expect(config.nombreHotel()).toBe('Hotel B');
    });
  });

  describe('Permisos del usuario', () => {
    function iniciarSesion(permisos: string[]): void {
      localStorage.setItem('roomix.sesion', JSON.stringify({
        token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
        usuario: { id: 2, username: 'recepcion', nombreCompleto: 'Recepción', email: 'r@r.test', rol: 'RECEPCION', rolNombre: 'Recepción',
          activo: true, debeCambiarPassword: false, ultimoAcceso: null, fechaHoraCreacion: '2026-01-01T00:00:00', permisos },
      }));
    }

    it('relee el perfil y el menú refleja el permiso que quitó el administrador', () => {
      iniciarSesion(['CAJA_VER', 'CAJA_OPERAR', 'RESERVAS_VER']);
      const auth = TestBed.inject(AuthService);
      const http = TestBed.inject(HttpTestingController);
      expect(auth.puede('CAJA_VER')).toBe(true);

      auth.revisarPerfil(0);
      http.expectOne(`${environment.apiUrl}/auth/me`).flush({ id: 2, username: 'recepcion', rol: 'RECEPCION', permisos: ['RESERVAS_VER'] });
      expect(auth.puede('CAJA_VER')).toBe(false);
      expect(auth.puede('RESERVAS_VER')).toBe(true);
    });

    it('no relee el perfil más de una vez en el intervalo indicado', () => {
      iniciarSesion(['RESERVAS_VER']);
      const auth = TestBed.inject(AuthService);
      const http = TestBed.inject(HttpTestingController);
      auth.revisarPerfil(0);
      http.expectOne(`${environment.apiUrl}/auth/me`).flush({ id: 2, username: 'recepcion', rol: 'RECEPCION', permisos: ['RESERVAS_VER'] });
      auth.revisarPerfil(60_000);
      http.expectNone(`${environment.apiUrl}/auth/me`);
    });

    it('sin sesión no pide el perfil', () => {
      const auth = TestBed.inject(AuthService);
      const http = TestBed.inject(HttpTestingController);
      auth.revisarPerfil(0);
      http.expectNone(`${environment.apiUrl}/auth/me`);
    });
  });
});
