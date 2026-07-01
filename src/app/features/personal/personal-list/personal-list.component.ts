import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { IncidenciaService } from '../../../core/services/incidencia.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { Personal } from '../../../core/models/incidencia.model';
import { etiquetaUltimaActualizacion, programarAutoRefresh } from '../../../core/utils/auto-refresh.util';

@Component({
  selector: 'app-personal-list',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './personal-list.component.html',
  styleUrl: './personal-list.component.scss',
})
export class PersonalListComponent implements OnInit {
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly personal = signal<Personal[]>([]);
  readonly ultimaActualizacion = signal<Date | null>(null);

  readonly resumen = computed(() => {
    const list = this.personal();
    return {
      total: list.length,
      ocupados: list.filter((p) => p.ocupado).length,
      libres: list.filter((p) => !p.ocupado).length,
    };
  });

  readonly etiquetaSync = computed(() => etiquetaUltimaActualizacion(this.ultimaActualizacion()));

  ngOnInit(): void {
    this.cargar(true);
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cargar(mostrarLoading: boolean): void {
    if (mostrarLoading) this.loading.set(true);

    this.incidenciaService.listarPersonal(true).subscribe({
      next: (data) => {
        this.personal.set(data);
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
