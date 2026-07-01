import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IncidenciaCrearDialogComponent } from '../incidencia-crear-dialog/incidencia-crear-dialog.component';
import { IncidenciaService } from '../../../core/services/incidencia.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { EstadoIncidencia, Incidencia } from '../../../core/models/incidencia.model';
import {
  etiquetaEstadoIncidencia,
  nivelProgresoIncidencia,
  progresoIncidencia,
  resumenProgresoIncidencia,
} from '../../../core/utils/incidencia-progreso.util';
import { siguienteAccionIncidencia } from '../../../core/utils/incidencia-accion.util';
import { etiquetaUltimaActualizacion, programarAutoRefresh } from '../../../core/utils/auto-refresh.util';
import { etiquetaContextoLimpieza } from '../../../core/utils/servicios-habitacion.util';
import { FechaRoomixPipe } from '../../../shared/pipes/fecha-roomix.pipe';

type FiltroRapido = '' | 'sin-asignar' | 'habitacion' | 'zona-comun';

@Component({
  selector: 'app-incidencias-list',
  imports: [
    FormsModule,
    RouterLink,
    FechaRoomixPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './incidencias-list.component.html',
  styleUrl: './incidencias-list.component.scss',
})
export class IncidenciasListComponent implements OnInit {
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly incidencias = signal<Incidencia[]>([]);
  readonly busqueda = signal('');
  readonly ultimaActualizacion = signal<Date | null>(null);

  filtroEstado: EstadoIncidencia | '' = '';
  filtroRapido: FiltroRapido = '';
  soloActivas = true;

  readonly incidenciasVisibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.incidencias().filter((i) => {
      if (this.filtroRapido === 'sin-asignar' && i.estado !== 'CREADA') return false;
      if (this.filtroRapido === 'habitacion' && i.alcance !== 'HABITACION') return false;
      if (this.filtroRapido === 'zona-comun' && i.alcance !== 'ZONA_COMUN') return false;
      if (this.filtroEstado && i.estado !== this.filtroEstado) return false;

      if (q) {
        const match =
          i.titulo.toLowerCase().includes(q) ||
          i.ubicacionEtiqueta.toLowerCase().includes(q) ||
          (i.habitacionNumero?.toLowerCase().includes(q) ?? false) ||
          (i.ubicacion?.toLowerCase().includes(q) ?? false) ||
          (i.personalAsignadoNombre?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      return true;
    });
  });

  readonly etiquetaSync = computed(() => etiquetaUltimaActualizacion(this.ultimaActualizacion()));

  etiquetaEstado = etiquetaEstadoIncidencia;
  progreso = progresoIncidencia;
  resumen = resumenProgresoIncidencia;
  nivel = nivelProgresoIncidencia;
  siguienteAccion = siguienteAccionIncidencia;
  etiquetaContexto = etiquetaContextoLimpieza;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const vista = params.get('vista') as FiltroRapido | null;
      if (vista === 'sin-asignar' || vista === 'habitacion' || vista === 'zona-comun') {
        this.filtroRapido = vista;
      }
      this.cargar(true);
    });
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cargar(mostrarLoading: boolean): void {
    if (mostrarLoading) this.loading.set(true);

    this.incidenciaService
      .listar({
        activas: this.soloActivas ? true : undefined,
      })
      .subscribe({
        next: (data) => {
          this.incidencias.set(data);
          this.ultimaActualizacion.set(new Date());
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }

  setFiltroRapido(filtro: FiltroRapido): void {
    this.filtroRapido = this.filtroRapido === filtro ? '' : filtro;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vista: this.filtroRapido || null },
      queryParamsHandling: 'merge',
    });
  }

  onSoloActivasChange(): void {
    this.cargar(true);
  }

  abrirCrear(): void {
    const ref = this.dialog.open(IncidenciaCrearDialogComponent, {
      data: {},
      width: '520px',
      maxWidth: '95vw',
      panelClass: 'roomix-servicio-dialog',
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.cargar(true);
    });
  }
}
