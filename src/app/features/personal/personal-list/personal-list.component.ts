import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { PersonalDialogComponent } from '../personal-dialog/personal-dialog.component';
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
    MatCheckboxModule,
    MatTooltipModule,
    FormsModule,
  ],
  templateUrl: './personal-list.component.html',
  styleUrl: './personal-list.component.scss',
})
export class PersonalListComponent implements OnInit {
  private readonly incidenciaService = inject(IncidenciaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  /** Altas, ediciones y bajas de personal: solo administración (igual que el backend) */
  readonly esAdmin = computed(() => this.auth.tieneRol('ADMIN'));
  verInactivos = false;

  readonly loading = signal(true);
  readonly personal = signal<Personal[]>([]);
  readonly ultimaActualizacion = signal<Date | null>(null);

  readonly resumen = computed(() => {
    const list = this.personal();
    return {
      total: list.filter((p) => p.activo).length,
      ocupados: list.filter((p) => p.activo && p.ocupado).length,
      libres: list.filter((p) => p.activo && !p.ocupado).length,
    };
  });

  readonly etiquetaSync = computed(() => etiquetaUltimaActualizacion(this.ultimaActualizacion()));

  ngOnInit(): void {
    this.cargar(true);
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cargar(mostrarLoading: boolean): void {
    if (mostrarLoading) this.loading.set(true);

    this.incidenciaService.listarPersonal(this.verInactivos ? null : true).subscribe({
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

  editar(p: Personal | null): void {
    this.dialog
      .open(PersonalDialogComponent, { ...roomixDialogConfig({ width: '520px' }), data: p })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.snack.open(p ? 'Datos actualizados' : 'Persona registrada', 'OK', { duration: 2500 });
          this.cargar(false);
        }
      });
  }

  cambiarActivo(p: Personal): void {
    const activar = !p.activo;
    this.dialog
      .open(ConfirmDialogComponent, {
        ...roomixDialogConfig({ width: '420px' }),
        data: {
          title: activar ? 'Reactivar personal' : 'Desactivar personal',
          message: activar
            ? `${p.nombre} volverá a estar disponible para asignarle tareas.`
            : `${p.nombre} dejará de aparecer para asignar tareas. Su historial se conserva.`,
          confirmLabel: activar ? 'Reactivar' : 'Desactivar',
          warn: !activar,
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.incidenciaService.cambiarActivoPersonal(p.id, activar).subscribe({
          next: () => this.cargar(false),
          error: (e) => this.errorDialog.mostrarDesdeApi(e),
        });
      });
  }
}
