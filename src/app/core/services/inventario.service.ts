import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AjustarStockRequest,
  ArticuloInventario,
  ArticuloInventarioRequest,
  CategoriaInventario,
  CategoriaInventarioRequest,
} from '../models/inventario.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly articulosUrl = `${environment.apiUrl}/inventario`;
  private readonly categoriasUrl = `${environment.apiUrl}/inventario/categorias`;

  listarArticulos(
    categoriaId?: number,
    activo?: boolean,
    stockBajo?: boolean,
  ): Observable<ArticuloInventario[]> {
    let params = new HttpParams();
    if (categoriaId != null) params = params.set('categoriaId', categoriaId);
    if (activo != null) params = params.set('activo', activo);
    if (stockBajo != null) params = params.set('stockBajo', stockBajo);
    return this.http.get<ArticuloInventario[]>(this.articulosUrl, { params });
  }

  obtenerArticulo(id: number): Observable<ArticuloInventario> {
    return this.http.get<ArticuloInventario>(`${this.articulosUrl}/${id}`);
  }

  crearArticulo(request: ArticuloInventarioRequest): Observable<ArticuloInventario> {
    return this.http.post<ArticuloInventario>(this.articulosUrl, request);
  }

  actualizarArticulo(id: number, request: ArticuloInventarioRequest): Observable<ArticuloInventario> {
    return this.http.put<ArticuloInventario>(`${this.articulosUrl}/${id}`, request);
  }

  ajustarStock(id: number, request: AjustarStockRequest): Observable<ArticuloInventario> {
    return this.http.patch<ArticuloInventario>(`${this.articulosUrl}/${id}/stock`, request);
  }

  eliminarArticulo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.articulosUrl}/${id}`);
  }

  listarCategorias(soloActivas = true): Observable<CategoriaInventario[]> {
    const params = new HttpParams().set('soloActivas', soloActivas);
    return this.http.get<CategoriaInventario[]>(this.categoriasUrl, { params });
  }

  obtenerCategoria(id: number): Observable<CategoriaInventario> {
    return this.http.get<CategoriaInventario>(`${this.categoriasUrl}/${id}`);
  }

  crearCategoria(request: CategoriaInventarioRequest): Observable<CategoriaInventario> {
    return this.http.post<CategoriaInventario>(this.categoriasUrl, request);
  }

  actualizarCategoria(id: number, request: CategoriaInventarioRequest): Observable<CategoriaInventario> {
    return this.http.put<CategoriaInventario>(`${this.categoriasUrl}/${id}`, request);
  }

  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.categoriasUrl}/${id}`);
  }
}
