import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <span class="logo-icon">🏥</span>
          <div>
            <div class="logo-title">Centro Salud</div>
            <div class="logo-sub">Turnos</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/calendario" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📅</span>
            <span>Calendario</span>
          </a>
          @if (isSecretario()) {
            <a routerLink="/profesionales" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">👨‍⚕️</span>
              <span>Profesionales</span>
            </a>
            <a routerLink="/estadisticas" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">📈</span>
              <span>Estadísticas</span>
            </a>
          }
        </nav>

        <div class="sidebar-user">
          <div class="user-avatar">{{ userInitials() }}</div>
          <div class="user-info">
            <div class="user-name">{{ userName() }}</div>
            <div class="user-role">{{ userRolLabel() }}</div>
          </div>
          <button class="btn-logout" (click)="logout()" title="Cerrar sesión">⬅️</button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main-content">
        <ng-content />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
      font-family: 'Segoe UI', sans-serif;
      background: #f0f4f8;
    }
    .sidebar {
      width: 240px;
      min-height: 100vh;
      background: #1e3a5f;
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0; top: 0; bottom: 0;
      z-index: 100;
    }
    .sidebar-logo {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 1.5rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .logo-icon { font-size: 2rem; }
    .logo-title { color: white; font-weight: 700; font-size: 1rem; }
    .logo-sub { color: #90caf9; font-size: 0.75rem; }
    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .nav-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; border-radius: 8px; color: #b0c4de;
      text-decoration: none; font-size: 0.9rem; transition: all 0.2s;
    }
    .nav-item:hover { background: rgba(255,255,255,0.1); color: white; }
    .nav-item.active { background: #2e75b6; color: white; font-weight: 600; }
    .nav-icon { font-size: 1.1rem; }
    .sidebar-user {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .user-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: #2e75b6; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
    }
    .user-info { flex: 1; min-width: 0; }
    .user-name { color: white; font-size: 0.85rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-role { color: #90caf9; font-size: 0.72rem; }
    .btn-logout {
      background: none; border: none; cursor: pointer; font-size: 1rem;
      padding: 0.25rem; opacity: 0.7; transition: opacity 0.2s;
    }
    .btn-logout:hover { opacity: 1; }
    .main-content {
      margin-left: 240px;
      flex: 1;
      padding: 2rem;
      min-height: 100vh;
    }
  `]
})
export class LayoutComponent {
  constructor(private authService: AuthService, private router: Router) {}

  isSecretario = this.authService.isSecretario;
  userName = computed(() => {
    const u = this.authService.currentUser();
    return u ? `${u.nombre} ${u.apellido}` : '';
  });
  userInitials = computed(() => {
    const u = this.authService.currentUser();
    return u ? `${u.nombre[0]}${u.apellido[0]}`.toUpperCase() : '?';
  });
  userRolLabel = computed(() => {
    const roles: Record<string, string> = {
      OPERADORA: 'Operadora',
      PROFESIONAL: 'Profesional',
      SECRETARIO: 'Secretario/a'
    };
    return roles[this.authService.currentUser()?.rol ?? ''] ?? '';
  });

  logout() { this.authService.logout(); }
}
