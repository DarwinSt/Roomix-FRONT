import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { TipoHabitacion } from '../models/habitacion.model';
import { TarifaTipo } from '../models/reserva.model';

@Injectable({ providedIn: 'root' })
export class TarifaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tarifas`;

  listar() {
    return this.http.get<TarifaTipo[]>(this.baseUrl);
  }

  actualizar(tipo: TipoHabitacion, precioNoche: number) {
    return this.http.put<TarifaTipo>(`${this.baseUrl}/${tipo}`, { precioNoche });
  }
}
