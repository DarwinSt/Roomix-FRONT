import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from './services/auth.service';
import { authGuard, invitadoGuard, rolGuard } from './guards/auth.guard';
import { authInterceptor } from './interceptors/auth.interceptor';
import { NAVEGACION, navegacionPara } from './config/navegacion.config';
import { PATRON_PASSWORD, Rol, Usuario } from './models/auth.model';

const CLAVE = 'roomix.sesion';

@Component({ template: '' })
class VaciaComponent {}

function usuario(rol: Rol, extra: Partial<Usuario> = {}): Usuario {
  return {
    id: 1,
    username: rol.toLowerCase(),
    nombreCompleto: 'Usuario Prueba',
    email: 'prueba@roomix.test',
    rol,
    rolNombre: rol,
    activo: true,
    debeCambiarPassword: false,
    ultimoAcceso: null,
    fechaHoraCreacion: '2026-01-01T00:00:00',
    ...extra,
  };
}

/** Guarda una sesión en localStorage antes de crear el AuthService. */
function iniciarSesion(rol: Rol, extra: Partial<Usuario> = {}, horas = 8): void {
  localStorage.setItem(
    CLAVE,
    JSON.stringify({ token: 'token-prueba', expiraEn: new Date(Date.now() + horas * 3_600_000).toISOString(), usuario: usuario(rol, extra) }),
  );
}

function configurar(): void {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', component: VaciaComponent }]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
  });
}

const estado = (url: string) => ({ url }) as RouterStateSnapshot;
const rutaConRoles = (roles: Rol[]) => ({ data: { roles } }) as unknown as ActivatedRouteSnapshot;
const ejecutar = <T>(fn: () => T) => TestBed.runInInjectionContext(fn);
const ruta = (r: unknown) => (r instanceof UrlTree ? TestBed.inject(Router).serializeUrl(r) : r);

describe('Autenticación y autorización (frontend)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  describe('AuthService', () => {
    it('sin sesión no está autenticado ni tiene rol', () => {
      configurar();
      const auth = TestBed.inject(AuthService);
      expect(auth.estaAutenticado()).toBe(false);
      expect(auth.tieneRol('ADMIN')).toBe(false);
    });

    it('recupera la sesión guardada y evalúa los roles', () => {
      iniciarSesion('RECEPCION');
      configurar();
      const auth = TestBed.inject(AuthService);
      expect(auth.estaAutenticado()).toBe(true);
      expect(auth.tieneRol('ADMIN', 'RECEPCION')).toBe(true);
      expect(auth.tieneRol('FINANZAS')).toBe(false);
    });

    it('descarta una sesión vencida', () => {
      iniciarSesion('ADMIN', {}, -1);
      configurar();
      const auth = TestBed.inject(AuthService);
      expect(auth.token()).toBeNull();
      expect(localStorage.getItem(CLAVE)).toBeNull();
    });
  });

  describe('Guards de ruta', () => {
    it('authGuard redirige al login conservando la ruta solicitada', () => {
      configurar();
      expect(ruta(ejecutar(() => authGuard({} as ActivatedRouteSnapshot, estado('/finanzas'))))).toBe('/login?volver=%2Ffinanzas');
    });

    it('authGuard obliga a cambiar la contraseña temporal', () => {
      iniciarSesion('RECEPCION', { debeCambiarPassword: true });
      configurar();
      expect(ruta(ejecutar(() => authGuard({} as ActivatedRouteSnapshot, estado('/reservas'))))).toBe('/cambiar-password');
      expect(ejecutar(() => authGuard({} as ActivatedRouteSnapshot, estado('/cambiar-password')))).toBe(true);
    });

    it('rolGuard permite el acceso solo a los roles de la ruta', () => {
      iniciarSesion('HOUSEKEEPING');
      configurar();
      expect(ejecutar(() => rolGuard(rutaConRoles(['ADMIN', 'HOUSEKEEPING']), estado('/incidencias')))).toBe(true);
      expect(ruta(ejecutar(() => rolGuard(rutaConRoles(['ADMIN', 'FINANZAS']), estado('/finanzas'))))).toBe('/inicio?sinPermiso=1');
    });

    it('invitadoGuard envía al inicio si ya hay sesión', () => {
      iniciarSesion('ADMIN');
      configurar();
      expect(ruta(ejecutar(() => invitadoGuard({} as ActivatedRouteSnapshot, estado('/login'))))).toBe('/inicio');
    });
  });

  describe('Interceptor JWT', () => {
    it('agrega el token Bearer a la API pero no al login', () => {
      iniciarSesion('ADMIN');
      configurar();
      const http = TestBed.inject(HttpClient);
      const ctrl = TestBed.inject(HttpTestingController);

      http.get(`${environment.apiUrl}/habitaciones`).subscribe();
      http.post(`${environment.apiUrl}/auth/login`, {}).subscribe();

      expect(ctrl.expectOne(`${environment.apiUrl}/habitaciones`).request.headers.get('Authorization')).toBe('Bearer token-prueba');
      expect(ctrl.expectOne(`${environment.apiUrl}/auth/login`).request.headers.has('Authorization')).toBe(false);
      ctrl.verify();
    });

    it('cierra la sesión cuando la API responde 401', () => {
      iniciarSesion('ADMIN');
      configurar();
      const http = TestBed.inject(HttpClient);
      const ctrl = TestBed.inject(HttpTestingController);
      const auth = TestBed.inject(AuthService);

      http.get(`${environment.apiUrl}/dashboard`).subscribe({ error: () => undefined });
      ctrl.expectOne(`${environment.apiUrl}/dashboard`).flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(auth.estaAutenticado()).toBe(false);
      expect(localStorage.getItem(CLAVE)).toBeNull();
    });
  });

  describe('Menú por rol', () => {
    it('cada rol ve solo sus módulos', () => {
      const rutas = (rol: Rol) => navegacionPara(rol).map((i) => i.path);
      expect(rutas('ADMIN')).toHaveLength(NAVEGACION.length);
      expect(rutas('ALMACEN')).toContain('/inventario');
      expect(rutas('ALMACEN')).not.toContain('/finanzas');
      expect(rutas('FINANZAS')).toContain('/reportes');
      expect(rutas('HOUSEKEEPING')).not.toContain('/usuarios');
      expect(navegacionPara(null)).toEqual([]);
    });
  });

  describe('Política de contraseñas', () => {
    it('exige 8 caracteres con mayúscula, minúscula y número', () => {
      const valida = (p: string) => new RegExp(PATRON_PASSWORD).test(p);
      expect(valida('Roomix2026')).toBe(true);
      expect(valida('roomix2026')).toBe(false);
      expect(valida('ROOMIX2026')).toBe(false);
      expect(valida('Roomix')).toBe(false);
    });
  });
});
