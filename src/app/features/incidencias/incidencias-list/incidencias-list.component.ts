import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { FechaRoomixPipe } from '../../../shared/pipes/fecha-roomix.pipe';

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
  ],
  templateUrl: './incidencias-list.component.html',
  styleUrl: './incidencias-list.component.scss',
})
export class IncidenciasListComponent implements OnInit {
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly incidencias = signal<Incidencia[]>([]);
  readonly busqueda = signal('');
  filtroEstado: EstadoIncidencia | '' = '';
  soloActivas = true;

  readonly incidenciasVisibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.incidencias().filter((i) => {
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

  cargar(): void {
    this.loading.set(true);
    this.incidenciaService
      .listar({
        estado: this.filtroEstado || undefined,
        activas: this.soloActivas ? true : undefined,
      })
      .subscribe({
        next: (data) => {
          this.incidencias.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }

  etiquetaEstado = etiquetaEstadoIncidencia;
  progreso = progresoIncidencia;
  resumen = resumenProgresoIncidencia;
  nivel = nivelProgresoIncidencia;

  ngOnInit(): void {
    this.cargar();
  }

  abrirCrear(): void {
    const ref = this.dialog.open(IncidenciaCrearDialogComponent, {
      data: {},
      width: '520px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.cargar();
    });
  }
}
