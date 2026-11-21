import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type TipoChecklist =
  | 'LIMPIEZA_POST_CHECKOUT' | 'LIMPIEZA_HUESPED_AUSENTE' | 'LIMPIEZA_URGENCIA'
  | 'MANTENIMIENTO_HABITACION' | 'MANTENIMIENTO_ZONA_COMUN' | 'SERVICIO_CUARTO' | 'OTRO_HABITACION' | 'OTRO_ZONA_COMUN';

/** Acciones (tareas) que se hacen en cada tipo de servicio de aseo o mantenimiento. */
export interface Checklist {
  tipo: TipoChecklist;
  grupo: string;
  nombre: string;
  descripcion: string;
  tareas: string[];
  personalizada: boolean;
  predeterminadas: string[];
}

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/incidencias/checklists`;

  listar() {
    return this.http.get<Checklist[]>(this.url);
  }

  guardar(tipo: TipoChecklist, tareas: string[]) {
    return this.http.put<Checklist>(`${this.url}/${tipo}`, { tareas });
  }

  restaurar(tipo: TipoChecklist) {
    return this.http.delete<Checklist>(`${this.url}/${tipo}`);
  }
}
