import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria } from '../core/models/categoria.model';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private base = `${environment.apiUrl}/api/categorias`;
  constructor(private http: HttpClient) {}
  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.base);
  }
}
