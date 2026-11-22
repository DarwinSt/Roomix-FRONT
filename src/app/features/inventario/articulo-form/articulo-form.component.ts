import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InventarioService } from '../../../core/services/inventario.service';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';
import { roomixDialogConfig } from '../../../core/config/dialog.config';
import { ArticuloInventario, CategoriaInventario, UNIDADES_MEDIDA, UnidadMedida } from '../../../core/models/inventario.model';
import { iconoCategoria, iconoProducto } from '../../../core/models/venta.model';
import { moneda } from '../../../core/utils/formato.util';
import { MonedaDirective } from '../../../shared/directivas/moneda.directive';
import { OpcionTarjeta, SelectorOpcionesComponent } from '../../../shared/formularios/selector-opciones.component';
import { StockDialogComponent } from '../stock-dialog/stock-dialog.component';

const ICONO_UNIDAD: Record<UnidadMedida, string> = {
  UNIDAD: 'looks_one', PAR: 'filter_2', JUEGO: 'category', CAJA: 'inventory_2', LITRO: 'water_drop', KILOGRAMO: 'scale',
};

/** Nombre de la unidad en minúscula, en singular o plural según la cantidad («1 par», «12 unidades», «3 litros»). */
export function unidadEnTexto(u: UnidadMedida | null | undefined, cantidad: number): string {
  const base = (UNIDADES_MEDIDA.find((x) => x.value === u)?.label ?? 'Unidad').toLowerCase();
  if (cantidad === 1) return base;
  return /[dr]$/.test(base) ? base + 'es' : base + 's';
}

/**
 * Alta y edición de un artículo del inventario, ordenada por lo que se decide: qué es, cuánto hay, cuánto cuesta y si
 * se vende al huésped. A la derecha, una vista previa de cómo lo verá recepción en la tienda y el resumen de su valor.
 */
@Component({
  selector: 'app-articulo-form',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule,
    MatSlideToggleModule, MonedaDirective, SelectorOpcionesComponent],
  templateUrl: './articulo-form.component.html',
  styleUrl: './articulo-form.component.scss',
})
export class ArticuloFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inventarioService = inject(InventarioService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly dialog = inject(MatDialog);

  readonly moneda = moneda;
  readonly categorias = signal<CategoriaInventario[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly intentoGuardar = signal(false);
  /** Artículo cargado (solo al editar): su stock cambia con movimientos, no escribiendo el número. */
  readonly articulo = signal<ArticuloInventario | null>(null);
  id: number | null = null;
  private version: number | null = null;

  readonly unidades: OpcionTarjeta<UnidadMedida>[] = UNIDADES_MEDIDA.map((u) => ({ ...u, icon: ICONO_UNIDAD[u.value] }));
  readonly opcionesCategoria = computed<OpcionTarjeta<number>[]>(() =>
    this.categorias().filter((c) => c.activo !== false).map((c) => ({ value: c.id, label: c.nombre, icon: iconoCategoria(c.nombre) })));

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    categoriaId: [null as number | null, Validators.required],
    cantidad: [0 as number | null, [Validators.required, Validators.min(0)]],
    cantidadMinima: [null as number | null, Validators.min(0)],
    unidadMedida: ['UNIDAD' as UnidadMedida, Validators.required],
    ubicacion: [''],
    proveedor: ['', Validators.maxLength(150)],
    precioUnitario: [null as number | null, Validators.min(0)],
    seVende: [false],
    precioVenta: [null as number | null, Validators.min(0)],
  });

  /** Valores del formulario como señal (incluye los campos deshabilitados, como la cantidad al editar). */
  private readonly v = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly raw = computed(() => {
    this.v();
    return this.form.getRawValue();
  });

  readonly seVende = computed(() => !!this.raw().seVende);
  readonly cantidad = computed(() => this.articulo()?.cantidad ?? Math.max(0, Number(this.raw().cantidad ?? 0)));
  readonly unidad = computed(() => this.raw().unidadMedida ?? 'UNIDAD');
  readonly textoUnidad = computed(() => unidadEnTexto(this.unidad(), this.cantidad()));
  readonly unidadEnSingular = computed(() => unidadEnTexto(this.unidad(), 1));
  readonly nombreCategoria = computed(() => this.categorias().find((c) => c.id === this.raw().categoriaId)?.nombre ?? '');
  readonly icono = computed(() => iconoProducto(this.raw().nombre ?? '', this.nombreCategoria()));
  readonly costo = computed(() => (this.raw().precioUnitario ? Number(this.raw().precioUnitario) : null));
  readonly precio = computed(() => (this.seVende() && this.raw().precioVenta ? Number(this.raw().precioVenta) : null));
  readonly ganancia = computed(() => {
    const p = this.precio();
    const c = this.costo();
    return p !== null && c !== null ? p - c : null;
  });
  readonly margen = computed(() => {
    const g = this.ganancia();
    const p = this.precio();
    return g !== null && p ? Math.round((g / p) * 100) : null;
  });
  readonly valorInventario = computed(() => {
    const c = this.costo();
    return c !== null ? c * this.cantidad() : null;
  });
  readonly estadoStock = computed<'agotado' | 'bajo' | 'ok'>(() => {
    const minimo = this.raw().cantidadMinima;
    if (this.cantidad() <= 0) return 'agotado';
    return minimo !== null && minimo !== undefined && `${minimo}` !== '' && this.cantidad() <= Number(minimo) ? 'bajo' : 'ok';
  });
  /** Chip del resumen; un artículo nuevo sin cantidad aún no está «agotado», simplemente no tiene existencias. */
  readonly chipEstado = computed(() => {
    switch (this.estadoStock()) {
      case 'ok': return { clase: 'ok', texto: 'Con stock' };
      case 'bajo': return { clase: 'alerta', texto: 'Stock bajo' };
      default: return this.articulo() ? { clase: 'critico', texto: 'Agotado' } : { clase: 'neutro', texto: 'Sin existencias' };
    }
  });

  constructor() {
    // Al apagar la venta se borra el precio; al encenderla el precio pasa a ser obligatorio
    this.form.controls.seVende.valueChanges.subscribe((vende) => {
      const precio = this.form.controls.precioVenta;
      precio.setValidators(vende ? [Validators.required, Validators.min(1)] : [Validators.min(0)]);
      if (!vende) precio.setValue(null);
      precio.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.inventarioService.listarCategorias().subscribe({ next: (c) => this.categorias.set(c) });
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      this.id = Number(idParam);
      this.cargar(this.id);
    }
  }

  private cargar(id: number): void {
    this.loading.set(true);
    this.inventarioService.obtenerArticulo(id).subscribe({
      next: (a) => {
        this.articulo.set(a);
        this.version = a.version;
        this.form.patchValue({
          nombre: a.nombre,
          descripcion: a.descripcion,
          categoriaId: a.categoria.id,
          cantidad: a.cantidad,
          cantidadMinima: a.cantidadMinima,
          unidadMedida: a.unidadMedida,
          ubicacion: a.ubicacion ?? '',
          proveedor: a.proveedor ?? '',
          precioUnitario: a.precioUnitario,
          seVende: a.precioVenta !== null,
          precioVenta: a.precioVenta,
        });
        // El stock de un artículo existente se cambia con movimientos (entrada, salida, ajuste) para dejar historial
        this.form.controls.cantidad.disable();
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorDialog.mostrarDesdeApi(err);
        void this.router.navigate(['/inventario']);
      },
    });
  }

  /** Entrada, salida o ajuste del stock con su motivo (queda en el historial del artículo). */
  moverStock(): void {
    const a = this.articulo();
    if (!a) return;
    this.dialog
      .open(StockDialogComponent, { ...roomixDialogConfig({ width: '520px' }), data: { articulo: a } })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok || !this.id) return;
        // Se relee para tomar la cantidad y la versión nuevas sin perder lo que se estaba editando
        this.inventarioService.obtenerArticulo(this.id).subscribe((nuevo) => {
          this.articulo.set(nuevo);
          this.version = nuevo.version;
          this.form.controls.cantidad.setValue(nuevo.cantidad);
        });
      });
  }

  error(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || this.intentoGuardar());
  }

  guardar(): void {
    this.intentoGuardar.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Revise los campos marcados en rojo', 'OK', { duration: 3000 });
      // Lleva a la primera sección con algo por corregir
      setTimeout(() => document.querySelector('.seccion .ng-invalid, .seccion .texto-error')?.closest('.seccion')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }
    const v = this.form.getRawValue();
    const numero = (x: unknown) => (x === null || x === undefined || x === '' ? null : Number(x));
    const payload = {
      nombre: v.nombre!.trim(),
      descripcion: v.descripcion!.trim(),
      categoriaId: v.categoriaId!,
      cantidad: Number(v.cantidad ?? 0),
      cantidadMinima: numero(v.cantidadMinima),
      unidadMedida: v.unidadMedida!,
      ubicacion: v.ubicacion?.trim() || null,
      proveedor: v.proveedor?.trim() || null,
      precioUnitario: numero(v.precioUnitario),
      precioVenta: v.seVende ? numero(v.precioVenta) : null,
      // Versión con la que se abrió: si alguien vendió o gastó mientras tanto, el servidor avisa en vez de pisar el stock
      version: this.version,
    };
    this.saving.set(true);
    const req$ = this.id ? this.inventarioService.actualizarArticulo(this.id, payload) : this.inventarioService.crearArticulo(payload);
    req$.subscribe({
      next: () => {
        this.snackBar.open(this.id ? 'Artículo actualizado' : 'Artículo creado', 'OK', { duration: 3000 });
        void this.router.navigate(['/inventario']);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorDialog.mostrarDesdeApi(err);
      },
    });
  }
}
