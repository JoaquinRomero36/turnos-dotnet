import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Turno, CrearTurnoRequest, Disponibilidad,
  Profesional, CrearProfesionalRequest,
  Categoria, Estadisticas
} from '../models/models';
import { environment } from '../../../environments/environment';

// ─── TurnoService ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class TurnoService {
  private base = `${environment.apiUrl}/api/turnos`;

  constructor(private http: HttpClient) {}

  getCalendario(fechaInicio: string, fechaFin: string, categoriaId?: number): Observable<Turno[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    if (categoriaId) params = params.set('categoriaId', categoriaId);
    return this.http.get<Turno[]>(`${this.base}/calendario`, { params });
  }

  getById(id: number): Observable<Turno> {
    return this.http.get<Turno>(`${this.base}/${id}`);
  }

  crear(request: CrearTurnoRequest): Observable<Turno> {
    return this.http.post<Turno>(this.base, request);
  }

  cancelar(id: number): Observable<Turno> {
    return this.http.patch<Turno>(`${this.base}/${id}/cancelar`, {});
  }

  getDisponibles(fecha: string, categoriaId: number): Observable<Disponibilidad> {
    const params = new HttpParams()
      .set('fecha', fecha)
      .set('categoriaId', categoriaId);
    return this.http.get<Disponibilidad>(`${this.base}/disponibles`, { params });
  }
}

  // ─── ProfesionalService ──────────────────────────────────────
  @Injectable({ providedIn: 'root' })
  export class ProfesionalService {
    private base = `${environment.apiUrl}/api/profesionales`;

    constructor(private http: HttpClient) {}

    getAll(categoriaId?: number): Observable<Profesional[]> {
      let params = new HttpParams();
      if (categoriaId) params = params.set('categoriaId', categoriaId);
      return this.http.get<Profesional[]>(this.base, { params });
    }

    getById(id: number): Observable<Profesional> {
      return this.http.get<Profesional>(`${this.base}/${id}`);
    }

    crear(req: CrearProfesionalRequest): Observable<Profesional> {
      return this.http.post<Profesional>(this.base, req);
    }

    actualizar(id: number, req: CrearProfesionalRequest): Observable<Profesional> {
      return this.http.put<Profesional>(`${this.base}/${id}`, req);
    }

    desactivar(id: number): Observable<void> {
      return this.http.delete<void>(`${this.base}/${id}`);
    }
  }

  // ─── CategoriaService ────────────────────────────────────────
  @Injectable({ providedIn: 'root' })
  export class CategoriaService {
    private base = `${environment.apiUrl}/api/categorias`;

    constructor(private http: HttpClient) {}

    getAll(): Observable<Categoria[]> {
      return this.http.get<Categoria[]>(this.base);
    }
  }

// ─── EstadisticaService ──────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class EstadisticaService {
  private base = `${environment.apiUrl}/api/estadisticas`;

  constructor(private http: HttpClient) {}

  getResumen(desde?: string, hasta?: string): Observable<Estadisticas> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<Estadisticas>(`${this.base}/resumen`, { params });
  }
}
