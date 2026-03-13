import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Profesional } from '../core/models/profesional.model';

@Injectable({ providedIn: 'root' })
export class ProfesionalService {
  private base = `${environment.apiUrl}/api/profesionales`;
  constructor(private http: HttpClient) {}
  getProfesionales(): Observable<Profesional[]> {
    return this.http.get<Profesional[]>(this.base);
  }
}
