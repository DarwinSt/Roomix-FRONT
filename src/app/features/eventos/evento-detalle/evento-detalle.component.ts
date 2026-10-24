import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventoService } from '../../../core/services/modulos.service';
import { FacturaService } from '../../../core/services/finanzas.service';
import { HuespedService } from '../../../core/services/huesped.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { AuthService } from '../../../core/services/auth.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { Huesped } from '../../../core/models/huesped.model';
import { EstadoEvento, Evento, Participante, ParticipanteRequest, etiquetaEstadoEvento } from '../../../core/models/evento.model';
import { etiquetaEstadoFactura } from '../../../core/models/finanzas.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { descargarCsv, fechaCorta, moneda } from '../../../core/utils/formato.util';
import { MotivoDialogComponent } from '../../../shared/dialogs/motivo-dialog/motivo-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { claseEstadoEvento } from '../eventos-list/eventos-list.component';

/** Inscribir un participante: un huésped registrado o una persona externa. */
@Component({
  selector: 'app-participante-dialog',
  host: { class: 'roomix-dialog-shell' },
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="dialog-accent" aria-hidden="true"></div>
    <div mat-dialog-title class="dialog-header">
      <div class="header-icon"><mat-icon>person_add</mat-icon></div>
      <div class="header-text"><h2>Inscribir participante</h2><p>{{ data.nombre }}</p></div>
    </div>
    <mat-dialog-content>
      @if (data.tipoAcceso !== 'SOLO_HUESPEDES') {
        <mat-button-toggle-group [value]="modo()" (change)="modo.set($event.value)" class="modo">
          <mat-button-toggle value="huesped"><mat-icon>hotel</mat-icon> Huésped</mat-button-toggle>
          <mat-button-toggle value="externo"><mat-icon>person</mat-icon> Externo</mat-button-toggle>
        </mat-button-toggle-group>
      } @else {
        <p class="rx-muted">Evento exclusivo para huéspedes del hotel.</p>
      }

      @if (modo() === 'huesped') {
        <mat-form-field appearance="outline" class="full">
          <mat-label>Buscar huésped (nombre o documento)</mat-label>
          <input matInput #q (keyup.enter)="buscar(q.value)" />
          <button mat-icon-button matSuffix (click)="buscar(q.value)" aria-label="Buscar"><mat-icon>search</mat-icon></button>
        </mat-form-field>
        <div class="resultados">
          @for (h of huespedes(); track h.id) {
            <button type="button" class="resultado" [class.sel]="seleccionado()?.id === h.id" (click)="seleccionado.set(h)">
              <strong>{{ h.nombreCompleto }}</strong><span>{{ h.tipoDocumento }} {{ h.numeroDocumento }}@if (h.habitacionActualNumero) { · Hab. {{ h.habitacionActualNumero }} }</span>
            </button>
          } @empty {
            @if (buscado()) { <p class="rx-muted">Sin resultados.</p> }
          }
        </div>
      } @else {
        <form [formGroup]="form" class="rx-form-grid">
          <mat-form-field appearance="outline" class="rx-full"><mat-label>Nombre completo</mat-label><input matInput formControlName="nombre" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Documento</mat-label><input matInput formControlName="documento" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Teléfono</mat-label><input matInput formControlName="telefono" /></mat-form-field>
          <mat-form-field appearance="outline" class="rx-full"><mat-label>Correo</mat-label><input matInput type="email" formControlName="email" /></mat-form-field>
        </form>
      }
      <mat-checkbox [checked]="confirmado()" (change)="confirmado.set($event.checked)">Asistencia confirmada</mat-checkbox>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()">Inscribir</button>
    </mat-dialog-actions>
  `,
  styles: `
    .modo { margin-bottom: 0.85rem; }
    .full { width: 100%; }
    .resultados { display: flex; flex-direction: column; gap: 0.35rem; max-height: 240px; overflow: auto; margin-bottom: 0.5rem; }
    .resultado { display: flex; flex-direction: column; align-items: flex-start; padding: 0.5rem 0.7rem; border: 1px solid var(--bg-300);
      border-radius: 10px; background: #fff; cursor: pointer; text-align: left; font: inherit; }
    .resultado span { font-size: 0.8rem; color: var(--text-200); }
    .resultado.sel { border-color: var(--primary-300); background: rgba(168, 224, 183, 0.25); }
    .error { color: #c62828; font-size: 0.85rem; }
  `,
})
export class ParticipanteDialogComponent {
  readonly data = inject<Evento>(MAT_DIALOG_DATA);
  private readonly service = inject(EventoService);
  private readonly huespedService = inject(HuespedService);
  private readonly ref = inject(MatDialogRef<ParticipanteDialogComponent, Evento>);

  readonly modo = signal<'huesped' | 'externo'>(this.data.tipoAcceso === 'SOLO_HUESPEDES' ? 'huesped' : 'externo');
  readonly huespedes = signal<Huesped[]>([]);
  readonly buscado = signal(false);
  readonly seleccionado = signal<Huesped | null>(null);
  readonly confirmado = signal(true);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).group({
    nombre: ['', Validators.required],
    documento: [''],
    telefono: [''],
    email: ['', Validators.email],
  });

  buscar(q: string): void {
    this.huespedService.listar({ activo: true, busqueda: q }).subscribe((h) => {
      this.huespedes.set(h.slice(0, 20));
      this.buscado.set(true);
    });
  }

  guardar(): void {
    let body: ParticipanteRequest;
    if (this.modo() === 'huesped') {
      const h = this.seleccionado();
      if (!h) {
        this.error.set('Selecciona un huésped.');
        return;
      }
      body = { huespedId: h.id, confirmado: this.confirmado() };
    } else {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      const v = this.form.getRawValue();
      body = { nombre: v.nombre, documento: v.documento || null, telefono: v.telefono || null, email: v.email || null, confirmado: this.confirmado() };
    }
    this.service.agregarParticipante(this.data.id, body).subscribe({
      next: (e) => this.ref.close(e),
      error: (e) => this.error.set(extractApiErrorMessage(e)),
    });
  }
}

@Component({
  selector: 'app-evento-detalle',
  imports: [RouterLink, MatButtonModule, MatCheckboxModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule],
  template: `
    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (evento(); as e) {
      <div class="page-header row">
        <div>
          <h1>{{ e.nombre }} <span class="rx-chip {{ clase(e.estado) }}">{{ etiqueta(e.estado) }}</span></h1>
          <p>{{ e.tipoNombre }} · {{ e.tipoAccesoNombre }} · {{ e.salonNombre }}</p>
        </div>
        <div class="rx-acciones">
          <a mat-stroked-button routerLink="/eventos"><mat-icon>arrow_back</mat-icon>Eventos</a>
          @if (puedeGestionar()) {
            @if (e.estado === 'PROGRAMADO') {
              <a mat-stroked-button [routerLink]="['/eventos', e.id, 'editar']"><mat-icon>edit</mat-icon>Editar</a>
              <button mat-flat-button color="primary" (click)="estado('EN_CURSO')"><mat-icon>play_arrow</mat-icon>Iniciar</button>
            }
            @if (e.estado === 'EN_CURSO') {
              <button mat-flat-button color="primary" (click)="estado('FINALIZADO')"><mat-icon>check</mat-icon>Finalizar</button>
            }
            @if (e.estado === 'PROGRAMADO' || e.estado === 'EN_CURSO') {
              <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Más acciones"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="estado('CANCELADO')"><mat-icon>block</mat-icon>Cancelar evento</button>
              </mat-menu>
            }
          }
        </div>
      </div>

      @if (e.motivoCancelacion) {
        <div class="aviso"><mat-icon>info</mat-icon>Cancelado: {{ e.motivoCancelacion }}</div>
      }

      <div class="rx-kpis">
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>groups</mat-icon>Inscritos</span><span class="rx-kpi-valor">{{ e.inscritos }}/{{ e.capacidad }}</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>how_to_reg</mat-icon>Confirmados</span><span class="rx-kpi-valor">{{ e.confirmados }}</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>event_available</mat-icon>Asistieron</span><span class="rx-kpi-valor">{{ e.asistentes }}</span></div>
        <div class="rx-kpi"><span class="rx-kpi-etiqueta"><mat-icon>payments</mat-icon>Valor total</span><span class="rx-kpi-valor">{{ moneda(e.valorTotal) }}</span></div>
      </div>

      <div class="rx-grid-2">
        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>event</mat-icon>Información</div>
          <div class="rx-datos">
            <div class="rx-dato"><span>Inicio</span><strong>{{ fecha(e.fechaHoraInicio, true) }}</strong></div>
            <div class="rx-dato"><span>Fin</span><strong>{{ fecha(e.fechaHoraFin, true) }}</strong></div>
            <div class="rx-dato"><span>Salón</span><strong>{{ e.salonNombre }} ({{ e.salonCapacidad }} pers.)</strong></div>
            <div class="rx-dato"><span>Responsable</span><strong>{{ e.responsableNombre ?? 'Sin asignar' }}</strong></div>
            <div class="rx-dato"><span>Organizador</span><strong>{{ e.organizadorNombre }}</strong></div>
            <div class="rx-dato"><span>Documento</span><strong>{{ e.organizadorDocumento ?? '—' }}</strong></div>
            <div class="rx-dato"><span>Contacto</span><strong>{{ e.organizadorTelefono ?? '' }} {{ e.organizadorEmail ?? '' }}</strong></div>
            <div class="rx-dato"><span>Registrado por</span><strong>{{ e.creadoPor }}</strong></div>
          </div>
          @if (e.descripcion) { <p class="texto">{{ e.descripcion }}</p> }
          @if (e.notas) { <p class="texto rx-muted">Notas: {{ e.notas }}</p> }
        </section>

        <section class="rx-card">
          <div class="rx-card-titulo"><mat-icon>inventory</mat-icon>Recursos y valor</div>
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Recurso</th><th class="derecha">Cant.</th><th class="derecha">Total</th></tr></thead>
              <tbody>
                <tr><td data-label="Recurso" class="ancho">Alquiler del salón</td><td data-label="Cant." class="derecha">1</td><td data-label="Total" class="derecha rx-num">{{ moneda(e.valorBase) }}</td></tr>
                @for (r of e.recursos; track r.id) {
                  <tr>
                    <td data-label="Recurso" class="ancho">{{ r.descripcion }} <span class="sub">{{ r.tipoNombre }} · {{ moneda(r.valorUnitario) }} c/u</span></td>
                    <td data-label="Cant." class="derecha">{{ r.cantidad }}</td>
                    <td data-label="Total" class="derecha rx-num">{{ moneda(r.total) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="factura">
            @if (e.facturaId) {
              <span>Factura <a [routerLink]="['/facturas', e.facturaId]">{{ e.facturaNumero }}</a> · {{ etiquetaFactura(e.facturaEstado!) }}</span>
            } @else if (puedeFacturar() && e.estado !== 'CANCELADO') {
              <button mat-flat-button color="primary" (click)="facturar()"><mat-icon>receipt_long</mat-icon>Generar factura</button>
            } @else {
              <span class="rx-muted">Sin factura</span>
            }
          </div>
        </section>
      </div>

      <section class="rx-card">
        <div class="rx-card-titulo">
          <mat-icon>groups</mat-icon>Participantes ({{ e.participantes.length }})
          <span class="spacer"></span>
          <button mat-button (click)="exportar()" [disabled]="e.participantes.length === 0"><mat-icon>download</mat-icon>CSV</button>
          @if (puedeGestionar() && abierto()) {
            <button mat-stroked-button (click)="inscribir()" [disabled]="e.inscritos >= e.capacidad"><mat-icon>person_add</mat-icon>Inscribir</button>
          }
        </div>
        @if (e.participantes.length === 0) {
          <p class="rx-muted">Aún no hay participantes inscritos.</p>
        } @else {
          <div class="rx-tabla-wrap">
            <table class="rx-tabla">
              <thead><tr><th>Nombre</th><th>Documento</th><th>Contacto</th><th>Confirmado</th><th>Asistió</th><th></th></tr></thead>
              <tbody>
                @for (p of e.participantes; track p.id) {
                  <tr>
                    <td data-label="Nombre" class="ancho">
                      @if (p.huespedId) { <a [routerLink]="['/huespedes', p.huespedId]">{{ p.nombre }}</a> <span class="rx-chip info">Huésped</span> } @else { {{ p.nombre }} }
                    </td>
                    <td data-label="Documento">{{ p.documento ?? '—' }}</td>
                    <td data-label="Contacto">{{ p.telefono ?? '' }} {{ p.email ?? '' }}</td>
                    <td data-label="Confirmado"><mat-checkbox [checked]="p.confirmado" [disabled]="!puedeGestionar() || !abierto()" (change)="marcar(p, { confirmado: $event.checked })" /></td>
                    <td data-label="Asistió"><mat-checkbox [checked]="p.asistio" [disabled]="!puedeGestionar() || e.estado === 'CANCELADO'" (change)="marcar(p, { asistio: $event.checked })" /></td>
                    <td class="acciones derecha">
                      @if (puedeGestionar() && abierto()) {
                        <button mat-icon-button (click)="quitar(p)" aria-label="Quitar participante"><mat-icon>person_remove</mat-icon></button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    } @else {
      <div class="rx-vacio"><mat-icon>error</mat-icon><p>{{ error() ?? 'Evento no encontrado' }}</p></div>
    }
  `,
  styles: `
    h1 .rx-chip { vertical-align: middle; font-size: 0.75rem; }
    .aviso { display: flex; gap: 0.5rem; align-items: center; padding: 0.7rem 1rem; margin-bottom: 1rem; border-radius: 12px; background: #fdecea; color: #8e1c1c; }
    .texto { margin: 0.75rem 0 0; font-size: 0.9rem; }
    .factura { display: flex; justify-content: flex-end; margin-top: 0.75rem; }
    .rx-card-titulo { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .spacer { flex: 1; }
  `,
})
export class EventoDetalleComponent implements OnInit {
  private readonly service = inject(EventoService);
  private readonly facturas = inject(FacturaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly auth = inject(AuthService);

  readonly moneda = moneda;
  readonly fecha = fechaCorta;
  readonly etiqueta = etiquetaEstadoEvento;
  readonly etiquetaFactura = etiquetaEstadoFactura;
  readonly clase = claseEstadoEvento;
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly evento = signal<Evento | null>(null);
  readonly puedeGestionar = computed(() => this.auth.tieneRol('ADMIN', 'EVENTOS'));
  readonly puedeFacturar = computed(() => this.auth.tieneRol('ADMIN', 'FINANZAS'));
  readonly abierto = computed(() => {
    const e = this.evento();
    return !!e && (e.estado === 'PROGRAMADO' || e.estado === 'EN_CURSO');
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.obtener(id).subscribe({
      next: (e) => {
        this.evento.set(e);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err));
        this.cargando.set(false);
      },
    });
  }

  estado(estado: EstadoEvento): void {
    const e = this.evento()!;
    if (estado === 'CANCELADO') {
      this.dialog
        .open(MotivoDialogComponent, {
          ...roomixDialogConfig({ width: '460px' }),
          data: { title: 'Cancelar evento', message: `${e.nombre}. El salón quedará libre en ese horario.`, confirmLabel: 'Cancelar evento' },
        })
        .afterClosed()
        .subscribe((motivo?: string) => motivo && this.enviarEstado(estado, motivo));
      return;
    }
    this.enviarEstado(estado);
  }

  private enviarEstado(estado: EstadoEvento, motivo?: string): void {
    this.service.cambiarEstado(this.evento()!.id, estado, motivo).subscribe({
      next: (e) => {
        this.evento.set(e);
        this.snack.open(`Evento ${this.etiqueta(estado).toLowerCase()}`, 'OK', { duration: 2500 });
      },
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
  }

  inscribir(): void {
    this.dialog
      .open(ParticipanteDialogComponent, { ...roomixDialogConfig({ width: '540px' }), data: this.evento() })
      .afterClosed()
      .subscribe((e?: Evento) => e && this.evento.set(e));
  }

  marcar(p: Participante, cambios: { confirmado?: boolean; asistio?: boolean }): void {
    this.service.actualizarParticipante(this.evento()!.id, p.id, cambios).subscribe({
      next: (e) => this.evento.set(e),
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
  }

  quitar(p: Participante): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        ...roomixDialogConfig({ width: '420px' }),
        data: { title: 'Quitar participante', message: `¿Retirar a ${p.nombre} del evento?`, confirmLabel: 'Quitar', warn: true },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.service.eliminarParticipante(this.evento()!.id, p.id).subscribe({
          next: (e) => this.evento.set(e),
          error: (err) => this.errorDialog.mostrarDesdeApi(err),
        });
      });
  }

  facturar(): void {
    this.facturas.facturarEvento(this.evento()!.id).subscribe({
      next: (f) => {
        this.snack.open(`Factura ${f.numero} generada`, 'OK', { duration: 3000 });
        this.router.navigate(['/facturas', f.id]);
      },
      error: (err) => this.errorDialog.mostrarDesdeApi(err),
    });
  }

  exportar(): void {
    const e = this.evento()!;
    descargarCsv(
      `participantes-evento-${e.id}.csv`,
      ['Nombre', 'Documento', 'Teléfono', 'Correo', 'Huésped', 'Confirmado', 'Asistió'],
      e.participantes.map((p) => [p.nombre, p.documento, p.telefono, p.email, p.huespedId ? 'Sí' : 'No', p.confirmado ? 'Sí' : 'No', p.asistio ? 'Sí' : 'No']),
    );
  }
}
