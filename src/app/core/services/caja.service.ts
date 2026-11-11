import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  CerrarTurnoRequest,
  DetalleTurno,
  EstadoCaja,
  MovimientoCajaRequest,
  TipoMovimientoCaja,
  TurnoCaja,
} from '../models/caja.model';
import { MovimientoFinanciero, Pagina } from '../models/finanzas.model';

/** Caja de la recepción por turnos (apertura, movimientos, retiros y aportes, arqueo y cierre). */
@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/caja`;

  estado() {
    return this.http.get<EstadoCaja>(`${this.baseUrl}/estado`);
  }

  abrir(baseInicial: number, observacion: string | null) {
    return this.http.post<TurnoCaja>(`${this.baseUrl}/abrir`, { baseInicial, observacion });
  }

  registrarMovimiento(body: MovimientoCajaRequest) {
    return this.http.post<MovimientoFinanciero>(`${this.baseUrl}/movimientos`, body);
  }

  retiroAporte(tipo: TipoMovimientoCaja, valor: number, motivo: string) {
    return this.http.post<TurnoCaja>(`${this.baseUrl}/retiros-aportes`, { tipo, valor, motivo });
  }

  cerrar(body: CerrarTurnoRequest) {
    return this.http.post<TurnoCaja>(`${this.baseUrl}/cerrar`, body);
  }

  turnos(f: { desde?: string; hasta?: string; cajero?: string; pagina?: number; tamano?: number }) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(f)) {
      if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    }
    return this.http.get<Pagina<TurnoCaja>>(`${this.baseUrl}/turnos`, { params: p });
  }

  detalle(id: number) {
    return this.http.get<DetalleTurno>(`${this.baseUrl}/turnos/${id}`);
  }
}
