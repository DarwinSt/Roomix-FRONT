import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuditoriaService } from '../../../core/services/modulos.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { RegistroAuditoria } from '../../../core/models/dashboard.model';
import { descargarCsv, fechaCorta, hoyIso, isoFecha, sumarDias } from '../../../core/utils/formato.util';

@Component({
  selector: 'app-auditoria',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    <div class="page-header row">
      <div>
        <h1>Auditoría</h1>
        <p>Registro de inicios de sesión y de toda operación que modifica datos: quién, qué, cuándo y desde dónde.</p>
      </div>
      <button mat-stroked-button (click)="exportar()" [disabled]="registros().length === 0">
        <mat-icon>download</mat-icon>Exportar CSV
      </button>
    </div>

    <div class="rx-toolbar">
      <mat-form-field appearance="outline">
        <mat-label>Usuario</mat-label>
        <input matInput [(ngModel)]="usuario" (keyup.enter)="buscar(0)" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Módulo</mat-label>
        <mat-select [(ngModel)]="modulo" (selectionChange)="buscar(0)" panelClass="roomix-select-panel">
          <mat-option value="">Todos</mat-option>
          @for (m of modulos(); track m) { <mat-option [value]="m">{{ m }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Acción</mat-label>
        <mat-select [(ngModel)]="accion" (selectionChange)="buscar(0)" panelClass="roomix-select-panel">
          <mat-option value="">Todas</mat-option>
          @for (a of acciones; track a) { <mat-option [value]="a">{{ a }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Desde</mat-label>
        <input matInput type="date" [(ngModel)]="desde" (change)="buscar(0)" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Hasta</mat-label>
        <input matInput type="date" [(ngModel)]="hasta" (change)="buscar(0)" />
      </mat-form-field>
      <div class="rx-toolbar-acciones">
        <button mat-flat-button color="primary" (click)="buscar(0)"><mat-icon>search</mat-icon>Buscar</button>
      </div>
    </div>

    @if (cargando()) {
      <div class="rx-cargando"><mat-spinner diameter="44" /></div>
    } @else if (registros().length === 0) {
      <div class="rx-vacio"><mat-icon>policy</mat-icon><p>No hay registros con esos filtros.</p></div>
    } @else {
      <div class="rx-tabla-wrap">
        <table class="rx-tabla">
          <thead>
            <tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Registro</th><th>Resultado</th><th>IP</th></tr>
          </thead>
          <tbody>
            @for (r of registros(); track r.id) {
              <tr>
                <td data-label="Fecha" class="rx-num">{{ fecha(r.fechaHora, true) }}</td>
                <td data-label="Usuario"><strong>{{ r.usuario }}</strong>@if (r.rol) {<span class="sub">{{ r.rol }}</span>}</td>
                <td data-label="Acción">{{ r.accion }}</td>
                <td data-label="Módulo">{{ r.modulo }}</td>
                <td data-label="Registro">{{ r.entidadId ? '#' + r.entidadId : '—' }}</td>
                <td data-label="Resultado">
                  <span class="rx-chip" [class.ok]="r.exitoso" [class.critico]="!r.exitoso">
                    {{ r.exitoso ? 'Exitoso' : 'Fallido' }}@if (r.estadoHttp) { · {{ r.estadoHttp }} }
                  </span>
                </td>
                <td data-label="IP" class="rx-num">{{ r.ip ?? '—' }}</td>
                @if (r.detalle) {
                  <td data-label="Detalle" class="ancho detalle-mobile">{{ r.detalle }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
        <div class="rx-paginacion">
          <span>{{ total() }} registro(s) · página {{ pagina() + 1 }} de {{ totalPaginas() || 1 }}</span>
          <button mat-icon-button (click)="buscar(pagina() - 1)" [disabled]="pagina() === 0" aria-label="Página anterior"><mat-icon>chevron_left</mat-icon></button>
          <button mat-icon-button (click)="buscar(pagina() + 1)" [disabled]="pagina() + 1 >= totalPaginas()" aria-label="Página siguiente"><mat-icon>chevron_right</mat-icon></button>
        </div>
      </div>
    }
  `,
  styles: `
    .detalle-mobile { display: none; font-size: 0.78rem; color: var(--text-200); }
    @media (max-width: 720px) { .detalle-mobile { display: block; } }
  `,
})
export class AuditoriaComponent implements OnInit {
  private readonly service = inject(AuditoriaService);
  private readonly errorDialog = inject(ErrorDialogService);

  readonly acciones = ['LOGIN', 'LOGIN_FALLIDO', 'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'CAMBIO_ESTADO', 'ESTADO', 'CHECK_IN', 'CHECK_OUT',
    'CANCELAR', 'PAGOS', 'ANULAR', 'STOCK', 'CAMBIO_PASSWORD', 'RECUPERAR_PASSWORD', 'RESTABLECER_PASSWORD'];
  readonly fecha = fechaCorta;
  readonly cargando = signal(true);
  readonly registros = signal<RegistroAuditoria[]>([]);
  readonly modulos = signal<string[]>([]);
  readonly pagina = signal(0);
  readonly total = signal(0);
  readonly totalPaginas = signal(0);

  usuario = '';
  modulo = '';
  accion = '';
  desde = isoFecha(sumarDias(new Date(), -7));
  hasta = hoyIso();

  ngOnInit(): void {
    this.service.modulos().subscribe((m) => this.modulos.set(m));
    this.buscar(0);
  }

  buscar(pagina: number): void {
    this.cargando.set(true);
    this.service
      .buscar({ usuario: this.usuario, modulo: this.modulo, accion: this.accion, desde: this.desde, hasta: this.hasta, pagina, tamano: 50 })
      .subscribe({
        next: (p) => {
          this.registros.set(p.contenido);
          this.pagina.set(p.pagina);
          this.total.set(p.totalElementos);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.errorDialog.mostrarDesdeApi(e);
        },
      });
  }

  exportar(): void {
    descargarCsv(
      `auditoria-${this.desde}-a-${this.hasta}.csv`,
      ['Fecha', 'Usuario', 'Rol', 'Acción', 'Módulo', 'Registro', 'Método', 'Ruta', 'HTTP', 'Exitoso', 'IP', 'Detalle'],
      this.registros().map((r) => [
        r.fechaHora, r.usuario, r.rol, r.accion, r.modulo, r.entidadId, r.metodoHttp, r.ruta, r.estadoHttp,
        r.exitoso ? 'Sí' : 'No', r.ip, r.detalle,
      ]),
    );
  }
}
