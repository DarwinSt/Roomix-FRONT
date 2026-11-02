import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AbonoRequest,
  Abono,
  ActualizarReservaRequest,
  CanalReserva,
  CotizacionReserva,
  CrearReservaRequest,
  PoliticaReserva,
  Promocion,
  PromocionAplicable,
  PromocionRequest,
  ResumenAbonos,
  HabitacionDisponibilidadCheck,
  HabitacionDisponible,
  Reserva,
} from '../models/reserva.model';
import type { EstadoReserva, Habitacion, TipoHabitacion } from '../models/habitacion.model';
import type { Factura } from '../models/finanzas.model';

export interface CheckOutResponse {
  habitacion: Habitacion;
  reserva: Reserva;
  factura: Factura | null;
}

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reservas`;

  listar(filtros?: {
    estado?: EstadoReserva;
    huespedId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.huespedId != null) params = params.set('huespedId', filtros.huespedId);
    if (filtros?.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
    return this.http.get<Reserva[]>(this.baseUrl, { params });
  }

  obtener(id: number) {
    return this.http.get<Reserva>(`${this.baseUrl}/${id}`);
  }

  disponibilidad(fechaEntrada: string, fechaSalida: string, tipoHabitacion?: TipoHabitacion) {
    let params = new HttpParams()
      .set('fechaEntrada', fechaEntrada)
      .set('fechaSalida', fechaSalida);
    if (tipoHabitacion) params = params.set('tipoHabitacion', tipoHabitacion);
    return this.http.get<HabitacionDisponible[]>(`${this.baseUrl}/disponibilidad`, { params });
  }

  disponibilidadHabitacion(
    habitacionId: number,
    fechaEntrada: string,
    fechaSalida: string,
    tipoHabitacion?: TipoHabitacion,
  ): Observable<HabitacionDisponibilidadCheck> {
    return this.disponibilidad(fechaEntrada, fechaSalida, tipoHabitacion).pipe(
      map((lista) => {
        const match = lista.find((h) => h.habitacionId === habitacionId);
        return {
          habitacionId,
          disponible: !!match,
          tarifaNoche: Number(match?.tarifaNoche ?? 0),
          cantidadNoches: match?.cantidadNoches ?? 0,
          totalEstimado: Number(match?.totalEstimado ?? 0),
        };
      }),
    );
  }

  crear(body: CrearReservaRequest) {
    return this.http.post<Reserva>(this.baseUrl, body);
  }

  actualizar(id: number, body: ActualizarReservaRequest) {
    return this.http.put<Reserva>(`${this.baseUrl}/${id}`, body);
  }

  cancelar(id: number, motivo: string) {
    return this.http.patch<Reserva>(`${this.baseUrl}/${id}/cancelar`, { motivo });
  }

  checkIn(id: number) {
    return this.http.patch<Habitacion>(`${this.baseUrl}/${id}/check-in`, {});
  }

  checkOut(id: number) {
    return this.http.patch<CheckOutResponse>(`${this.baseUrl}/${id}/check-out`, {});
  }

  historialHuesped(huespedId: number) {
    return this.http.get<Reserva[]>(`${environment.apiUrl}/huespedes/${huespedId}/reservas`);
  }

  /** Subtotal, descuento, IVA y abono mínimo con la misma regla que aplica el backend al confirmar. */
  cotizacion(q: { habitacionId: number; fechaEntrada: string; fechaSalida: string; promocionId?: number | null; canal?: CanalReserva | null; huespedId?: number | null }) {
    let params = new HttpParams().set('habitacionId', q.habitacionId).set('fechaEntrada', q.fechaEntrada).set('fechaSalida', q.fechaSalida);
    if (q.promocionId != null) params = params.set('promocionId', q.promocionId);
    if (q.canal) params = params.set('canal', q.canal);
    if (q.huespedId != null) params = params.set('huespedId', q.huespedId);
    return this.http.get<CotizacionReserva>(`${this.baseUrl}/cotizacion`, { params });
  }

  abonos(reservaId: number) {
    return this.http.get<ResumenAbonos>(`${this.baseUrl}/${reservaId}/abonos`);
  }

  registrarAbono(reservaId: number, body: AbonoRequest) {
    return this.http.post<Abono>(`${this.baseUrl}/${reservaId}/abonos`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class PromocionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/promociones`;

  listar() {
    return this.http.get<Promocion[]>(this.baseUrl);
  }

  aplicables(habitacionId: number, fechaEntrada: string, fechaSalida: string, canal?: CanalReserva | null) {
    let params = new HttpParams().set('habitacionId', habitacionId).set('fechaEntrada', fechaEntrada).set('fechaSalida', fechaSalida);
    if (canal) params = params.set('canal', canal);
    return this.http.get<PromocionAplicable[]>(`${this.baseUrl}/aplicables`, { params });
  }

  crear(body: PromocionRequest) {
    return this.http.post<Promocion>(this.baseUrl, body);
  }

  actualizar(id: number, body: PromocionRequest) {
    return this.http.put<Promocion>(`${this.baseUrl}/${id}`, body);
  }

  cambiarActiva(id: number, valor: boolean) {
    return this.http.patch<Promocion>(`${this.baseUrl}/${id}/activa`, {}, { params: new HttpParams().set('valor', valor) });
  }

  politicas() {
    return this.http.get<PoliticaReserva>(`${environment.apiUrl}/politicas-reserva`);
  }

  actualizarPoliticas(body: { abonoMinimoPct: number; penalidadCancelacionPct: number }) {
    return this.http.put<PoliticaReserva>(`${environment.apiUrl}/politicas-reserva`, body);
  }
}
