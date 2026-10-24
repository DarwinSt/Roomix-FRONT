import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import { of } from 'rxjs';
import {
  calcularNoches,
  Habitacion,
  TIPOS_HABITACION,
  TipoHabitacion,
} from '../../../core/models/habitacion.model';
import { Huesped, TIPOS_DOCUMENTO, TipoDocumento, TEXTO_AUTORIZACION_DATOS } from '../../../core/models/huesped.model';
import type { HabitacionDisponible, Reserva } from '../../../core/models/reserva.model';
import { CANALES_RESERVA, CanalReserva, formatearMoneda } from '../../../core/models/reserva.model';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { HuespedService } from '../../../core/services/huesped.service';
import { ReservaService } from '../../../core/services/reserva.service';
import { TarifaService } from '../../../core/services/tarifa.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { formatearFechaIso } from '../../../core/utils/date.util';
import { etiquetaEstado, metaEstado } from '../../../core/utils/habitacion-estado.util';

const DATOS_HUESPED = ['nombre', 'apellidos', 'tipoDocumento', 'numeroDocumento', 'email', 'telefono'] as const;

@Component({
  selector: 'app-habitacion-reserva',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    FormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './habitacion-reserva.component.html',
  styleUrl: './habitacion-reserva.component.scss',
})
export class HabitacionReservaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly habitacionService = inject(HabitacionService);
  private readonly huespedService = inject(HuespedService);
  private readonly reservaService = inject(ReservaService);
  private readonly tarifaService = inject(TarifaService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly guardando = signal(false);
  readonly verificandoDisponibilidad = signal(false);
  readonly habitacion = signal<Habitacion | null>(null);
  readonly tarifaNoche = signal<number | null>(null);
  readonly disponibleEnFechas = signal<boolean | null>(null);
  readonly errorDisponibilidad = signal<string | null>(null);
  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly textoAutorizacion = TEXTO_AUTORIZACION_DATOS;
  readonly etiqueta = etiquetaEstado;
  readonly meta = metaEstado;
  readonly formatearMoneda = formatearMoneda;
  readonly canales = CANALES_RESERVA;

  // ---------------------------------------------------------------- Huésped existente (autocompletar)
  readonly textoBusqueda = signal('');
  readonly resultadosHuesped = signal<Huesped[]>([]);
  readonly buscandoHuesped = signal(false);
  readonly huespedSeleccionado = signal<Huesped | null>(null);
  private readonly busqueda$ = new Subject<string>();

  // ---------------------------------------------------------------- Conflictos y sugerencias de fechas
  readonly conflictos = signal<Reserva[]>([]);
  readonly sugerencias = signal<{ entrada: string; salida: string; noches: number; etiqueta: string }[]>([]);
  readonly alternativas = signal<HabitacionDisponible[]>([]);
  private reservasHabitacion: Reserva[] | null = null;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    tipoDocumento: ['DNI' as TipoDocumento, Validators.required],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(40)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
    autorizaTratamientoDatos: [false, Validators.requiredTrue],
    fechaEntrada: [new Date(), Validators.required],
    fechaSalida: [this.sumaDias(new Date(), 1), Validators.required],
    canal: ['PRESENCIAL' as CanalReserva],
    observaciones: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      void this.router.navigate(['/habitaciones']);
      return;
    }

    this.habitacionService.obtener(id).subscribe({
      next: (h) => {
        this.habitacion.set(h);
        if (h.precioNoche != null) {
          this.tarifaNoche.set(Number(h.precioNoche));
        } else {
          this.cargarTarifa(h.tipoHabitacion);
        }
        this.loading.set(false);
        this.verificarDisponibilidad();
        if (h.estado !== 'LIBRE') {
          // No reservable hoy: se ofrecen habitaciones del mismo tipo libres para esta noche
          const hoy = formatearFechaIso(new Date());
          const manana = formatearFechaIso(this.sumaDias(new Date(), 1));
          this.reservaService.disponibilidad(hoy, manana, h.tipoHabitacion).subscribe({
            next: (lista) => this.alternativas.set(lista.filter((x) => x.habitacionId !== h.id).slice(0, 6)),
            error: () => this.alternativas.set([]),
          });
        }
      },
      error: (err) => {
        this.errorDialog.mostrarDesdeApi(err);
        void this.router.navigate(['/habitaciones']);
      },
    });

    this.form.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.verificarDisponibilidad());

    this.busqueda$
      .pipe(
        map((t) => t.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        tap((t) => {
          if (t.length < 2) this.resultadosHuesped.set([]);
        }),
        filter((t) => t.length >= 2),
        tap(() => this.buscandoHuesped.set(true)),
        switchMap((t) => this.huespedService.buscar(t, 8).pipe(catchError(() => of([] as Huesped[])))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lista) => {
        this.resultadosHuesped.set(lista);
        this.buscandoHuesped.set(false);
      });
  }

  onBuscarHuesped(texto: string): void {
    this.textoBusqueda.set(texto);
    this.busqueda$.next(texto);
  }

  seleccionarHuesped(h: Huesped): void {
    this.huespedSeleccionado.set(h);
    this.textoBusqueda.set('');
    this.resultadosHuesped.set([]);
    this.form.patchValue({
      nombre: h.nombre,
      apellidos: h.apellidos,
      tipoDocumento: h.tipoDocumento,
      numeroDocumento: h.numeroDocumento,
      email: h.email,
      telefono: h.telefono,
      autorizaTratamientoDatos: h.autorizaTratamientoDatos || !!this.form.controls.autorizaTratamientoDatos.value,
    });
    for (const c of DATOS_HUESPED) this.form.controls[c].disable({ emitEvent: false });
    if (h.autorizaTratamientoDatos) this.form.controls.autorizaTratamientoDatos.disable({ emitEvent: false });
  }

  quitarHuesped(): void {
    this.huespedSeleccionado.set(null);
    for (const c of DATOS_HUESPED) this.form.controls[c].enable({ emitEvent: false });
    this.form.controls.autorizaTratamientoDatos.enable({ emitEvent: false });
    this.form.patchValue({ nombre: '', apellidos: '', numeroDocumento: '', email: '', telefono: '', autorizaTratamientoDatos: false });
  }

  usarSugerencia(sug: { entrada: string; salida: string }): void {
    this.form.patchValue({ fechaEntrada: this.aFecha(sug.entrada), fechaSalida: this.aFecha(sug.salida) });
  }

  puedeReservar(): boolean {
    return this.habitacion()?.estado === 'LIBRE';
  }

  etiquetaTipo(tipo: TipoHabitacion): string {
    return TIPOS_HABITACION.find((t) => t.value === tipo)?.label ?? tipo;
  }

  get noches(): number | null {
    const entrada = this.form.controls.fechaEntrada.value;
    const salida = this.form.controls.fechaSalida.value;
    if (!entrada || !salida) return null;
    return calcularNoches(formatearFechaIso(entrada), formatearFechaIso(salida));
  }

  get totalEstimado(): number | null {
    const tarifa = this.tarifaNoche();
    const noches = this.noches;
    if (tarifa == null || noches == null || noches < 1) return null;
    return tarifa * noches;
  }

  get puedeConfirmar(): boolean {
    return (
      this.puedeReservar() &&
      (this.form.valid || (this.huespedSeleccionado() !== null && this.fechasYConsentimientoValidos())) &&
      (this.noches ?? 0) >= 1 &&
      this.disponibleEnFechas() === true &&
      this.tarifaNoche() != null &&
      !this.guardando() &&
      !this.verificandoDisponibilidad()
    );
  }

  private fechasYConsentimientoValidos(): boolean {
    const c = this.form.controls;
    const consentimiento = c.autorizaTratamientoDatos.disabled || c.autorizaTratamientoDatos.valid;
    return c.fechaEntrada.valid && c.fechaSalida.valid && c.canal.valid && c.observaciones.valid && consentimiento;
  }

  get mensajeValidacion(): string | null {
    if (!this.puedeReservar() || this.guardando() || this.puedeConfirmar) return null;

    if (this.verificandoDisponibilidad()) {
      return 'Comprobando disponibilidad para las fechas seleccionadas…';
    }

    if (this.errorDisponibilidad()) {
      return this.errorDisponibilidad();
    }

    if (this.disponibleEnFechas() === false) {
      return (
        this.errorDisponibilidad() ??
        'La habitación no está disponible en esas fechas (reserva solapada, mantenimiento o limpieza pendiente).'
      );
    }

    const f = this.form.controls;
    if (f.nombre.invalid || f.apellidos.invalid || f.tipoDocumento.invalid || f.numeroDocumento.invalid) {
      return 'Complete nombre, apellidos y documento del huésped.';
    }
    if (f.email.invalid) return 'Indique un email válido del huésped.';
    if (f.telefono.invalid) return 'Indique el teléfono de contacto del huésped.';
    if (f.autorizaTratamientoDatos.invalid) return 'Registre la autorización de tratamiento de datos (Ley 1581 de 2012).';
    if (!f.fechaEntrada.value || !f.fechaSalida.value) {
      return 'Indique la fecha de entrada y la de salida.';
    }
    if ((this.noches ?? 0) < 1) {
      return 'La fecha de salida debe ser posterior a la de entrada (mínimo 1 noche).';
    }
    if (this.tarifaNoche() == null) {
      return 'No se pudo cargar la tarifa para este tipo de habitación.';
    }
    return null;
  }

  confirmar(): void {
    const habitacion = this.habitacion();
    if (!habitacion || !this.puedeConfirmar) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const fechaEntrada = formatearFechaIso(v.fechaEntrada!);
    const fechaSalida = formatearFechaIso(v.fechaSalida!);
    this.guardando.set(true);

    const seleccionado = this.huespedSeleccionado();
    const documento = (seleccionado?.numeroDocumento ?? v.numeroDocumento ?? '').trim();
    // Un huésped que regresa se reutiliza (mismo documento); si no existe se registra.
    (seleccionado ? of([seleccionado]) : this.huespedService.listar({ busqueda: documento }))
      .pipe(
        map((lista) => lista.find((h) => h.numeroDocumento.toLowerCase() === documento.toLowerCase()) ?? null),
        switchMap((existente) =>
          existente
            ? of(existente)
            : this.huespedService.crear({
                nombre: v.nombre!.trim(),
                apellidos: v.apellidos!.trim(),
                tipoDocumento: v.tipoDocumento!,
                numeroDocumento: documento,
                email: v.email!.trim(),
                telefono: v.telefono!.trim(),
                activo: true,
                autorizaTratamientoDatos: !!v.autorizaTratamientoDatos,
              }),
        ),
        switchMap((huesped) =>
          this.reservaService.crear({
            habitacionId: habitacion.id,
            huespedId: huesped.id,
            fechaEntrada,
            fechaSalida,
            canal: v.canal ?? 'PRESENCIAL',
            observaciones: v.observaciones?.trim() || null,
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.snackBar.open(`Habitación ${habitacion.numero} reservada`, 'OK', { duration: 3000 });
          void this.router.navigate(['/habitaciones']);
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorDialog.mostrarDesdeApi(err);
        },
      });
  }

  private cargarTarifa(tipo: TipoHabitacion): void {
    this.tarifaService.listar().subscribe({
      next: (tarifas) => {
        const tarifa = tarifas.find((t) => t.tipoHabitacion === tipo);
        this.tarifaNoche.set(tarifa?.precioNoche ?? null);
      },
      error: () => this.tarifaNoche.set(null),
    });
  }

  private verificarDisponibilidad(): void {
    const habitacion = this.habitacion();
    const entrada = this.form.controls.fechaEntrada.value;
    const salida = this.form.controls.fechaSalida.value;
    if (!habitacion || !entrada || !salida || (this.noches ?? 0) < 1) {
      this.disponibleEnFechas.set(null);
      this.errorDisponibilidad.set(null);
      return;
    }

    this.verificandoDisponibilidad.set(true);
    this.errorDisponibilidad.set(null);
    const fechaEntrada = formatearFechaIso(entrada);
    const fechaSalida = formatearFechaIso(salida);

    this.reservaService
      .disponibilidadHabitacion(habitacion.id, fechaEntrada, fechaSalida, habitacion.tipoHabitacion)
      .subscribe({
      next: (resultado) => {
        this.disponibleEnFechas.set(resultado.disponible);
        this.tarifaNoche.set(Number(resultado.tarifaNoche));
        this.errorDisponibilidad.set(null);
        this.verificandoDisponibilidad.set(false);
        if (resultado.disponible) {
          this.conflictos.set([]);
          this.sugerencias.set([]);
          this.alternativas.set([]);
        } else {
          this.analizarConflicto(habitacion, fechaEntrada, fechaSalida);
        }
      },
      error: (err) => {
        this.disponibleEnFechas.set(null);
        this.errorDisponibilidad.set(
          err?.error?.detail ?? 'No se pudo comprobar la disponibilidad. Intente de nuevo.',
        );
        this.verificandoDisponibilidad.set(false);
      },
    });
  }

  /**
   * Explica por qué no se puede reservar y propone opciones: tramos libres dentro de las fechas pedidas,
   * la siguiente fecha con las mismas noches libres y otras habitaciones del mismo tipo disponibles.
   */
  private analizarConflicto(habitacion: Habitacion, entrada: string, salida: string): void {
    const noches = calcularNoches(entrada, salida);
    const calcular = (reservas: Reserva[]) => {
      const activas = reservas
        .filter((x) => x.estadoReserva === 'CONFIRMADA' || x.estadoReserva === 'EN_CURSO')
        .sort((a, b) => a.fechaEntrada.localeCompare(b.fechaEntrada));
      const choques = activas.filter((x) => x.fechaEntrada < salida && x.fechaSalida > entrada);
      this.conflictos.set(choques);

      const sug: { entrada: string; salida: string; noches: number; etiqueta: string }[] = [];
      let cursor = entrada;
      for (const x of choques) {
        if (x.fechaEntrada > cursor) {
          const n = calcularNoches(cursor, x.fechaEntrada);
          if (n >= 1) sug.push({ entrada: cursor, salida: x.fechaEntrada, noches: n, etiqueta: 'Parte de las fechas pedidas' });
        }
        if (x.fechaSalida > cursor) cursor = x.fechaSalida;
      }
      if (choques.length && cursor < salida) {
        const n = calcularNoches(cursor, salida);
        if (n >= 1) sug.push({ entrada: cursor, salida, noches: n, etiqueta: 'Parte de las fechas pedidas' });
      }
      let inicio = entrada;
      for (let i = 0; i < 200; i++) {
        const fin = formatearFechaIso(this.sumaDias(this.aFecha(inicio), noches));
        const bloquea = activas.find((x) => x.fechaEntrada < fin && x.fechaSalida > inicio);
        if (!bloquea) {
          if (inicio !== entrada) sug.push({ entrada: inicio, salida: fin, noches, etiqueta: 'Mismas noches, fecha libre más cercana' });
          break;
        }
        inicio = bloquea.fechaSalida > inicio ? bloquea.fechaSalida : formatearFechaIso(this.sumaDias(this.aFecha(inicio), 1));
      }
      this.sugerencias.set(sug);
    };
    if (this.reservasHabitacion) {
      calcular(this.reservasHabitacion);
    } else {
      this.habitacionService.historial(habitacion.id).subscribe({
        next: (rs) => {
          this.reservasHabitacion = rs;
          calcular(rs);
        },
        error: () => this.conflictos.set([]),
      });
    }
    this.reservaService.disponibilidad(entrada, salida, habitacion.tipoHabitacion).subscribe({
      next: (lista) => this.alternativas.set(lista.filter((x) => x.habitacionId !== habitacion.id).slice(0, 4)),
      error: () => this.alternativas.set([]),
    });
  }

  aFecha(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  fechaTexto(iso: string): string {
    return this.aFecha(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private sumaDias(fecha: Date, dias: number): Date {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d;
  }
}
