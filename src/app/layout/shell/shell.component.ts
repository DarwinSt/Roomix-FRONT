import { Component, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter, map, shareReplay } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { ROOMIX_LOGO_ICON_URL, ROOMIX_LOGO_URL } from '../../core/config/brand.config';
import { environment } from '../../../environments/environment';
import { ROOMIX_BEDROOM_ICON_URL, ROOMIX_INVENTORY_ICON_URL, ROOMIX_LIST_ICON_URL } from '../../core/config/icons.config';

interface NavItem {
  path: string;
  label: string;
  icon?: string;
  iconUrl?: string;
}

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
    AsyncPipe,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly drawer = viewChild.required<MatSidenav>('drawer');

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
        if (this.esHandset) {
          this.drawer().close();
        }
      });
  }

  readonly navItems: NavItem[] = [
    { path: '/inicio', icon: 'dashboard', label: 'Inicio' },
    { path: '/habitaciones', iconUrl: ROOMIX_BEDROOM_ICON_URL, label: 'Habitaciones' },
    { path: '/reservas', icon: 'event_note', label: 'Reservas' },
    { path: '/incidencias', icon: 'report_problem', label: 'Incidencias' },
    { path: '/huespedes', icon: 'person', label: 'Huéspedes' },
    { path: '/personal', icon: 'groups', label: 'Personal' },
    { path: '/inventario', iconUrl: ROOMIX_INVENTORY_ICON_URL, label: 'Inventario' },
    { path: '/inventario/categorias', iconUrl: ROOMIX_LIST_ICON_URL, label: 'Categorías' },
  ];
}
