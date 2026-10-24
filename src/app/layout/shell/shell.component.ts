import { Component, computed, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavContent, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter, map, shareReplay } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { ROOMIX_LOGO_ICON_URL, ROOMIX_LOGO_URL } from '../../core/config/brand.config';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ItemNavegacion, navegacionPara } from '../../core/config/navegacion.config';
import { etiquetaRol } from '../../core/models/auth.model';

const GRUPOS: { clave: ItemNavegacion['grupo']; titulo: string }[] = [
  { clave: 'operacion', titulo: 'Operación' },
  { clave: 'gestion', titulo: 'Gestión' },
  { clave: 'administracion', titulo: 'Sistema' },
];

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    AsyncPipe,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly drawer = viewChild.required<MatSidenav>('drawer');
  private readonly contenido = viewChild(MatSidenavContent);

  readonly logoUrl = ROOMIX_LOGO_URL;
  readonly logoIconUrl = ROOMIX_LOGO_ICON_URL;
  /** Swagger del backend configurado (local, producción o APK). */
  readonly apiDocsUrl = environment.apiUrl.replace(/\/api\/?$/, '') + '/swagger-ui.html';

  /** Teléfonos y tablets (horizontal o vertical): menú superpuesto en lugar de fijo. */
  readonly isHandset$ = this.breakpointObserver.observe('(max-width: 1023.98px)').pipe(
    map((r) => r.matches),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private esHandset = false;

  constructor() {
    this.isHandset$.pipe(takeUntilDestroyed()).subscribe((handset) => (this.esHandset = handset));

    // En modo superpuesto el menú tapa el contenido: se cierra al navegar
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        // El contenido tiene su propio scroll: cada pantalla nueva empieza arriba
        this.contenido()?.scrollTo({ top: 0 });
        if (this.esHandset) {
          this.drawer().close();
        }
      });
  }

  private readonly auth = inject(AuthService);
  readonly usuario = this.auth.usuario;
  readonly rolNombre = computed(() => etiquetaRol(this.usuario()?.rol));
  readonly iniciales = computed(() =>
    (this.usuario()?.nombreCompleto ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join(''),
  );

  /** Menú lateral: solo los módulos del rol, agrupados. */
  readonly grupos = computed(() => {
    const items = navegacionPara(this.auth.rol());
    return GRUPOS.map((g) => ({ ...g, items: items.filter((i) => i.grupo === g.clave) })).filter((g) => g.items.length > 0);
  });

  cerrarSesion(): void {
    this.auth.logout();
  }
}
