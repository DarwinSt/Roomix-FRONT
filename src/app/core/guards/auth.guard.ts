import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/auth.model';
import { Permiso } from '../models/permisos.model';
import { AuthService } from '../services/auth.service';

/** Exige sesión iniciada; si la contraseña es temporal, obliga a cambiarla primero. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaAutenticado()) {
    return router.createUrlTree(['/login'], { queryParams: { volver: state.url } });
  }
  if (auth.usuario()?.debeCambiarPassword && !state.url.startsWith('/cambiar-password')) {
    return router.createUrlTree(['/cambiar-password']);
  }
  return true;
};

/**
 * Restringe una ruta a los roles indicados en `data.roles`. Sin roles, cualquier usuario autenticado.
 * El backend aplica las mismas reglas; esto solo evita mostrar pantallas que responderían 403.
 */
export const rolGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data?.['roles'] as Rol[] | undefined) ?? [];
  if (roles.length === 0 || auth.tieneRol(...roles)) {
    return true;
  }
  return router.createUrlTree(['/inicio'], { queryParams: { sinPermiso: 1 } });
};

/**
 * Restringe una ruta al permiso de `data.permiso` (y a que su módulo esté licenciado). El backend aplica las mismas
 * reglas; esto solo evita mostrar pantallas que responderían 403.
 */
export const permisoGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const permisos = (route.data?.['permisos'] as Permiso[] | undefined) ?? [];
  if (permisos.length === 0 || auth.puede(...permisos)) {
    return true;
  }
  return router.createUrlTree(['/inicio'], { queryParams: { sinPermiso: 1 } });
};

/** Para login y recuperación: si ya hay sesión, va al inicio. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.estaAutenticado() ? router.createUrlTree(['/inicio']) : true;
};
