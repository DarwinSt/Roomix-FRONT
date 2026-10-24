import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CategoriaInfo,
  CategoriaFinanciera,
  CuentaReserva,
  EstadoFactura,
  Factura,
  HotelInfo,
  MovimientoFinanciero,
  MovimientoRequest,
  Pagina,
  PagoRequest,
  ResumenFinanciero,
  TipoMovimiento,
} from '../models/finanzas.model';

function params(valores: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(valores)) {
    if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  }
  return p;
}

@Injectable({ providedIn: 'root' })
export class FinanzasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/finanzas`;
  private readonly categorias$ = this.http.get<CategoriaInfo[]>(`${this.baseUrl}/categorias`).pipe(shareReplay(1));

  resumen(desde?: string, hasta?: string) {
    return this.http.get<ResumenFinanciero>(`${this.baseUrl}/resumen`, { params: params({ desde, hasta }) });
  }

  movimientos(f: {
    tipo?: TipoMovimiento | '';
    categoria?: CategoriaFinanciera | '';
    desde?: string;
    hasta?: string;
    incluirAnulados?: boolean;
    texto?: string;
    pagina?: number;
    tamano?: number;
  }) {
    return this.http.get<Pagina<MovimientoFinanciero>>(`${this.baseUrl}/movimientos`, { params: params(f) });
  }

  registrar(body: MovimientoRequest) {
    return this.http.post<MovimientoFinanciero>(`${this.baseUrl}/movimientos`, body);
  }

  anular(id: number, motivo: string) {
    return this.http.patch<MovimientoFinanciero>(`${this.baseUrl}/movimientos/${id}/anular`, { motivo });
  }

  categorias() {
    return this.categorias$;
  }
}

@Injectable({ providedIn: 'root' })
export class FacturaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/facturas`;

  listar(f: { estado?: EstadoFactura | ''; desde?: string; hasta?: string; texto?: string; pagina?: number; tamano?: number }) {
    return this.http.get<Pagina<Factura>>(this.baseUrl, { params: params(f) });
  }

  obtener(id: number) {
    return this.http.get<Factura>(`${this.baseUrl}/${id}`);
  }

  deHuesped(huespedId: number) {
    return this.http.get<Factura[]>(`${this.baseUrl}/huesped/${huespedId}`);
  }

  facturarReserva(reservaId: number) {
    return this.http.post<Factura>(`${this.baseUrl}/reserva/${reservaId}`, {});
  }

  facturarEvento(eventoId: number) {
    return this.http.post<Factura>(`${this.baseUrl}/evento/${eventoId}`, {});
  }

  registrarPago(id: number, body: PagoRequest) {
    return this.http.post<Factura>(`${this.baseUrl}/${id}/pagos`, body);
  }

  anular(id: number, motivo: string) {
    return this.http.patch<Factura>(`${this.baseUrl}/${id}/anular`, { motivo });
  }

  cuentaReserva(reservaId: number) {
    return this.http.get<CuentaReserva>(`${environment.apiUrl}/reservas/${reservaId}/cuenta`);
  }
}

@Injectable({ providedIn: 'root' })
export class HotelService {
  private readonly http = inject(HttpClient);
  private readonly hotel$ = this.http.get<HotelInfo>(`${environment.apiUrl}/configuracion/hotel`).pipe(shareReplay(1));

  datos() {
    return this.hotel$;
  }
}

export { params as construirParams };
