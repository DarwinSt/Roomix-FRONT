import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServicioHotelService } from '../../core/services/modulos.service';
import { ErrorDialogService } from '../../core/services/error-dialog.service';
import { AuthService } from '../../core/services/auth.service';
import { roomixDialogConfig } from '../../core/config/dialog.config';
import {
  CATEGORIAS_SERVICIO,
  EstadoSolicitud,
  ServicioCatalogo,
  SolicitudServicio,
  etiquetaEstadoSolicitud,
  iconoCategoriaServicio,
} from '../../core/models/servicio.model';
import { fechaCorta, hoyIso, moneda } from '../../core/utils/formato.util';
import { programarAutoRefresh } from '../../core/utils/auto-refresh.util';
import { MotivoDialogComponent } from '../../shared/dialogs/motivo-dialog/motivo-dialog.component';
import { AsignarSolicitudDialogComponent, CatalogoDialogComponent, SolicitudDialogComponent } from './servicio-dialogs.component';

type Filtro = 'activas' | 'hoy' | 'todas';

@Component({
  selector: 'app-servicios',
  imports: [RouterLink, MatButtonModule, MatButtonToggleModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule],
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.scss',
})
export class ServiciosComponent implements OnInit {
  private readonly service = inject(ServicioHotelService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly etiquetaEstado = etiquetaEstadoSolicitud;
  readonly icono = iconoCategoriaServicio;

  readonly vista = signal<'solicitudes' | 'catalogo'>('solicitudes');
  readonly filtro = signal<Filtro>('activas');
  readonly cargando = signal(true);
  readonly solicitudes = signal<SolicitudServicio[]>([]);
  readonly catalogo = signal<ServicioCatalogo[]>([]);

  readonly puedeSolicitar = computed(() => this.auth.tieneRol('ADMIN', 'RECEPCION'));
  readonly puedeGestionar = computed(() => this.auth.tieneRol('ADMIN', 'RECEPCION', 'HOUSEKEEPING', 'EVENTOS'));
  readonly puedeEditarCatalogo = computed(() => this.auth.tieneRol('ADMIN', 'EVENTOS'));

  readonly resumen = computed(() => {
    const s = this.solicitudes();
    return {
      pendientes: s.filter((x) => x.estado === 'SOLICITADA').length,
      enProceso: s.filter((x) => x.estado === 'EN_PROCESO').length,
      sinResponsable: s.filter((x) => !x.responsableId && (x.estado === 'SOLICITADA' || x.estado === 'EN_PROCESO')).length,
      valor: s.filter((x) => x.estado !== 'CANCELADA').reduce((t, x) => t + Number(x.total), 0),
    };
  });

  readonly catalogoPorCategoria = computed(() =>
    CATEGORIAS_SERVICIO.map((c) => ({ ...c, servicios: this.catalogo().filter((s) => s.categoria === c.value) })).filter(
      (c) => c.servicios.length > 0,
    ),
  );

  ngOnInit(): void {
    this.cargar(true);
    this.service.catalogo(false).subscribe((c) => this.catalogo.set(c));
    programarAutoRefresh(this.destroyRef, () => this.cargar(false));
  }

  cambiarFiltro(f: Filtro): void {
    this.filtro.set(f);
    this.cargar(true);
  }

  cargar(mostrar: boolean): void {
    if (mostrar) this.cargando.set(true);
    const f = this.filtro();
    this.service.solicitudes(f === 'activas' ? { activas: true } : f === 'hoy' ? { fecha: hoyIso() } : {}).subscribe({
      next: (s) => {
        this.solicitudes.set(s);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorDialog.mostrarDesdeApi(e);
      },
    });
  }

  nueva(): void {
    this.dialog
      .open(SolicitudDialogComponent, { ...roomixDialogConfig({ width: '600px' }), data: null })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.snack.open('Solicitud registrada y cargada a la cuenta', 'OK', { duration: 3000 });
          this.cargar(false);
        }
      });
  }

  asignar(s: SolicitudServicio): void {
    this.dialog
      .open(AsignarSolicitudDialogComponent, { ...roomixDialogConfig({ width: '480px' }), data: s })
      .afterClosed()
      .subscribe((ok) => ok && this.cargar(false));
  }

  cambiarEstado(s: SolicitudServicio, estado: EstadoSolicitud): void {
    if (estado === 'CANCELADA') {
      this.dialog
        .open(MotivoDialogComponent, {
          ...roomixDialogConfig({ width: '460px' }),
          data: { title: 'Cancelar solicitud', message: `${s.servicioNombre} para la habitación ${s.habitacionNumero}. El cargo se retira de la cuenta.`, confirmLabel: 'Cancelar solicitud' },
        })
        .afterClosed()
        .subscribe((motivo?: string) => motivo && this.enviarEstado(s, estado, motivo));
      return;
    }
    this.enviarEstado(s, estado);
  }

  private enviarEstado(s: SolicitudServicio, estado: EstadoSolicitud, motivo?: string): void {
    this.service.cambiarEstado(s.id, estado, motivo).subscribe({
      next: () => {
        this.snack.open(`Solicitud ${this.etiquetaEstado(estado).toLowerCase()}`, 'OK', { duration: 2500 });
        this.cargar(false);
      },
      error: (e) => this.errorDialog.mostrarDesdeApi(e),
    });
  }

  editarServicio(s: ServicioCatalogo | null): void {
    this.dialog
      .open(CatalogoDialogComponent, { ...roomixDialogConfig({ width: '560px' }), data: s })
      .afterClosed()
      .subscribe((ok) => ok && this.service.catalogo(false).subscribe((c) => this.catalogo.set(c)));
  }

  claseEstado(e: EstadoSolicitud): string {
    return { SOLICITADA: 'alerta', EN_PROCESO: 'info', COMPLETADA: 'ok', CANCELADA: 'critico' }[e];
  }
}
