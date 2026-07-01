import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, shareReplay } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { ROOMIX_LOGO_ICON_URL, ROOMIX_LOGO_URL } from '../../core/config/brand.config';
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

  readonly logoUrl = ROOMIX_LOGO_URL;
  readonly logoIconUrl = ROOMIX_LOGO_ICON_URL;

  readonly isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((r) => r.matches),
    shareReplay(),
  );

  readonly navItems: NavItem[] = [
    { path: '/inicio', icon: 'dashboard', label: 'Inicio' },
    { path: '/habitaciones', iconUrl: ROOMIX_BEDROOM_ICON_URL, label: 'Habitaciones' },
    { path: '/incidencias', icon: 'report_problem', label: 'Incidencias' },
    { path: '/personal', icon: 'groups', label: 'Personal' },
    { path: '/inventario', iconUrl: ROOMIX_INVENTORY_ICON_URL, label: 'Inventario' },
    { path: '/inventario/categorias', iconUrl: ROOMIX_LIST_ICON_URL, label: 'Categorías' },
  ];
}
