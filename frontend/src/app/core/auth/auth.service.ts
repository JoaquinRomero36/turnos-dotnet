import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginResponse, Usuario } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token   = signal<string | null>(sessionStorage.getItem('auth_token'));
  private _usuario = signal<Usuario | null>(this.loadUsuario());

  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentUser     = computed(() => this._usuario());
  readonly currentToken    = computed(() => this._token());

  // .NET devuelve PascalCase
  readonly isSecretario  = computed(() => this._usuario()?.rol === 'Secretario');
  readonly isOperadora   = computed(() => this._usuario()?.rol === 'Operadora');
  readonly isProfesional = computed(() => this._usuario()?.rol === 'Profesional');

  constructor(private http: HttpClient, private router: Router) {}

   login(username: string, password: string): Observable<LoginResponse> {
     return this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, { username, password })
       .pipe(tap(res => {
         sessionStorage.setItem('auth_token',  res.token);
         sessionStorage.setItem('auth_user',   JSON.stringify(res.usuario));
         this._token.set(res.token);
         this._usuario.set(res.usuario);
       }));
   }

  logout(): void {
    sessionStorage.clear();
    this._token.set(null);
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }

  hasAnyRole(...roles: string[]): boolean { return roles.includes(this._usuario()?.rol ?? ''); }

  private loadUsuario(): Usuario | null {
    const raw = sessionStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  }
}
