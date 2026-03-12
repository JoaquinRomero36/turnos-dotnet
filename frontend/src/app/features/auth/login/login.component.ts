import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">🏥</div>
          <h1>Centro de Salud</h1>
          <p>Sistema de Gestión de Turnos</p>
        </div>

        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">Usuario</label>
            <input
              id="username"
              type="text"
              [(ngModel)]="username"
              name="username"
              placeholder="Ingrese su usuario"
              required
              autocomplete="username"
              [class.error]="error()"
            />
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              name="password"
              placeholder="Ingrese su contraseña"
              required
              autocomplete="current-password"
              [class.error]="error()"
            />
            <button type="button" class="toggle-pass" (click)="togglePassword()">
              {{ showPassword() ? '🙈' : '👁️' }}
            </button>
          </div>

          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }

          <button type="submit" class="btn-login" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner"></span> Ingresando...
            } @else {
              Ingresar
            }
          </button>
        </form>

        <div class="login-footer">
          <small>Uso interno exclusivo del personal del centro</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e3a5f 0%, #2e75b6 100%);
      font-family: 'Segoe UI', sans-serif;
    }
    .login-card {
      background: white;
      border-radius: 12px;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .logo { font-size: 3rem; margin-bottom: 0.5rem; }
    .login-header h1 { color: #1e3a5f; font-size: 1.5rem; margin: 0; }
    .login-header p { color: #666; font-size: 0.9rem; margin: 0.25rem 0 0; }
    .form-group { margin-bottom: 1.25rem; position: relative; }
    label { display: block; font-size: 0.85rem; font-weight: 600; color: #444; margin-bottom: 0.4rem; }
    input {
      width: 100%; padding: 0.75rem 1rem; border: 2px solid #e0e0e0;
      border-radius: 8px; font-size: 1rem; transition: border-color 0.2s;
      box-sizing: border-box;
    }
    input:focus { outline: none; border-color: #2e75b6; }
    input.error { border-color: #e53935; }
    .toggle-pass {
      position: absolute; right: 0.75rem; bottom: 0.75rem;
      background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0;
    }
    .error-msg {
      background: #fdecea; color: #c62828; border-radius: 6px;
      padding: 0.6rem 0.75rem; font-size: 0.85rem; margin-bottom: 1rem;
    }
    .btn-login {
      width: 100%; padding: 0.85rem; background: #2e75b6; color: white;
      border: none; border-radius: 8px; font-size: 1rem; font-weight: 600;
      cursor: pointer; transition: background 0.2s; display: flex;
      align-items: center; justify-content: center; gap: 0.5rem;
    }
    .btn-login:hover:not(:disabled) { background: #1e3a5f; }
    .btn-login:disabled { opacity: 0.7; cursor: not-allowed; }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .login-footer { text-align: center; margin-top: 1.5rem; color: #999; }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword() { this.showPassword.update(v => !v); }

  onLogin() {
    if (!this.username || !this.password) {
      this.error.set('Complete todos los campos');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.authService.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err.error?.mensaje || 'Usuario o contraseña incorrectos');
      }
    });
  }
}
