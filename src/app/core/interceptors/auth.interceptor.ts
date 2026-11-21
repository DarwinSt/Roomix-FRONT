import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Rutas de la API que no requieren token. */
const RUTAS_PUBLICAS = ['/auth/login', '/auth/recuperar', '/auth/restablecer'];

/**
 * Agrega el token JWT a las peticiones hacia la API y cierra la sesión si el
 * backend responde 401 (token vencido o usuario desactivado). Ante un 403 relee el perfil del usuario.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const esApi = req.url.startsWith(environment.apiUrl);
  const publica = RUTAS_PUBLICAS.some((r) => req.url.includes(r));

  const token = esApi && !publica ? auth.token() : null;
  const peticion = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (esApi && !publica && error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout('expirada');
      }
      // Sin permiso: quizá el administrador se lo quitó; se relee el perfil para que el menú se actualice
      if (esApi && !publica && error instanceof HttpErrorResponse && error.status === 403 && !req.url.endsWith('/auth/me')) {
        auth.revisarPerfil(10_000);
      }
      return throwError(() => error);
    }),
  );
};
