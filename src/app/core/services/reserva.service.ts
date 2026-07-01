import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CrearReservaRequest,
  HabitacionDisponibilidadCheck,
  HabitacionDisponible,
  Reserva,
} from '../models/reserva.model';
import type { EstadoReserva, TipoHabitacion } from '../models/habitacion.model';

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

  historialHuesped(huespedId: number) {
    return this.http.get<Reserva[]>(`${environment.apiUrl}/huespedes/${huespedId}/reservas`);
  }
}
