import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Rol, Usuario, UsuarioRequest } from '../models/auth.model';
import { Dashboard, RegistroAuditoria, ReporteOcupacion } from '../models/dashboard.model';
import { Pagina } from '../models/finanzas.model';
import {
  EstadoSolicitud,
  ServicioCatalogo,
  ServicioCatalogoRequest,
  SolicitudRequest,
  SolicitudServicio,
} from '../models/servicio.model';
import {
  EstadoEvento,
  Evento,
  EventoRequest,
  ParticipanteRequest,
  ReporteEventos,
  Salon,
  SalonRequest,
} from '../models/evento.model';
import { construirParams as params } from './finanzas.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  obtener() {
    return this.http.get<Dashboard>(`${environment.apiUrl}/dashboard`);
  }
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly http = inject(HttpClient);

  ocupacion(desde?: string, hasta?: string) {
    return this.http.get<ReporteOcupacion>(`${environment.apiUrl}/reportes/ocupacion`, { params: params({ desde, hasta }) });
  }
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuarios`;

  listar() {
    return this.http.get<Usuario[]>(this.baseUrl);
  }

  roles() {
    return this.http.get<{ codigo: Rol; nombre: string; descripcion: string }[]>(`${this.baseUrl}/roles`);
  }

  crear(body: UsuarioRequest) {
    return this.http.post<Usuario>(this.baseUrl, body);
  }

  actualizar(id: number, body: UsuarioRequest) {
    return this.http.put<Usuario>(`${this.baseUrl}/${id}`, body);
  }

  cambiarActivo(id: number, valor: boolean) {
    return this.http.patch<Usuario>(`${this.baseUrl}/${id}/activo`, null, { params: params({ valor }) });
  }

  restablecerPassword(id: number) {
    return this.http.post<{ passwordTemporal: string }>(`${this.baseUrl}/${id}/restablecer-password`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);

  buscar(f: { usuario?: string; modulo?: string; accion?: string; desde?: string; hasta?: string; pagina?: number; tamano?: number }) {
    return this.http.get<Pagina<RegistroAuditoria>>(`${environment.apiUrl}/auditoria`, { params: params(f) });
  }

  modulos() {
    return this.http.get<string[]>(`${environment.apiUrl}/auditoria/modulos`);
  }
}

@Injectable({ providedIn: 'root' })
export class ServicioHotelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/servicios`;

  catalogo(soloActivos = false) {
    return this.http.get<ServicioCatalogo[]>(`${this.baseUrl}/catalogo`, { params: params({ soloActivos }) });
  }

  crearServicio(body: ServicioCatalogoRequest) {
    return this.http.post<ServicioCatalogo>(`${this.baseUrl}/catalogo`, body);
  }

  actualizarServicio(id: number, body: ServicioCatalogoRequest) {
    return this.http.put<ServicioCatalogo>(`${this.baseUrl}/catalogo/${id}`, body);
  }

  cambiarActivo(id: number, valor: boolean) {
    return this.http.patch<ServicioCatalogo>(`${this.baseUrl}/catalogo/${id}/activo`, null, { params: params({ valor }) });
  }

  solicitudes(f: { estado?: EstadoSolicitud | ''; reservaId?: number; huespedId?: number; fecha?: string; activas?: boolean }) {
    return this.http.get<SolicitudServicio[]>(`${this.baseUrl}/solicitudes`, { params: params(f) });
  }

  crearSolicitud(body: SolicitudRequest) {
    return this.http.post<SolicitudServicio>(`${this.baseUrl}/solicitudes`, body);
  }

  asignar(id: number, responsableId: number | null, fechaHoraProgramada: string | null) {
    return this.http.patch<SolicitudServicio>(`${this.baseUrl}/solicitudes/${id}/asignar`, { responsableId, fechaHoraProgramada });
  }

  cambiarEstado(id: number, estado: EstadoSolicitud, motivo?: string) {
    return this.http.patch<SolicitudServicio>(`${this.baseUrl}/solicitudes/${id}/estado`, { estado, motivo });
  }
}

@Injectable({ providedIn: 'root' })
export class EventoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/eventos`;

  listar(f: { desde?: string; hasta?: string; estado?: EstadoEvento | '' } = {}) {
    return this.http.get<Evento[]>(this.baseUrl, { params: params(f) });
  }

  obtener(id: number) {
    return this.http.get<Evento>(`${this.baseUrl}/${id}`);
  }

  crear(body: EventoRequest) {
    return this.http.post<Evento>(this.baseUrl, body);
  }

  actualizar(id: number, body: EventoRequest) {
    return this.http.put<Evento>(`${this.baseUrl}/${id}`, body);
  }

  cambiarEstado(id: number, estado: EstadoEvento, motivo?: string) {
    return this.http.patch<Evento>(`${this.baseUrl}/${id}/estado`, { estado, motivo });
  }

  agregarParticipante(id: number, body: ParticipanteRequest) {
    return this.http.post<Evento>(`${this.baseUrl}/${id}/participantes`, body);
  }

  actualizarParticipante(id: number, participanteId: number, cambios: { confirmado?: boolean; asistio?: boolean }) {
    return this.http.patch<Evento>(`${this.baseUrl}/${id}/participantes/${participanteId}`, null, { params: params(cambios) });
  }

  eliminarParticipante(id: number, participanteId: number) {
    return this.http.delete<Evento>(`${this.baseUrl}/${id}/participantes/${participanteId}`);
  }

  reporte(desde?: string, hasta?: string) {
    return this.http.get<ReporteEventos>(`${this.baseUrl}/reporte`, { params: params({ desde, hasta }) });
  }

  salones() {
    return this.http.get<Salon[]>(`${environment.apiUrl}/salones`);
  }

  crearSalon(body: SalonRequest) {
    return this.http.post<Salon>(`${environment.apiUrl}/salones`, body);
  }

  actualizarSalon(id: number, body: SalonRequest) {
    return this.http.put<Salon>(`${environment.apiUrl}/salones/${id}`, body);
  }
}
