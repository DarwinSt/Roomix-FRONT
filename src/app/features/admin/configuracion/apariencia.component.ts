import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { COLORES_ROOMIX, PALETAS, TemaService, contraste, esColor, paleta } from '../../../core/services/tema.service';
import { ConfiguracionHotel } from '../../../core/models/configuracion.model';

/**
 * Apariencia del hotel: paletas listas o colores propios, frase de bienvenida y vista previa en vivo. Los colores se
 * ven en toda la aplicación mientras se eligen; si no se guardan, se vuelve a los anteriores al salir.
 */
@Component({
  selector: 'app-apariencia',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="apariencia">
      <section class="rx-card opciones">
        <div class="rx-card-titulo"><mat-icon>palette</mat-icon>Colores del hotel</div>
        <p class="ayuda">Elija una paleta o los colores de su marca. Se aplican al menú, los botones, los modales y la pantalla de ingreso de todos los usuarios.</p>

        <span class="rx-etiqueta">Paletas</span>
        <div class="paletas">
          @for (p of paletas; track p.nombre) {
            <button type="button" class="paleta" [class.activa]="primario() === p.primario && acento() === p.acento" (click)="elegir(p.primario, p.acento)">
              <span class="muestras">
                <span [style.background]="tono(p.primario, p.acento, '--primary-400')"></span>
                <span [style.background]="tono(p.primario, p.acento, '--primary-300')"></span>
                <span [style.background]="tono(p.primario, p.acento, '--primary-100')"></span>
                <span [style.background]="tono(p.primario, p.acento, '--accent-100')"></span>
              </span>
              <span class="nombre">{{ p.nombre }}</span>
            </button>
          }
        </div>

        <span class="rx-etiqueta">Colores propios</span>
        <div class="propios">
          <label class="color">
            <input type="color" [ngModel]="primario()" (ngModelChange)="elegir($event, acento())" aria-label="Color principal" />
            <span><strong>Principal</strong>{{ primario() }}</span>
          </label>
          <label class="color">
            <input type="color" [ngModel]="acento()" (ngModelChange)="elegir(primario(), $event)" aria-label="Color de acento" />
            <span><strong>Acento</strong>{{ acento() }}</span>
          </label>
        </div>
        @if (ajustado()) {
          <p class="nota"><mat-icon>contrast</mat-icon>El color principal es muy claro para texto blanco: los botones usan un tono más oscuro del mismo color.</p>
        }

        <mat-form-field appearance="outline" class="eslogan">
          <mat-label>Frase de bienvenida (opcional)</mat-label>
          <input matInput maxlength="120" [ngModel]="eslogan()" (ngModelChange)="eslogan.set($event)" placeholder="Ej. Descanso y naturaleza en el corazón del Huila" />
          <mat-hint>Se muestra en la pantalla de ingreso, debajo del nombre del hotel.</mat-hint>
        </mat-form-field>

        <div class="acciones">
          <button mat-button type="button" (click)="elegir(roomix.primario, roomix.acento)"><mat-icon>restart_alt</mat-icon>Colores de Roomix</button>
          <span class="espacio"></span>
          @if (cambios()) { <button mat-button type="button" (click)="descartar()">Descartar</button> }
          <button mat-flat-button color="primary" type="button" (click)="guardar()" [disabled]="guardando() || !cambios()">
            <mat-icon>check</mat-icon>Aplicar al hotel
          </button>
        </div>
      </section>

      <section class="vista" aria-label="Vista previa">
        <span class="rx-etiqueta">Vista previa</span>
        <div class="maqueta">
          <div class="barra"><span class="logo">{{ nombre().charAt(0) }}</span>{{ nombre() }}</div>
          <div class="cuerpo">
            <div class="menu">
              <span class="item activo"><mat-icon>dashboard</mat-icon>Inicio</span>
              <span class="item"><mat-icon>event_note</mat-icon>Reservas</span>
              <span class="item"><mat-icon>point_of_sale</mat-icon>Caja</span>
            </div>
            <div class="contenido">
              <div class="tarjeta">
                <span class="chip">Disponible</span>
                <strong>Habitación 101</strong>
                <span class="sub">$ 185.000 / noche</span>
                <span class="boton">Reservar</span>
              </div>
              <div class="modal">
                <div class="modal-cab"><span class="ico"><mat-icon>storefront</mat-icon></span>Vender productos</div>
                <div class="modal-pie"><span class="total">$ 13.500</span><span class="boton">Cobrar</span></div>
              </div>
            </div>
          </div>
        </div>
        @if (eslogan()) { <p class="frase">«{{ eslogan() }}»</p> }
      </section>
    </div>
  `,
  styles: `
    .apariencia { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
    .ayuda { font-size: 0.85rem; color: var(--text-200); margin: 0 0 1rem; }
    .paletas { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 0.5rem; margin-bottom: 1.25rem; }
    .paleta { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.55rem; border: 1.5px solid var(--bg-200); border-radius: 12px;
      background: #fff; cursor: pointer; font: inherit; text-align: left; }
    .paleta:hover { border-color: rgba(var(--primary-300-rgb), 0.5); }
    .paleta.activa { border-color: var(--primary-300); box-shadow: 0 0 0 3px rgba(var(--primary-300-rgb), 0.15); }
    .muestras { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr; height: 28px; border-radius: 8px; overflow: hidden; }
    .nombre { font-size: 0.82rem; font-weight: 600; color: var(--text-100); }
    .propios { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .color { display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.8rem 0.45rem 0.45rem; border: 1.5px solid var(--bg-200);
      border-radius: 12px; background: #fff; cursor: pointer; }
    .color input { width: 40px; height: 40px; border: none; padding: 0; background: none; cursor: pointer; }
    .color input::-webkit-color-swatch-wrapper { padding: 0; }
    .color input::-webkit-color-swatch { border: none; border-radius: 8px; }
    .color span { display: flex; flex-direction: column; font-size: 0.78rem; color: var(--text-200); font-family: monospace; }
    .color strong { font-family: var(--roomix-font); font-size: 0.85rem; color: var(--text-strong); }
    .nota { display: flex; gap: 0.4rem; align-items: center; font-size: 0.8rem; color: var(--text-200); margin: 0 0 0.75rem; }
    .nota mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .eslogan { width: 100%; margin-top: 0.5rem; }
    .acciones { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
    .espacio { flex: 1; }

    .vista { position: sticky; top: 1rem; }
    .maqueta { border-radius: 16px; overflow: hidden; border: 1px solid var(--bg-200); box-shadow: var(--roomix-shadow-hover); background: var(--roomix-gradient-bg); }
    .barra { display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 0.9rem; color: #fff; font-weight: 700; font-size: 0.9rem;
      background: var(--roomix-gradient-toolbar); }
    .logo { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: rgba(255, 255, 255, 0.2); font-size: 0.8rem; }
    .cuerpo { display: grid; grid-template-columns: 110px 1fr; min-height: 230px; }
    .menu { display: flex; flex-direction: column; gap: 0.2rem; padding: 0.6rem 0.4rem; background: rgba(255, 255, 255, 0.7); border-right: 1px solid var(--bg-200); }
    .item { display: flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.45rem; border-radius: 8px; font-size: 0.72rem; color: var(--text-100); }
    .item mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: var(--primary-300); }
    .item.activo { background: rgba(var(--primary-100-rgb), 0.5); color: var(--primary-400); font-weight: 700; }
    .contenido { padding: 0.7rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .tarjeta { display: flex; flex-direction: column; gap: 0.2rem; background: #fff; border-radius: 12px; padding: 0.65rem; border: 1px solid var(--bg-200); }
    .tarjeta strong { color: var(--text-strong); font-size: 0.85rem; }
    .sub { font-size: 0.72rem; color: var(--text-200); }
    .chip { align-self: flex-start; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; padding: 0.1rem 0.45rem; border-radius: 999px;
      background: rgba(var(--primary-100-rgb), 0.6); color: var(--primary-400); }
    .boton { align-self: flex-end; margin-top: 0.3rem; padding: 0.3rem 0.8rem; border-radius: 999px; background: var(--primary-300); color: #fff;
      font-size: 0.72rem; font-weight: 700; }
    .modal { background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid var(--bg-200); }
    .modal-cab { display: flex; align-items: center; gap: 0.45rem; padding: 0.5rem 0.6rem; font-size: 0.78rem; font-weight: 700; color: var(--text-strong);
      background: linear-gradient(180deg, rgba(var(--primary-100-rgb), 0.45), rgba(var(--primary-100-rgb), 0.12)); }
    .ico { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; color: #fff;
      background: linear-gradient(135deg, var(--primary-300), var(--primary-400)); }
    .ico mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .modal-pie { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.6rem; }
    .modal-pie .boton { margin: 0; }
    .total { font-weight: 800; color: var(--text-strong); font-size: 0.85rem; }
    .frase { text-align: center; font-style: italic; color: var(--text-200); font-size: 0.85rem; margin: 0.6rem 0 0; }
    @media (max-width: 900px) { .apariencia { grid-template-columns: 1fr; } .vista { position: static; } }
  `,
})
export class AparienciaComponent implements OnInit, OnDestroy {
  readonly cfg = input.required<ConfiguracionHotel>();
  readonly guardado = output<ConfiguracionHotel>();

  private readonly service = inject(ConfiguracionService);
  private readonly tema = inject(TemaService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly snack = inject(MatSnackBar);

  readonly paletas = PALETAS;
  readonly roomix = COLORES_ROOMIX;
  readonly primario = signal(COLORES_ROOMIX.primario);
  readonly acento = signal(COLORES_ROOMIX.acento);
  readonly eslogan = signal('');
  readonly guardando = signal(false);
  private iniciado = false;
  private guardadoOk = false;

  readonly nombre = computed(() => this.cfg().nombre || 'Mi hotel');
  readonly cambios = computed(() => {
    const c = this.cfg();
    return this.primario() !== (c.colorPrimario ?? COLORES_ROOMIX.primario) || this.acento() !== (c.colorAcento ?? COLORES_ROOMIX.acento)
      || (this.eslogan().trim() || null) !== (c.eslogan ?? null);
  });
  /** El color elegido no da contraste con el texto blanco: la paleta usa una versión más oscura. */
  readonly ajustado = computed(() => contraste(this.primario(), '#ffffff') < 4.5);

  ngOnInit(): void {
    const c = this.cfg();
    this.primario.set(c.colorPrimario ?? COLORES_ROOMIX.primario);
    this.acento.set(c.colorAcento ?? COLORES_ROOMIX.acento);
    this.eslogan.set(c.eslogan ?? '');
    this.iniciado = true;
  }

  ngOnDestroy(): void {
    // Vista previa sin guardar: la aplicación vuelve a los colores del hotel
    if (!this.guardadoOk && this.cambios()) this.service.restaurarTema();
  }

  tono(primario: string, acento: string, variable: string): string {
    return paleta(primario, acento)[variable];
  }

  elegir(primario: string, acento: string): void {
    if (!esColor(primario) || !esColor(acento)) return;
    this.primario.set(primario.toLowerCase());
    this.acento.set(acento.toLowerCase());
    this.guardadoOk = false;
    if (this.iniciado) {
      const roomix = primario.toLowerCase() === COLORES_ROOMIX.primario && acento.toLowerCase() === COLORES_ROOMIX.acento;
      this.tema.aplicar(roomix ? null : primario, roomix ? null : acento);
    }
  }

  descartar(): void {
    this.ngOnInit();
    this.service.restaurarTema();
  }

  guardar(): void {
    const roomix = this.primario() === COLORES_ROOMIX.primario && this.acento() === COLORES_ROOMIX.acento;
    this.guardando.set(true);
    this.service
      .actualizarApariencia({
        colorPrimario: roomix ? null : this.primario(),
        colorAcento: roomix ? null : this.acento(),
        eslogan: this.eslogan().trim() || null,
      })
      .subscribe({
        next: (c) => {
          this.guardando.set(false);
          this.guardadoOk = true;
          this.guardado.emit(c);
          this.snack.open('Apariencia aplicada para todos los usuarios', 'Cerrar', { duration: 3000 });
        },
        error: (e) => {
          this.guardando.set(false);
          this.errorDialog.mostrarDesdeApi(e);
        },
      });
  }
}
