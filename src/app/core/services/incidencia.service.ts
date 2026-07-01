import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ActualizarTareaIncidenciaRequest,
  AsignarIncidenciaRequest,
  CrearIncidenciaRequest,
  EstadoIncidencia,
  Incidencia,
  Personal,
} from '../models/incidencia.model';

@Injectable({ providedIn: 'root' })
export class IncidenciaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/incidencias`;
  private readonly personalUrl = `${environment.apiUrl}/personal`;

  listar(filtros?: {
    estado?: EstadoIncidencia;
    habitacionId?: number;
    personalId?: number;
    activas?: boolean;
  }) {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.habitacionId != null) params = params.set('habitacionId', filtros.habitacionId);
    if (filtros?.personalId != null) params = params.set('personalId', filtros.personalId);
    if (filtros?.activas != null) params = params.set('activas', filtros.activas);
    return this.http.get<Incidencia[]>(this.baseUrl, { params });
  }

  crear(body: CrearIncidenciaRequest) {
    return this.http.post<Incidencia>(this.baseUrl, body);
  }

  activasPorHabitacion(habitacionId: number) {
    return this.http.get<Incidencia[]>(`${this.baseUrl}/habitacion/${habitacionId}/activas`);
  }

  obtener(id: number) {
    return this.http.get<Incidencia>(`${this.baseUrl}/${id}`);
  }

  asignar(id: number, body: AsignarIncidenciaRequest) {
    return this.http.patch<Incidencia>(`${this.baseUrl}/${id}/asignar`, body);
  }

  iniciar(id: number) {
    return this.http.patch<Incidencia>(`${this.baseUrl}/${id}/iniciar`, {});
  }

  actualizarTarea(id: number, tareaId: number, body: ActualizarTareaIncidenciaRequest) {
    return this.http.patch<Incidencia>(`${this.baseUrl}/${id}/tareas/${tareaId}`, body);
  }

  finalizar(id: number) {
    return this.http.patch<Incidencia>(`${this.baseUrl}/${id}/finalizar`, {});
  }

  cancelar(id: number) {
    return this.http.patch<Incidencia>(`${this.baseUrl}/${id}/cancelar`, {});
  }

  listarPersonal(activo = true) {
    const params = new HttpParams().set('activo', activo);
    return this.http.get<Personal[]>(this.personalUrl, { params });
  }
}
