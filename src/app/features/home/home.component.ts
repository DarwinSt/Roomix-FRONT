import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ROOMIX_LOGO_URL } from '../../core/config/brand.config';
import { ROOMIX_BEDROOM_ICON_URL, ROOMIX_INVENTORY_ICON_URL } from '../../core/config/icons.config';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly logoUrl = ROOMIX_LOGO_URL;
  readonly bedroomIconUrl = ROOMIX_BEDROOM_ICON_URL;
  readonly inventoryIconUrl = ROOMIX_INVENTORY_ICON_URL;
}
