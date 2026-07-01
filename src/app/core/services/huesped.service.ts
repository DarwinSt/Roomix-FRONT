import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Huesped, HuespedRequest } from '../models/huesped.model';

@Injectable({ providedIn: 'root' })
export class HuespedService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/huespedes`;

  listar(filtros?: { activo?: boolean; busqueda?: string }) {
    let params = new HttpParams();
    if (filtros?.activo != null) params = params.set('activo', filtros.activo);
    if (filtros?.busqueda?.trim()) params = params.set('busqueda', filtros.busqueda.trim());
    return this.http.get<Huesped[]>(this.baseUrl, { params });
  }

  obtener(id: number) {
    return this.http.get<Huesped>(`${this.baseUrl}/${id}`);
  }

  crear(body: HuespedRequest) {
    return this.http.post<Huesped>(this.baseUrl, body);
  }

  actualizar(id: number, body: HuespedRequest) {
    return this.http.put<Huesped>(`${this.baseUrl}/${id}`, body);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
