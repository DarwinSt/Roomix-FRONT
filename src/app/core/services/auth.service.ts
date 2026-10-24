import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, MensajeResponse, Rol, Usuario } from '../models/auth.model';

interface Sesion {
  token: string;
  expiraEn: string;
  usuario: Usuario;
}

const CLAVE_SESION = 'roomix.sesion';

/**
 * Sesión del usuario: token JWT, perfil y rol. Se guarda en localStorage para que
 * la sesión sobreviva a recargas (y al cierre de la app Android) hasta que expire.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly sesion = signal<Sesion | null>(this.leerSesion());

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly rol = computed<Rol | null>(() => this.sesion()?.usuario.rol ?? null);
  readonly autenticado = computed(() => this.sesion() !== null);

  token(): string | null {
    const s = this.sesion();
    if (!s) return null;
    if (new Date(s.expiraEn).getTime() <= Date.now()) {
      this.limpiar();
      return null;
    }
    return s.token;
  }

  estaAutenticado(): boolean {
    return this.token() !== null;
  }

  tieneRol(...roles: Rol[]): boolean {
    const rol = this.rol();
    return rol !== null && (roles.length === 0 || roles.includes(rol));
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap((r) => this.guardar({ token: r.token, expiraEn: r.expiraEn, usuario: r.usuario })),
    );
  }

  /** Cierra la sesión local y vuelve al login. */
  logout(motivo?: 'expirada'): void {
    this.limpiar();
    this.router.navigate(['/login'], { queryParams: motivo ? { motivo } : {} });
  }

  recargarPerfil(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.baseUrl}/me`).pipe(
      tap((usuario) => {
        const s = this.sesion();
        if (s) this.guardar({ ...s, usuario });
      }),
    );
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<MensajeResponse> {
    return this.http
      .post<MensajeResponse>(`${this.baseUrl}/cambiar-password`, { passwordActual, passwordNueva })
      .pipe(
        tap(() => {
          const s = this.sesion();
          if (s) this.guardar({ ...s, usuario: { ...s.usuario, debeCambiarPassword: false } });
        }),
      );
  }

  recuperar(email: string): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.baseUrl}/recuperar`, { email });
  }

  restablecer(token: string, passwordNueva: string): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.baseUrl}/restablecer`, { token, passwordNueva });
  }

  private guardar(sesion: Sesion): void {
    this.sesion.set(sesion);
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    } catch {
      /* almacenamiento no disponible: la sesión dura mientras la pestaña esté abierta */
    }
  }

  private limpiar(): void {
    this.sesion.set(null);
    try {
      localStorage.removeItem(CLAVE_SESION);
    } catch {
      /* sin almacenamiento */
    }
  }

  private leerSesion(): Sesion | null {
    try {
      const raw = localStorage.getItem(CLAVE_SESION);
      if (!raw) return null;
      const s = JSON.parse(raw) as Sesion;
      if (new Date(s.expiraEn).getTime() > Date.now()) return s;
      localStorage.removeItem(CLAVE_SESION); // sesión vencida: no se deja el token guardado
      return null;
    } catch {
      return null;
    }
  }
}
