import { HttpClient, HttpParams } from '@angular/common/http';
import type { Reserva } from '../models/reserva.model';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarEstadoRequest,
  EstadoHabitacion,
  Habitacion,
  HabitacionRequest,
} from '../models/habitacion.model';

@Injectable({ providedIn: 'root' })
export class HabitacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/habitaciones`;

  listar(estado?: EstadoHabitacion): Observable<Habitacion[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<Habitacion[]>(this.baseUrl, { params });
  }

  obtener(id: number): Observable<Habitacion> {
    return this.http.get<Habitacion>(`${this.baseUrl}/${id}`);
  }

  crear(request: HabitacionRequest): Observable<Habitacion> {
    return this.http.post<Habitacion>(this.baseUrl, request);
  }

  actualizar(id: number, request: HabitacionRequest): Observable<Habitacion> {
    return this.http.put<Habitacion>(`${this.baseUrl}/${id}`, request);
  }

  actualizarEstado(id: number, request: ActualizarEstadoRequest): Observable<Habitacion> {
    return this.http.patch<Habitacion>(`${this.baseUrl}/${id}/estado`, request);
  }

  /** URL pública de una foto (se usa directamente en <img>). */
  urlFoto(habitacionId: number, fotoId: number): string {
    return `${this.baseUrl}/${habitacionId}/fotos/${fotoId}`;
  }

  subirFoto(habitacionId: number, archivo: File): Observable<number[]> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<number[]>(`${this.baseUrl}/${habitacionId}/fotos`, form);
  }

  eliminarFoto(habitacionId: number, fotoId: number): Observable<number[]> {
    return this.http.delete<number[]>(`${this.baseUrl}/${habitacionId}/fotos/${fotoId}`);
  }

  historial(habitacionId: number): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.baseUrl}/${habitacionId}/historial`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
