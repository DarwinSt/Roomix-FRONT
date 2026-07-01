import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { IncidenciaService } from '../../../core/services/incidencia.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { EstadoIncidencia, Incidencia, Personal } from '../../../core/models/incidencia.model';
import {
  etiquetaEstadoIncidencia,
  nivelProgresoIncidencia,
  progresoIncidencia,
  resumenProgresoIncidencia,
} from '../../../core/utils/incidencia-progreso.util';
import { etiquetaContextoLimpieza } from '../../../core/utils/servicios-habitacion.util';
import { FechaRoomixPipe } from '../../../shared/pipes/fecha-roomix.pipe';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-incidencia-detail',
  imports: [
    FormsModule,
    RouterLink,
    FechaRoomixPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './incidencia-detail.component.html',
  styleUrl: './incidencia-detail.component.scss',
})
export class IncidenciaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly incidencia = signal<Incidencia | null>(null);
  readonly personal = signal<Personal[]>([]);
  personalSeleccionado: number | null = null;

  etiquetaEstado = etiquetaEstadoIncidencia;
  etiquetaContexto = etiquetaContextoLimpieza;
  progreso = progresoIncidencia;
  resumen = resumenProgresoIncidencia;
  nivel = nivelProgresoIncidencia;

  readonly pasosFlujo: { estado: EstadoIncidencia; label: string }[] = [
    { estado: 'CREADA', label: 'Creada' },
    { estado: 'ASIGNADA', label: 'Asignada' },
    { estado: 'EN_PROGRESO', label: 'En progreso' },
    { estado: 'FINALIZADA', label: 'Finalizada' },
  ];

  ordenEstado(estado: EstadoIncidencia): number {
    const orden: Record<EstadoIncidencia, number> = {
      CREADA: 0,
      ASIGNADA: 1,
      EN_PROGRESO: 2,
      FINALIZADA: 3,
      CANCELADA: -1,
    };
    return orden[estado];
  }

  pasoCompletado(estadoActual: EstadoIncidencia, paso: EstadoIncidencia): boolean {
    return this.ordenEstado(estadoActual) > this.ordenEstado(paso);
  }

  pasoActivo(estadoActual: EstadoIncidencia, paso: EstadoIncidencia): boolean {
    return estadoActual === paso;
  }

  ngOnInit(): void {
    this.incidenciaService.listarPersonal().subscribe({
      next: (p) => this.personal.set(p),
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) this.cargar(id);
    });
  }

  cargar(id: number): void {
    this.loading.set(true);
    this.incidenciaService.obtener(id).subscribe({
      next: (data) => {
        this.incidencia.set(data);
        this.personalSeleccionado = data.personalAsignadoId;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }

  asignar(): void {
    const inc = this.incidencia();
    if (!inc || !this.personalSeleccionado) return;
    this.incidenciaService.asignar(inc.id, { personalId: this.personalSeleccionado }).subscribe({
      next: (data) => {
        this.incidencia.set(data);
        this.snackBar.open('Personal asignado · 25% progreso', 'OK', { duration: 3000 });
      },
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
  }

  iniciar(): void {
    const inc = this.incidencia();
    if (!inc) return;
    this.incidenciaService.iniciar(inc.id).subscribe({
      next: (data) => {
        this.incidencia.set(data);
        this.snackBar.open('Servicio iniciado en habitación · 50% progreso', 'OK', { duration: 3000 });
      },
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
  }

  toggleTarea(tareaId: number, completada: boolean): void {
    const inc = this.incidencia();
    if (!inc) return;
    this.incidenciaService.actualizarTarea(inc.id, tareaId, { completada }).subscribe({
      next: (data) => this.incidencia.set(data),
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
  }

  finalizar(): void {
    const inc = this.incidencia();
    if (!inc) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Finalizar incidencia',
        message: '¿Confirmar que el servicio fue completado? La habitación volverá a su estado operativo.',
        confirmLabel: 'Finalizar servicio',
        icon: 'task_alt',
      },
      width: '440px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.incidenciaService.finalizar(inc.id).subscribe({
        next: (data) => {
          this.incidencia.set(data);
          this.snackBar.open('Incidencia finalizada · habitación actualizada', 'OK', { duration: 3500 });
        },
        error: (err) => this.errorDialog.mostrarDesdeApi(err),
      });
    });
  }

  cancelar(): void {
    const inc = this.incidencia();
    if (!inc) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancelar incidencia',
        message: '¿Cancelar esta incidencia? La habitación no cambiará de estado automáticamente.',
        confirmLabel: 'Cancelar incidencia',
        icon: 'cancel',
        warn: true,
      },
      width: '420px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.incidenciaService.cancelar(inc.id).subscribe({
        next: (data) => {
          this.incidencia.set(data);
          this.snackBar.open('Incidencia cancelada', 'OK', { duration: 3000 });
        },
        error: (err) => this.errorDialog.mostrarDesdeApi(err),
      });
    });
  }
}
