import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EstadiaActiva, ProductoVenta, Venta, VentaRequest } from '../models/venta.model';

/** Venta de productos del inventario: de contado (caja) o cargada a la habitación. */
@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/ventas`;

  productos() {
    return this.http.get<ProductoVenta[]>(`${this.url}/productos`);
  }

  estadias() {
    return this.http.get<EstadiaActiva[]>(`${this.url}/estadias`);
  }

  listar(filtro: { reservaId?: number; fecha?: string }) {
    let params = new HttpParams();
    if (filtro.reservaId) params = params.set('reservaId', filtro.reservaId);
    if (filtro.fecha) params = params.set('fecha', filtro.fecha);
    return this.http.get<Venta[]>(this.url, { params });
  }

  registrar(body: VentaRequest) {
    return this.http.post<Venta>(this.url, body);
  }

  anular(id: number, motivo: string) {
    return this.http.patch<Venta>(`${this.url}/${id}/anular`, { motivo });
  }
}
