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
          <div class="logo-icon">
            <!-- Logo de la escuela -->
            <img src="assets/LogoInicio.jpeg" alt="Logo Escuela" class="login-logo">
          </div>
          <h1>Centro de Salud</h1>
          <p>Sistema de Gestión de Turnos</p>
        </div>

        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">Usuario</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
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
                <svg *ngIf="!showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg *ngIf="showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
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
      background: linear-gradient(135deg, var(--color-primary) 0%, #0f172a 100%);
      font-family: var(--font-sans, 'Segoe UI', sans-serif);
      position: relative;
      overflow: hidden;
    }
    
    /* Background subtle pattern */
    .login-page::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0);
      background-size: 40px 40px;
    }

    .login-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 3rem 2.5rem;
      width: 100%;
      max-width: 420px;
      box-shadow: var(--shadow-lg);
      position: relative;
      z-index: 1;
      animation: slideUp 0.5s ease-out;
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .login-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    
    .logo-icon {
      color: var(--color-accent);
      margin-bottom: 1rem;
      display: inline-block;
    }
    .login-logo {
      width: 160px;
      height: 160px;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .login-header h1 { 
      color: var(--color-primary); 
      font-size: 1.75rem; 
      margin: 0; 
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .login-header p { 
      color: var(--color-text-muted); 
      font-size: 0.95rem; 
      margin: 0.5rem 0 0; 
    }

    .form-group { 
      margin-bottom: 1.5rem; 
      position: relative; 
    }

    label { 
      display: block; 
      font-size: 0.9rem; 
      font-weight: 600; 
      color: var(--color-text); 
      margin-bottom: 0.5rem; 
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 1rem;
      width: 18px;
      height: 18px;
      color: var(--color-text-muted);
      pointer-events: none;
    }

    input {
      width: 100%; 
      padding: 0.85rem 1rem 0.85rem 2.8rem; 
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md); 
      font-size: 1rem; 
      transition: all 0.2s;
      box-sizing: border-box;
      background: var(--color-surface);
      color: var(--color-text);
    }

    input:focus { 
      outline: none; 
      border-color: var(--color-accent); 
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    
    input.error { 
      border-color: var(--color-danger); 
      background-color: #fef2f2;
    }

    .toggle-pass {
      position: absolute; 
      right: 1rem; 
      background: none; 
      border: none; 
      cursor: pointer; 
      padding: 0.25rem;
      color: var(--color-text-muted);
      transition: color 0.2s;
    }
    
    .toggle-pass:hover { color: var(--color-primary); }
    
    .toggle-pass svg { width: 20px; height: 20px; }

    .error-msg {
      background: #fef2f2; 
      color: #991b1b; 
      border: 1px solid #fecaca;
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem; 
      font-size: 0.9rem; 
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-login {
      width: 100%; 
      padding: 0.9rem; 
      background: var(--color-accent); 
      color: white;
      border: none; 
      border-radius: var(--radius-md); 
      font-size: 1rem; 
      font-weight: 600;
      cursor: pointer; 
      transition: all 0.2s; 
      display: flex;
      align-items: center; 
      justify-content: center; 
      gap: 0.5rem;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }
    
    .btn-login:hover:not(:disabled) { 
      background: var(--color-accent-dark); 
      transform: translateY(-1px);
    }
    
    .btn-login:disabled { 
      opacity: 0.7; 
      cursor: not-allowed; 
      transform: none;
    }

    .spinner {
      width: 18px; 
      height: 18px; 
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; 
      border-radius: 50%; 
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }

    .login-footer { 
      text-align: center; 
      margin-top: 2rem; 
      color: var(--color-text-muted); 
      font-size: 0.85rem;
    }
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
