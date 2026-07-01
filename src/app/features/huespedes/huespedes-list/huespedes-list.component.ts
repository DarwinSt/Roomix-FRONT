import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HuespedService } from '../../../core/services/huesped.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { Huesped, documentoCompleto } from '../../../core/models/huesped.model';
import { etiquetaUltimaActualizacion, programarAutoRefresh } from '../../../core/utils/auto-refresh.util';

@Component({
  selector: 'app-huespedes-list',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './huespedes-list.component.html',
  styleUrl: './huespedes-list.component.scss',
})
export class HuespedesListComponent implements OnInit {
  private readonly huespedService = inject(HuespedService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly huespedes = signal<Huesped[]>([]);
  readonly busqueda = signal('');
  readonly ultimaActualizacion = signal<Date | null>(null);

  readonly documentoCompleto = documentoCompleto;

  readonly resumen = computed(() => {
    const list = this.huespedes();
    return {
      total: list.length,
      enHotel: list.filter((h) => h.habitacionActualNumero).length,
      disponibles: list.filter((h) => !h.habitacionActualNumero).length,
    };
  });

  readonly huespedesVisibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    if (!q) return this.huespedes();
    return this.huespedes().filter(
      (h) =>
        h.nombreCompleto.toLowerCase().includes(q) ||
        h.numeroDocumento.toLowerCase().includes(q) ||
        h.email.toLowerCase().includes(q) ||
        h.telefono.includes(q),
    );
  });

  readonly etiquetaSync = computed(() => etiquetaUltimaActualizacion(this.ultimaActualizacion()));

  ngOnInit(): void {
    this.cargar(true);
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cargar(mostrarLoading: boolean): void {
    if (mostrarLoading) this.loading.set(true);
    this.huespedService.listar({ activo: true }).subscribe({
      next: (data) => {
        this.huespedes.set(data);
        this.ultimaActualizacion.set(new Date());
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }
}
